import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Save, Eye, ChevronRight, Sparkles, Bot, X, Printer,
    FileText, Share2, Download, Mail, Link as LinkIcon, FileDown
} from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { useState, useEffect } from 'react';

const DOC_STRUCTURES: Record<string, string[]> = {
    BRS: ['1. Executive Summary', '2. Project Scope', '3. Business Requirements', '4. Stakeholders', '5. Cost Benefit Analysis'],
    URS: ['1. Introduction', '2. User Personas', '3. User Scenarios', '4. User Requirements', '5. Acceptance Criteria'],
    SRS: ['1. Introduction', '2. System Overview', '3. Functional Requirements', '4. Non-functional Requirements', '5. Interfaces'],
    SDS: ['1. Architecture', '2. Database Design', '3. API Design', '4. Security Components', '5. Deployment View'],
};

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

    // State for section content
    const [sectionContent, setSectionContent] = useState<Record<number, string>>({});
    const [docTitle, setDocTitle] = useState(existingDoc?.title || 'Untitled Document');
    const [showPreview, setShowPreview] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [email, setEmail] = useState('');

    // Initial content load
    useEffect(() => {
        if (existingDoc) {
            setSectionContent(existingDoc.content);
            setDocTitle(existingDoc.title);
        } else {
            const initial: Record<number, string> = {};
            structure.forEach((_, idx) => {
                initial[idx] = "";
            });
            setSectionContent(initial);
        }
    }, [existingDoc, structure]);

    const handleContentChange = (index: number, value: string) => {
        setSectionContent(prev => ({ ...prev, [index]: value }));
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

    const scrollToSection = (index: number) => {
        const element = document.getElementById(`section-${index}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const DocumentPreviewContent = () => (
        <div className="bg-white max-w-[800px] mx-auto min-h-screen shadow-sm border border-slate-200 p-12 md:p-16">
            {/* Document Title Page Mock */}
            <div className="text-center mb-16 border-b pb-8 border-slate-100">
                <div className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-4">{project?.name || 'PROJECT NAME'}</div>
                <h1 className="text-3xl font-bold text-slate-900 mb-4 font-serif">{docTitle}</h1>
                <div className="text-slate-500 text-sm font-medium">{docType} • {new Date().toLocaleDateString()}</div>
            </div>

            {/* Content */}
            <div className="space-y-10">
                {structure.map((item, idx) => (
                    <div key={idx}>
                        <h3 className="text-lg font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">{item}</h3>
                        <div className="prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {sectionContent[idx] ? sectionContent[idx] : <span className="text-slate-300 italic">No content.</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

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
                        {structure.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => scrollToSection(idx)}
                                className="w-full text-left px-3 py-1.5 rounded text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors truncate font-medium"
                            >
                                {item}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Editor Area - Scrollable Container */}
                <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                    <div className="max-w-4xl mx-auto space-y-6 pb-32">
                        {structure.map((item, idx) => (
                            <div
                                key={idx}
                                id={`section-${idx}`}
                                className="bg-white shadow-sm border border-slate-200 rounded overflow-hidden scroll-mt-20 group hover:shadow-md transition-all"
                            >
                                <div className="p-6 pb-4 border-b border-slate-50 flex justify-between items-start bg-white">
                                    <h2 className="text-lg font-bold font-sans text-slate-900 tracking-tight">
                                        {item}
                                    </h2>

                                    {/* AI Tools Toolbar */}
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors border border-slate-200" title="Generate suggested content for this section">
                                            <Sparkles size={12} />
                                            <span>Auto-Gen</span>
                                        </button>
                                        <button className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors" title="Open prompting assistant">
                                            <Bot size={12} />
                                            <span>Deep Prompt</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 pt-4">
                                    <textarea
                                        value={sectionContent[idx] || ""}
                                        onChange={(e) => handleContentChange(idx, e.target.value)}
                                        className="w-full min-h-[120px] p-0 border-none resize-y focus:outline-none focus:ring-0 bg-transparent text-slate-700 placeholder:text-slate-300 leading-relaxed text-sm font-sans"
                                        placeholder={`Start typing content for ${item}...`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-50 w-full max-w-5xl h-[90vh] rounded shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                        <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
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

                        <div className="flex-1 overflow-y-auto p-8 md:p-12">
                            <DocumentPreviewContent />
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {showExport && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-6xl h-[90vh] rounded shadow-2xl flex overflow-hidden border border-slate-200">
                        {/* Left: Preview */}
                        <div className="flex-1 bg-slate-50 border-r border-slate-200 flex flex-col">
                            <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
                                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                                    <Eye size={16} className="text-slate-900" />
                                    Preview
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8">
                                <div className="transform scale-75 origin-top bg-white border border-slate-200 shadow-sm min-h-screen">
                                    <DocumentPreviewContent />
                                </div>
                            </div>
                        </div>

                        {/* Right: Sidebar Actions */}
                        <div className="w-80 bg-white flex flex-col">
                            <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Export & Share</h2>
                                <button
                                    onClick={() => setShowExport(false)}
                                    className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 space-y-8 overflow-y-auto flex-1">
                                {/* Export Section */}
                                <section>
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Download size={12} />
                                        Download As
                                    </h3>
                                    <div className="space-y-3">
                                        <button className="flex items-center justify-between w-full p-3 border border-slate-200 rounded hover:border-slate-900 hover:bg-slate-50 transition-all text-left group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                                    <FileDown size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm">PDF Document</div>
                                                    <div className="text-[10px] text-slate-500">Portable Document Format</div>
                                                </div>
                                            </div>
                                        </button>
                                        <button className="flex items-center justify-between w-full p-3 border border-slate-200 rounded hover:border-slate-900 hover:bg-slate-50 transition-all text-left group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                                    <FileText size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm">Word Document</div>
                                                    <div className="text-[10px] text-slate-500">Microsoft Word .docx</div>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </section>

                                {/* Share Section */}
                                <section className="pt-8 border-t border-slate-100">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Share2 size={12} />
                                        Share
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Send to Email</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="colleague@example.com"
                                                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-sm"
                                                />
                                                <button className="px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                                    <Mail size={12} />
                                                    Send
                                                </button>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                                <div className="h-px w-full bg-slate-200"></div>
                                                <span className="bg-white px-2 text-[10px] font-bold text-slate-300 absolute uppercase tracking-widest">OR</span>
                                            </div>
                                            <div className="h-4"></div>
                                        </div>

                                        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded hover:bg-slate-50 transition-colors font-bold text-slate-700 text-xs uppercase tracking-wider">
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
