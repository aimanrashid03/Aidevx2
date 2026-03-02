import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Save, Eye, ChevronRight, Sparkles, Bot, X, Printer,
    FileText, Share2, Download, Mail, Link as LinkIcon, FileDown,
    Info, CheckCircle2, CircleDashed
} from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { useState, useEffect, useRef } from 'react';
import RichTextEditor from '../components/RichTextEditor';
import TableEditor from '../components/TableEditor';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { DOC_STRUCTURES } from '../constants/docs';
import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { renderAsync } from 'docx-preview';

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
    const [sectionContent, setSectionContent] = useState<Record<number, Record<string, unknown>[]>>({});
    const [sectionStatuses, setSectionStatuses] = useState<Record<number, 'drafting' | 'complete'>>({});
    const [docTitle, setDocTitle] = useState(existingDoc?.title || 'Untitled Document');
    const [showPreview, setShowPreview] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [showHints, setShowHints] = useState(true);
    const [generatingSection, setGeneratingSection] = useState<number | null>(null);
    const [email, setEmail] = useState('');
    const previewContainerRef = useRef<HTMLDivElement>(null);

    const handleAutoGen = async (sectionIdx: number, sectionTitle: string, instructions?: string[]) => {
        if (!projectId) return;

        try {
            setGeneratingSection(sectionIdx);

            const { data, error } = await supabase.functions.invoke('generate_section', {
                body: {
                    projectId,
                    sectionTitle,
                    instructions: instructions ? instructions.join(' ') : ''
                }
            });

            if (error) throw error;

            if (data && data.content) {
                // If the section is empty, replace the first content block. 
                // If it already has content, we replace the first block anyway for simplicity, 
                // but in a production app we might append.
                handleContentChange(sectionIdx, 0, data.content);
            }

        } catch (err) {
            console.error("Error generating section:", err);
            alert("Failed to generate section content. Please check the console for details.");
        } finally {
            setGeneratingSection(null);
        }
    };

    // Initial content load
    useEffect(() => {
        if (existingDoc) {
            // Migrate legacy flat string content to block array structure
            const migratedState: Record<number, Record<string, unknown>[]> = {};
            Object.entries(existingDoc.content).forEach(([idx, val]) => {
                if (typeof val === 'string') {
                    migratedState[Number(idx)] = [{ type: 'text', data: val }];
                } else {
                    migratedState[Number(idx)] = val as Record<string, unknown>[];
                }
            });
            setSectionContent(migratedState);
            setSectionStatuses(existingDoc.sectionStatuses || {});
            setDocTitle(existingDoc.title);
        } else {
            const initial: Record<number, Record<string, unknown>[]> = {};
            const initialStatuses: Record<number, 'drafting' | 'complete'> = {};
            structure.forEach((item, idx) => {
                initial[idx] = typeof item === 'string' ? [] : (item.content ? JSON.parse(JSON.stringify(item.content)) : []);
            });
            setSectionContent(initial);
            setSectionStatuses(initialStatuses);
        }
    }, [existingDoc, structure]);

    const toggleSectionStatus = (idx: number) => {
        setSectionStatuses(prev => {
            const current = prev[idx];
            let nextStatus: 'drafting' | 'complete' | undefined;

            if (!current) nextStatus = 'drafting';
            else if (current === 'drafting') nextStatus = 'complete';
            else nextStatus = undefined;

            const newStatuses = { ...prev };
            if (nextStatus) {
                newStatuses[idx] = nextStatus;
            } else {
                delete newStatuses[idx];
            }
            return newStatuses;
        });
    };

    const scrollToSection = (index: number) => {
        const element = document.getElementById(`section-${index}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleContentChange = (sectionIdx: number, blockIdx: number, value: unknown) => {
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
            sectionStatuses: sectionStatuses,
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

            const dataMap: Record<string, unknown> = {
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
                dataMap[key] = textBlocks.map(b => cleanContent((b.data as string) || "")).join('\n\n');

                // Feed tables dynamically into docxtemplater arrays
                const tableBlocks = blocks.filter(b => b.type === 'table');
                tableBlocks.forEach((tb, tIdx) => {
                    // For MVP, expose the very first table in a section as `table_X_0` for the template to loop
                    const tableKey = `table_${idx}_${tIdx}`;
                    const tableArray: Record<string, unknown>[] = [];

                    // Build array of objects mapping column labels to cell values
                    // E.g. { "FR ID": "PM-1.1", "Features": "The system..." }
                    if (tb.data && Array.isArray(tb.data)) {
                        tb.data.forEach((row: unknown) => {
                            const rowArr = row as string[];
                            const rowObj: Record<string, string> = {};
                            if (tb.columns && Array.isArray(tb.columns)) {
                                tb.columns.forEach((colName: unknown, cIdx: number) => {
                                    // Sanitize colName for docxtemplater variables (alphanumeric+underscore)
                                    let cleanColName = (colName as string).replace(/[^a-zA-Z0-9_]/g, '');
                                    // Prevent empty keys
                                    if (!cleanColName) cleanColName = `col_${cIdx}`;
                                    rowObj[cleanColName] = rowArr[cIdx] || '';
                                });
                            }
                            tableArray.push(rowObj);
                        });
                    }

                    dataMap[tableKey] = tableArray;
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
                {/* Table of Contents - Minimalist Left Rail */}
                <aside className="w-56 bg-slate-50/30 border-r border-slate-100 p-5 hidden lg:flex flex-col overflow-hidden shrink-0 transition-all">
                    <div className="mb-5 shrink-0">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Contents</h3>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-white border border-slate-200 rounded p-1.5 flex flex-col items-center justify-center shadow-sm">
                                <span className="text-sm font-bold text-emerald-600">{Object.values(sectionStatuses).filter(s => s === 'complete').length}</span>
                                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Complete</span>
                            </div>
                            <div className="flex-1 bg-white border border-slate-200 rounded p-1.5 flex flex-col items-center justify-center shadow-sm">
                                <span className="text-sm font-bold text-amber-500">{Object.values(sectionStatuses).filter(s => s === 'drafting').length}</span>
                                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Drafts</span>
                            </div>
                        </div>
                    </div>
                    <nav className="space-y-1 overflow-y-auto flex-1 pr-2 pb-10">
                        {structure.map((item, idx) => {
                            const isString = typeof item === 'string';
                            const title = isString ? item : item.title;
                            const level = isString ? 1 : item.level;
                            const status = sectionStatuses[idx];

                            const paddingLeft = isString ? '0rem' : `${(level - 1) * 0.75}rem`;
                            const fontSize = level === 1 ? '0.75rem' : '0.7rem';
                            const opacity = level === 1 ? '1' : `0.${9 - level}`;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => scrollToSection(idx)}
                                    className="w-full text-left py-1.5 px-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors truncate font-medium relative flex items-center justify-between group"
                                    style={{
                                        marginLeft: paddingLeft,
                                        fontSize,
                                        opacity,
                                        width: `calc(100% - ${paddingLeft})`
                                    }}
                                    title={title}
                                >
                                    <span className="truncate pr-2">{title}</span>
                                    {status === 'complete' && (
                                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0 opacity-100 transition-opacity" />
                                    )}
                                    {status === 'drafting' && (
                                        <CircleDashed size={12} className="text-amber-500 shrink-0 opacity-100 transition-opacity" />
                                    )}
                                    {!status && (
                                        <CircleDashed size={12} className="text-slate-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Editor Area - Scrollable Container */}
                <main className="flex-1 overflow-y-auto bg-white p-4 md:p-6 lg:p-8 relative scroll-smooth">
                    <div className="max-w-[760px] mx-auto space-y-4 pb-40">
                        {structure.map((item, idx) => {
                            const isString = typeof item === 'string';
                            const title = isString ? item : item.title;
                            const level = isString ? 1 : item.level;

                            return (
                                <div
                                    key={idx}
                                    id={`section-${idx}`}
                                    className="relative group scroll-mt-24"
                                >
                                    {/* Dynamic Heading Size based on Level */}
                                    <div className="mb-2 flex flex-col md:flex-row md:items-start justify-between gap-2 group/header pb-1 border-b border-transparent hover:border-slate-100 transition-colors">
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            {level === 1 && <h2 className="text-lg font-bold font-sans text-slate-900 tracking-tight truncate">{title}</h2>}
                                            {level === 2 && <h3 className="text-base font-bold font-sans text-slate-800 tracking-tight truncate">{title}</h3>}
                                            {level === 3 && <h4 className="text-sm font-bold font-sans text-slate-800 tracking-tight truncate">{title}</h4>}
                                            {level > 3 && <h5 className="text-[13px] font-bold font-sans text-slate-700 tracking-tight truncate">{title}</h5>}
                                        </div>

                                        {/* Status Toggle */}
                                        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                                            <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-sm">
                                                <button
                                                    onClick={() => toggleSectionStatus(idx)}
                                                    className={`px-2 py-1 flex items-center gap-1.5 transition-colors rounded-sm ${sectionStatuses[idx] === 'complete'
                                                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                                        : sectionStatuses[idx] === 'drafting'
                                                            ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                                            : 'text-slate-500 hover:bg-slate-100'
                                                        }`}
                                                    title={sectionStatuses[idx] === 'complete' ? 'Mark as Unassigned' : sectionStatuses[idx] === 'drafting' ? 'Mark as Complete' : 'Mark as Drafting'}
                                                >
                                                    {sectionStatuses[idx] === 'complete' ? <CheckCircle2 size={12} /> : <CircleDashed size={12} />}
                                                    <span className="text-[9px] font-bold uppercase tracking-wider">
                                                        {sectionStatuses[idx] === 'complete' ? 'Complete' : sectionStatuses[idx] === 'drafting' ? 'Drafting' : 'Unassigned'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 border-l-[2px] border-transparent group-hover:border-slate-100 pl-3 py-0.5 -ml-3 transition-colors">
                                        {/* Render Instructions if they exist */}
                                        {showHints && !isString && Array.isArray((item as { instructions?: string[] }).instructions) && (((item as { instructions?: string[] }).instructions)?.length ?? 0) > 0 && (
                                            <div className="bg-sky-50 border border-sky-100 rounded p-3 mb-3 flex gap-2 text-sky-800">
                                                <Info size={14} className="mt-0.5 flex-shrink-0" />
                                                <div className="text-xs space-y-1.5 font-medium leading-relaxed">
                                                    {((item as { instructions?: string[] }).instructions || []).map((instr: string, iIndex: number) => (
                                                        <p key={iIndex}>{instr}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Render Content Blocks */}
                                        {(() => {
                                            const currentBlocks = sectionContent[idx] || [];
                                            const isDivider = ((title === '1.0 Introduction' || title === '2.0 Overview') && (!isString && (!(item as { instructions?: string[] }).instructions || (((item as { instructions?: string[] }).instructions)?.length ?? 0) === 0)));

                                            const blocksToRender = (currentBlocks.length === 0 && !isDivider)
                                                ? [{ type: 'text', data: '' }]
                                                : currentBlocks;

                                            return (
                                                <>
                                                    {blocksToRender.map((block, bIdx) => {
                                                        if (block.type === 'text') {
                                                            return (
                                                                <div key={`text-${bIdx}`} className="mb-2">
                                                                    <RichTextEditor
                                                                        content={(block.data as string) || ""}
                                                                        onChange={(html) => handleContentChange(idx, bIdx, html)}
                                                                        placeholder={currentBlocks.length === 0 ? `Start typing content for ${title}...` : `Start typing content...`}
                                                                    />
                                                                </div>
                                                            );
                                                        } else if (block.type === 'table') {
                                                            return (
                                                                <div key={`table-${bIdx}`} className="mb-2">
                                                                    <TableEditor
                                                                        columns={(block.columns as string[]) || []}
                                                                        initialData={(block.data as string[][]) || []}
                                                                        onChange={(newData) => handleContentChange(idx, bIdx, newData)}
                                                                    />
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })}

                                                    {currentBlocks.length === 0 && isDivider && (
                                                        <div className="mb-2 group/add relative">
                                                            <button
                                                                onClick={() => {
                                                                    setSectionContent(prev => ({
                                                                        ...prev,
                                                                        [idx]: [{ type: 'text', data: '' }]
                                                                    }));
                                                                }}
                                                                className="w-full text-left text-slate-300 hover:text-slate-500 font-medium md:text-lg py-1 transition-colors italic focus:outline-none"
                                                            >
                                                                Click to add content...
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* AI Tools Bar Under Section */}
                                                    <div className="mt-2 flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                                                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-md p-1">
                                                            <button
                                                                onClick={() => handleAutoGen(idx, title, ((item as { instructions?: string[] }).instructions || []))}
                                                                disabled={generatingSection === idx}
                                                                className="px-2 py-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 transition-colors rounded-sm disabled:opacity-50 flex items-center gap-1.5"
                                                                title="Auto-Gen Section"
                                                            >
                                                                {generatingSection === idx ? (
                                                                    <div className="animate-spin h-3.5 w-3.5 border-2 border-purple-200 border-t-purple-600 rounded-full"></div>
                                                                ) : (
                                                                    <Sparkles size={12} />
                                                                )}
                                                                <span className="text-[10px] font-bold uppercase tracking-wider">Auto-Generate</span>
                                                            </button>
                                                            <div className="w-px h-3 bg-slate-200"></div>
                                                            <button
                                                                className="px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-sm transition-colors flex items-center gap-1.5"
                                                                title="Deep Prompting Assistant"
                                                            >
                                                                <Bot size={12} />
                                                                <span className="text-[10px] font-bold uppercase tracking-wider">Assistant</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div >

            {/* Main Preview Modal */}
            {
                showPreview && (
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
                )
            }

            {/* Export Modal */}
            {
                showExport && (
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
                )
            }
        </div >
    )
}
