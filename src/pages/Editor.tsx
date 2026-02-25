import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Save, Eye, ChevronRight, Sparkles, Bot, X, Printer,
    FileText, Share2, Download, Mail, Link as LinkIcon, FileDown,
    Info
} from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { useState, useEffect, useRef } from 'react';
import RichTextEditor from '../components/RichTextEditor';
import TableEditor from '../components/TableEditor';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { renderAsync } from 'docx-preview';
import { DOC_STRUCTURES } from '../constants/docs';
import { useCallback } from 'react';

// Removed local DOC_STRUCTURES definition in favor of import



export default function Editor() {
    const { projectId, templateId } = useParams();
    const navigate = useNavigate();
    const { projects, saveRequirementDoc } = useProjects();
    const project = projects.find(p => p.id === projectId);

    // Determines if we are editing an existing doc (templateId is a doc ID) or creating new (templateId is a template type)
    const existingDoc = project?.requirementDocs.find(d => d.id === templateId);
    const isNewDoc = !existingDoc;

    const docType = existingDoc ? existingDoc.type : (templateId || 'BRS');
    const structure = DOC_STRUCTURES[docType] || DOC_STRUCTURES['BRS'];

    // State for section content, now an array of blocks per section index
    const [sectionContent, setSectionContent] = useState<Record<number, any[]>>({});
    const [docTitle, setDocTitle] = useState(existingDoc?.title || 'Untitled Document');
    const [showPreview, setShowPreview] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [showHints, setShowHints] = useState(true);
    const [email, setEmail] = useState('');
    const previewContainerRef = useRef<HTMLDivElement>(null);

    // Initial content load
    useEffect(() => {
        if (existingDoc) {
            // Migrate legacy flat string content to block array structure
            const migratedState: Record<number, any[]> = {};
            Object.entries(existingDoc.content).forEach(([idx, val]) => {
                if (typeof val === 'string') {
                    migratedState[Number(idx)] = [{ type: 'text', data: val }];
                } else {
                    migratedState[Number(idx)] = val;
                }
            });
            setSectionContent(migratedState);
            setDocTitle(existingDoc.title);
        } else {
            const initial: Record<number, any[]> = {};
            structure.forEach((item, idx) => {
                initial[idx] = typeof item === 'string' ? [] : (item.content ? JSON.parse(JSON.stringify(item.content)) : []);
            });
            setSectionContent(initial);
        }
    }, [existingDoc, structure]);

    const handleContentChange = (sectionIdx: number, blockIdx: number, value: any) => {
        setSectionContent(prev => {
            const newSection = [...(prev[sectionIdx] || [])];
            const existingBlock = newSection[blockIdx] || { type: 'text' };
            newSection[blockIdx] = { ...existingBlock, data: value };
            return { ...prev, [sectionIdx]: newSection };
        });
    };

    const handleSave = () => {
        if (!projectId) return;

        const newDocId = existingDoc ? existingDoc.id : `req-${Date.now()}`;
        const newDoc = {
            id: newDocId,
            title: docTitle,
            type: docType,
            content: sectionContent,
            lastModified: new Date().toISOString(),
            status: 'draft' as const
        };

        saveRequirementDoc(projectId, newDoc);

        if (isNewDoc) {
            // Navigate to the new doc URL to avoid creating duplicates on subsequent saves
            navigate(`/editor/${projectId}/${newDocId}`, { replace: true });
        }
    };

    const generateDocumentBlob = useCallback(async () => {
        if (docType !== 'URS') {
            alert('Only URS export is currently implemented with a template.');
            return null;
        }

        try {
            // Load the template
            const response = await fetch('/templates/URS.docx');
            if (!response.ok) throw new Error('Failed to load template');
            const data = await response.arrayBuffer();
            const zip = new PizZip(data);

            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: function () {
                    return "";
                }
            });

            // Enhanced HTML to plaintext fallback formatter for Docxtemplater (MVP)
            const cleanContent = (html: string) => {
                let text = html || "";

                // Replace block elements with line breaks to preserve spacing
                text = text.replace(/<(p|div|h[1-6])[^>]*>/gi, '\n');
                text = text.replace(/<\/(p|div|h[1-6])>/gi, '\n');

                // Replace explicit line breaks
                text = text.replace(/<br\s*\/?>/gi, '\n');

                // Handle lists (turn <li> into bullet points)
                text = text.replace(/<li[^>]*>/gi, '• ');
                text = text.replace(/<\/li>/gi, '\n');

                // Apply Markdown-style formatting to preserve intent of bold/italic
                text = text.replace(/<(b|strong)[^>]*>/gi, '**');
                text = text.replace(/<\/(b|strong)>/gi, '**');
                text = text.replace(/<(i|em)[^>]*>/gi, '_');
                text = text.replace(/<\/(i|em)>/gi, '_');

                // Let the browser handle standard HTML entity decoding (like &amp; &lt;)
                const tmp = document.createElement("DIV");
                tmp.innerHTML = text;

                // Retrieve the decoded text
                let result = tmp.textContent || tmp.innerText || "";

                // Clean up excessive newlines (max 2 consecutive)
                result = result.replace(/\n{3,}/g, '\n\n').trim();

                return result;
            };

            const dataMap: Record<string, string> = {
                project_name: project?.name || 'Untitled Project',
                doc_title: docTitle,
                doc_type: docType,
                date: new Date().toLocaleDateString(),
            };

            structure.forEach((item, idx) => {
                const key = typeof item === 'string' ? `section_${idx}` : `section_${idx}`;

                const blocks = sectionContent[idx] || [];

                // Aggregate text
                const textBlocks = blocks.filter(b => b.type === 'text');
                dataMap[key] = textBlocks.map(b => cleanContent(b.data)).join('\n\n');

                // Feed tables dynamically into docxtemplater arrays
                const tableBlocks = blocks.filter(b => b.type === 'table');
                tableBlocks.forEach((tb, tIdx) => {
                    // For MVP, expose the very first table in a section as `table_X_0` for the template to loop
                    const tableKey = `table_${idx}_${tIdx}`;
                    const tableArray: any[] = [];

                    // Build array of objects mapping column labels to cell values
                    // E.g. { "FR ID": "PM-1.1", "Features": "The system..." }
                    if (tb.data) {
                        tb.data.forEach((row: string[]) => {
                            const rowObj: Record<string, string> = {};
                            if (tb.columns) {
                                tb.columns.forEach((colName: string, cIdx: number) => {
                                    // Sanitize colName for docxtemplater variables (alphanumeric+underscore)
                                    let cleanColName = colName.replace(/[^a-zA-Z0-9_]/g, '');
                                    // Prevent empty keys
                                    if (!cleanColName) cleanColName = `col_${cIdx}`;
                                    rowObj[cleanColName] = row[cIdx] || '';
                                });
                            }
                            tableArray.push(rowObj);
                        });
                    }

                    dataMap[tableKey] = tableArray as any;
                });
            });

            doc.render(dataMap);

            return doc.getZip().generate({
                type: "blob",
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
        } catch (error) {
            console.error('Error generating document:', error);
            alert('Failed to generate document. Please check the console for details.');
            return null;
        }
    }, [docType, project?.name, docTitle, structure, sectionContent]);

    const handleDownload = async () => {
        const blob = await generateDocumentBlob();
        if (blob) {
            saveAs(blob, `${docTitle}.docx`);
        }
    };

    // Unified render function
    const renderPreviewToElement = useCallback(async (element: HTMLDivElement) => {
        element.innerHTML = '<div class="flex items-center justify-center h-40 text-slate-400">Loading Preview...</div>';
        const blob = await generateDocumentBlob();
        if (blob) {
            try {
                // Clear loading text
                element.innerHTML = '';

                await renderAsync(blob, element, undefined, {
                    inWrapper: false, // We provide our own wrapper
                    ignoreWidth: false,
                    experimental: true,
                    breakPages: true,
                    useBase64URL: true,
                    ignoreLastRenderedPageBreak: true,
                });

                // Hack to "ignore" headers in preview - inject CSS to hide common header structures from docx-preview
                if (!element.querySelector('#preview-style')) {
                    const style = document.createElement('style');
                    style.id = 'preview-style';
                    style.innerHTML = `
                        .docx-wrapper section > header { display: none !important; } 
                        .docx-wrapper .header-content { display: none !important; }
                        /* Ensure pages look like pages */
                        .docx-wrapper { padding: 0 !important; background: transparent !important; }
                        .docx-wrapper > section.docx { 
                            box-shadow: none !important; 
                            margin-bottom: 0 !important; 
                            background: white !important;
                            min-height: auto !important;
                        }
                    `;
                    element.appendChild(style);
                }

            } catch (err) {
                console.error("Preview render error:", err);
                element.innerHTML = '<div class="text-red-500 p-4">Failed to render preview.</div>';
            }
        }
    }, [generateDocumentBlob]);

    // Effect to render preview when modals open
    // Effect to render preview when modals open
    useEffect(() => {
        if (showExport && previewContainerRef.current) {
            renderPreviewToElement(previewContainerRef.current);
        }
    }, [showExport, renderPreviewToElement]);

    // Separate effect for the main preview modal
    const mainPreviewRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (showPreview && mainPreviewRef.current) {
            renderPreviewToElement(mainPreviewRef.current);
        }
    }, [showPreview, renderPreviewToElement]);


    const scrollToSection = (index: number) => {
        const element = document.getElementById(`section-${index}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Header */}
            <header className="h-12 border-b border-slate-200 flex items-center justify-between px-4 bg-white z-10 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/projects/${projectId}`)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            <span>{project?.name || 'Project'}</span>
                            <ChevronRight size={10} />
                            <span>{docType}</span>
                        </div>
                        <input
                            type="text"
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            className="font-bold text-slate-900 text-sm border-none p-0 focus:ring-0 w-64 md:w-96 bg-transparent placeholder-slate-400"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mr-2 md:inline hidden">
                        {existingDoc ? 'Saved' : 'Unsaved'}
                    </span>
                    <button
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-2 px-2 py-1 text-slate-600 hover:bg-slate-100 rounded transition-colors font-medium text-xs border border-transparent hover:border-slate-200"
                    >
                        <Eye size={12} />
                        <span className="md:inline hidden">Preview</span>
                    </button>
                    <button
                        onClick={() => setShowHints(!showHints)}
                        className={`flex items-center gap-2 px-2 py-1 ${showHints ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-sm' : 'bg-white text-slate-600 border-transparent hover:bg-slate-100'} rounded transition-colors font-medium text-xs border`}
                        title="Toggle Instructions"
                    >
                        <Info size={12} />
                        <span className="md:inline hidden">Hints</span>
                    </button>
                    <button
                        onClick={() => setShowExport(true)}
                        className="flex items-center gap-2 px-2 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded transition-colors font-medium text-xs shadow-sm"
                    >
                        <Share2 size={12} />
                        <span className="md:inline hidden">Export</span>
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors font-medium text-xs shadow-sm"
                    >
                        <Save size={12} />
                        <span>Save</span>
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar ToC */}
                <aside className="w-60 border-r border-slate-200 bg-white overflow-y-auto p-4 hidden md:block flex-shrink-0">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Table of Contents</h3>
                    <nav className="space-y-0.5">
                        {structure.map((item, idx) => {
                            const isString = typeof item === 'string';
                            const title = isString ? item : item.title;
                            const level = isString ? 1 : item.level;

                            // Calculate padding based on header level (1-6)
                            // Level 1 gets px-3, Level 2 gets px-6, Level 3 gets px-9, etc.
                            const paddingLeft = isString ? '0.75rem' : `${0.75 + (level - 1) * 0.75}rem`;
                            // Font weight and size decay slightly with depth for visual hierarchy
                            const fontSize = level === 1 ? '0.75rem' : '0.7rem';
                            const opacity = level === 1 ? '1' : `0.${9 - level}`;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => scrollToSection(idx)}
                                    className="w-full text-left py-1.5 rounded text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors truncate font-medium relative"
                                    style={{
                                        paddingLeft,
                                        fontSize,
                                        opacity
                                    }}
                                >
                                    {/* Small visual indicator for nested items */}
                                    {level > 1 && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3 bg-slate-200 rounded-r" style={{ marginLeft: `${0.25 + (level - 2) * 0.75}rem` }} />
                                    )}

                                    {title}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Editor Area - Scrollable Container */}
                <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                    <div className="max-w-4xl mx-auto space-y-6 pb-32">
                        {structure.map((item, idx) => {
                            const isString = typeof item === 'string';
                            const title = isString ? item : item.title;
                            const level = isString ? 1 : item.level;

                            return (
                                <div
                                    key={idx}
                                    id={`section-${idx}`}
                                    className="bg-white shadow-sm border border-slate-200 rounded overflow-hidden scroll-mt-20 group hover:shadow-md transition-all"
                                >
                                    <div className="p-4 pb-3 border-b border-slate-50 flex justify-between items-start bg-white">

                                        {/* Dynamic Heading Size based on Level */}
                                        {level === 1 && <h2 className="text-lg font-bold font-sans text-slate-900 tracking-tight">{title}</h2>}
                                        {level === 2 && <h3 className="text-base font-bold font-sans text-slate-800 tracking-tight">{title}</h3>}
                                        {level === 3 && <h4 className="text-sm font-bold font-sans text-slate-700 tracking-tight">{title}</h4>}
                                        {level > 3 && <h5 className="text-xs font-bold font-sans text-slate-700 tracking-tight">{title}</h5>}

                                        {/* AI Tools Toolbar */}
                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-[9px] font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors border border-slate-200" title="Generate suggested content for this section">
                                                <Sparkles size={10} />
                                                <span>Auto-Gen</span>
                                            </button>
                                            <button className="flex items-center gap-1 px-2 py-1 bg-slate-900 text-white rounded text-[9px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors" title="Open prompting assistant">
                                                <Bot size={10} />
                                                <span>Deep Prompt</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4 pt-3">
                                        <div className="p-0 space-y-3">
                                            {/* Render Instructions if they exist */}
                                            {showHints && !isString && Array.isArray((item as any).instructions) && (item as any).instructions.length > 0 && (
                                                <div className="bg-sky-50 border border-sky-100 rounded p-3 mb-3 flex gap-2 text-sky-800">
                                                    <Info size={14} className="mt-0.5 flex-shrink-0" />
                                                    <div className="text-xs space-y-1.5 font-medium leading-relaxed">
                                                        {(item as any).instructions.map((instr: string, iIndex: number) => (
                                                            <p key={iIndex}>{instr}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Render Content Blocks */}
                                            {(() => {
                                                const currentBlocks = sectionContent[idx] || [];
                                                const isDivider = ((title === '1.0 Introduction' || title === '2.0 Overview') && (!isString && (!(item as any).instructions || (item as any).instructions.length === 0)));

                                                const blocksToRender = (currentBlocks.length === 0 && !isDivider)
                                                    ? [{ type: 'text', data: '' }]
                                                    : currentBlocks;

                                                return (
                                                    <>
                                                        {blocksToRender.map((block, bIdx) => {
                                                            if (block.type === 'text') {
                                                                return (
                                                                    <div key={`text-${bIdx}`} className="mb-3">
                                                                        <RichTextEditor
                                                                            content={block.data || ""}
                                                                            onChange={(html) => handleContentChange(idx, bIdx, html)}
                                                                            placeholder={currentBlocks.length === 0 ? `Start typing content for ${title}...` : `Start typing content...`}
                                                                        />
                                                                    </div>
                                                                );
                                                            } else if (block.type === 'table') {
                                                                return (
                                                                    <div key={`table-${bIdx}`} className="mb-3">
                                                                        <TableEditor
                                                                            columns={block.columns || []}
                                                                            initialData={block.data || []}
                                                                            onChange={(newData) => handleContentChange(idx, bIdx, newData)}
                                                                        />
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })}

                                                        {currentBlocks.length === 0 && isDivider && (
                                                            <div className="mb-3 flex flex-col items-center">
                                                                <div className="relative flex py-3 items-center w-full group">
                                                                    <div className="flex-grow border-t border-slate-200"></div>
                                                                    <span className="flex-shrink mx-3 text-slate-300 text-[9px] font-bold uppercase tracking-widest bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100">Section Divider</span>
                                                                    <div className="flex-grow border-t border-slate-200"></div>

                                                                    <button
                                                                        onClick={() => {
                                                                            setSectionContent(prev => ({
                                                                                ...prev,
                                                                                [idx]: [{ type: 'text', data: '' }]
                                                                            }));
                                                                        }}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 flex items-center gap-1.5 px-2 py-1 bg-white text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider hover:text-slate-900 border border-slate-200 shadow-sm"
                                                                    >
                                                                        <Sparkles size={10} />
                                                                        <span>Add Content</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>

            {/* Main Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-50 w-full max-w-5xl h-[90vh] rounded shadow-2xl flex flex-col overflow-hidden border border-slate-200 relative">
                        <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 z-20 relative">
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                                <Eye size={16} className="text-slate-900" />
                                Document Preview
                            </h2>
                            <div className="flex items-center gap-3">
                                <button className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors text-xs font-bold uppercase tracking-wider">
                                    <Printer size={14} />
                                    Print
                                </button>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-slate-200/50 flex justify-center z-10 relative">
                            {/* Wrapper Div for separation */}
                            <div className="w-full max-w-[800px] pb-20">
                                <div ref={mainPreviewRef} className="bg-white shadow-lg min-h-[1100px] w-full docx-wrapper-custom" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {showExport && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-6xl h-[90vh] rounded shadow-2xl flex overflow-hidden border border-slate-200 relative">
                        {/* Left: Preview */}
                        <div className="flex-1 bg-slate-50 border-r border-slate-200 flex flex-col z-10 relative">
                            <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 z-20">
                                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                                    <Eye size={16} className="text-slate-900" />
                                    Template Preview
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-200/50 flex justify-center">
                                {/* Container for docx-preview */}
                                <div className="w-full max-w-[800px] pb-20">
                                    <div
                                        ref={previewContainerRef}
                                        className="bg-white shadow-lg min-h-[1100px] w-full docx-wrapper-custom"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right: Sidebar Actions */}
                        <div className="w-80 bg-white flex flex-col z-20 relative shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)]">
                            <div className="h-12 border-b border-slate-200 px-5 flex items-center justify-between flex-shrink-0">
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Export & Share</h2>
                                <button
                                    onClick={() => setShowExport(false)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition-colors relative z-50"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-5 space-y-6 overflow-y-auto flex-1">
                                {/* Export Section */}
                                <section>
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Download size={12} />
                                        Download As
                                    </h3>
                                    <div className="space-y-2">
                                        <button className="flex items-center justify-between w-full p-2.5 border border-slate-200 rounded hover:border-slate-900 hover:bg-slate-50 transition-all text-left group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                                    <FileDown size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-xs">PDF Document</div>
                                                    <div className="text-[10px] text-slate-500">Portable Document Format</div>
                                                </div>
                                            </div>
                                        </button>
                                        <button
                                            onClick={handleDownload}
                                            className="flex items-center justify-between w-full p-2.5 border border-slate-200 rounded hover:border-slate-900 hover:bg-slate-50 transition-all text-left group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                                    <FileText size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-xs">Word Document</div>
                                                    <div className="text-[10px] text-slate-500">Microsoft Word .docx</div>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </section>

                                {/* Share Section */}
                                <section className="pt-6 border-t border-slate-100">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Share2 size={12} />
                                        Share
                                    </h3>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">Send to Email</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="colleague@example.com"
                                                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-xs"
                                                />
                                                <button className="px-2.5 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                                                    <Mail size={12} />
                                                    Send
                                                </button>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                                <div className="h-px w-full bg-slate-200"></div>
                                                <span className="bg-white px-2 text-[8px] font-bold text-slate-300 absolute uppercase tracking-widest">OR</span>
                                            </div>
                                            <div className="h-3"></div>
                                        </div>

                                        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded hover:bg-slate-50 transition-colors font-bold text-slate-700 text-[10px] uppercase tracking-wider">
                                            <LinkIcon size={12} />
                                            Copy Share Link
                                        </button>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
