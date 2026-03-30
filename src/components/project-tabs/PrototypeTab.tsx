import { useState, useEffect } from 'react';
import { Plus, Play, Eye, Trash2, FileText, Loader2, Monitor, X, FlaskConical, ChevronRight, Copy, Check as CheckIcon } from 'lucide-react';
import type { Project } from '../../context/ProjectContext';

interface Prototype {
    id: string;
    name: string;
    sourceDocId: string;
    sourceDocTitle: string;
    sourceDocType: string;
    createdAt: string;
    html: string;
}

// ─── HTML generator (client-side mock) ───────────────────────────────────────

function generatePrototypeHTML(docTitle: string, docType: string): string {
    const systemName = docTitle.replace(/\s*(BRS|URS|SRS|SDS)\s*/gi, '').trim() || 'System';

    const navItems: Record<string, string[]> = {
        BRS: ['Overview', 'Objectives', 'Stakeholders', 'Scope', 'Constraints'],
        URS: ['Dashboard', 'User Management', 'Requests', 'Reports', 'Settings'],
        SRS: ['Requirements', 'Use Cases', 'Data Flow', 'Interfaces', 'Non-Functional'],
        SDS: ['Architecture', 'Components', 'Database', 'API Docs', 'Deployment'],
    };
    const items = navItems[docType] || ['Home', 'Features', 'Users', 'Reports', 'Settings'];

    const mainContent: Record<string, string> = {
        BRS: `
            <div class="kpi-row">
                <div class="kpi"><div class="kpi-val">12</div><div class="kpi-label">Objectives</div></div>
                <div class="kpi"><div class="kpi-val">5</div><div class="kpi-label">Stakeholders</div></div>
                <div class="kpi"><div class="kpi-val">3</div><div class="kpi-label">Modules</div></div>
                <div class="kpi"><div class="kpi-val">Q3</div><div class="kpi-label">Target</div></div>
            </div>
            <div class="card"><h3>Business Objectives</h3>
                <ul><li>Automate core operational workflows</li><li>Reduce manual processing time by 60%</li><li>Provide real-time reporting for management</li><li>Ensure compliance with regulatory standards</li></ul>
            </div>
            <div class="card"><h3>Stakeholders</h3>
                <table><tr><th>Name</th><th>Role</th><th>Department</th></tr>
                <tr><td>Ahmad Zulkifli</td><td>Project Sponsor</td><td>Management</td></tr>
                <tr><td>Nurul Ain</td><td>Business Analyst</td><td>Operations</td></tr>
                <tr><td>Raj Kumar</td><td>IT Lead</td><td>Technology</td></tr></table>
            </div>`,
        URS: `
            <div class="kpi-row">
                <div class="kpi"><div class="kpi-val">248</div><div class="kpi-label">Total Users</div></div>
                <div class="kpi"><div class="kpi-val">18</div><div class="kpi-label">Pending</div></div>
                <div class="kpi"><div class="kpi-val">94%</div><div class="kpi-label">Satisfaction</div></div>
                <div class="kpi"><div class="kpi-val">7</div><div class="kpi-label">Roles</div></div>
            </div>
            <div class="card"><h3>User Requests</h3>
                <table><tr><th>ID</th><th>User</th><th>Request</th><th>Status</th></tr>
                <tr><td>#1042</td><td>Ali Hassan</td><td>Password Reset</td><td><span class="badge green">Done</span></td></tr>
                <tr><td>#1041</td><td>Siti Nora</td><td>Account Upgrade</td><td><span class="badge amber">Pending</span></td></tr>
                <tr><td>#1040</td><td>John Tan</td><td>Access Request</td><td><span class="badge blue">Review</span></td></tr></table>
            </div>
            <div class="card"><h3>New User</h3>
                <div class="form-row"><label>Full Name</label><input placeholder="Enter full name" /></div>
                <div class="form-row"><label>Email</label><input placeholder="user@example.com" /></div>
                <div class="form-row"><label>Role</label><select><option>Viewer</option><option>Editor</option><option>Admin</option></select></div>
                <button class="btn-primary">Create User</button>
            </div>`,
        SRS: `
            <div class="kpi-row">
                <div class="kpi"><div class="kpi-val">64</div><div class="kpi-label">Requirements</div></div>
                <div class="kpi"><div class="kpi-val">31</div><div class="kpi-label">Use Cases</div></div>
                <div class="kpi"><div class="kpi-val">12</div><div class="kpi-label">Interfaces</div></div>
                <div class="kpi"><div class="kpi-val">8</div><div class="kpi-label">Constraints</div></div>
            </div>
            <div class="card"><h3>Functional Requirements</h3>
                <table><tr><th>ID</th><th>Description</th><th>Priority</th></tr>
                <tr><td>FR-01</td><td>User authentication and session management</td><td><span class="badge red">High</span></td></tr>
                <tr><td>FR-02</td><td>Role-based access control</td><td><span class="badge red">High</span></td></tr>
                <tr><td>FR-03</td><td>Data export to PDF/Excel</td><td><span class="badge amber">Medium</span></td></tr>
                <tr><td>FR-04</td><td>Email notifications</td><td><span class="badge blue">Low</span></td></tr></table>
            </div>`,
        SDS: `
            <div class="kpi-row">
                <div class="kpi"><div class="kpi-val">3</div><div class="kpi-label">Layers</div></div>
                <div class="kpi"><div class="kpi-val">14</div><div class="kpi-label">Modules</div></div>
                <div class="kpi"><div class="kpi-val">6</div><div class="kpi-label">APIs</div></div>
                <div class="kpi"><div class="kpi-val">2</div><div class="kpi-label">Databases</div></div>
            </div>
            <div class="card"><h3>System Architecture</h3>
                <div class="arch-diagram">
                    <div class="arch-layer">Frontend — React 19 + Vite + Tailwind CSS</div>
                    <div class="arch-arrow">↓</div>
                    <div class="arch-layer">API Gateway — Supabase Edge Functions (Deno)</div>
                    <div class="arch-arrow">↓</div>
                    <div class="arch-layer">Database — PostgreSQL + pgvector (Supabase)</div>
                </div>
            </div>
            <div class="card"><h3>API Endpoints</h3>
                <table><tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
                <tr><td><span class="badge green">GET</span></td><td>/api/projects</td><td>List all projects</td></tr>
                <tr><td><span class="badge blue">POST</span></td><td>/api/projects</td><td>Create project</td></tr>
                <tr><td><span class="badge amber">PUT</span></td><td>/api/projects/:id</td><td>Update project</td></tr>
                <tr><td><span class="badge red">DELETE</span></td><td>/api/projects/:id</td><td>Delete project</td></tr></table>
            </div>`,
    };

    const content = mainContent[docType] || mainContent['URS'];

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${systemName} — Prototype</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; display: flex; height: 100vh; overflow: hidden; font-size: 13px; }
  /* Sidebar */
  .sidebar { width: 220px; background: #0f172a; color: #cbd5e1; display: flex; flex-direction: column; flex-shrink: 0; }
  .sidebar-logo { padding: 18px 16px 14px; border-bottom: 1px solid #1e293b; }
  .sidebar-logo .app-name { font-size: 13px; font-weight: 800; color: #f1f5f9; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sidebar-logo .app-tag { font-size: 9px; font-weight: 700; color: #7c3aed; background: #1e1038; border: 1px solid #4c1d95; padding: 1px 6px; border-radius: 99px; margin-top: 4px; display: inline-block; letter-spacing: 0.5px; text-transform: uppercase; }
  .sidebar nav { flex: 1; padding: 10px 0; overflow-y: auto; }
  .nav-section { padding: 10px 16px 4px; font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1px; text-transform: uppercase; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 16px; font-size: 12px; font-weight: 500; color: #94a3b8; cursor: pointer; transition: background 0.15s, color 0.15s; border-left: 2px solid transparent; }
  .nav-item:hover { background: #1e293b; color: #f1f5f9; }
  .nav-item.active { background: #1e293b; color: #f1f5f9; border-left-color: #7c3aed; font-weight: 700; }
  .nav-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.5; }
  .nav-item.active .nav-dot { background: #7c3aed; opacity: 1; }
  .sidebar-footer { padding: 12px 16px; border-top: 1px solid #1e293b; }
  .avatar-row { display: flex; align-items: center; gap: 8px; }
  .avatar { width: 28px; height: 28px; border-radius: 50%; background: #7c3aed; color: white; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .avatar-info .name { font-size: 11px; font-weight: 700; color: #f1f5f9; }
  .avatar-info .role { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  /* Main */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { background: white; border-bottom: 1px solid #e2e8f0; padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .topbar-title { font-size: 14px; font-weight: 800; color: #0f172a; }
  .topbar-actions { display: flex; gap: 8px; align-items: center; }
  .content { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
  /* KPI row */
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .kpi { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
  .kpi-val { font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1; }
  .kpi-label { font-size: 10px; font-weight: 600; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  /* Card */
  .card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .card h3 { font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; padding: 0 8px 8px; border-bottom: 1px solid #f1f5f9; }
  td { padding: 8px; font-size: 12px; color: #334155; border-bottom: 1px solid #f8fafc; }
  tr:last-child td { border-bottom: none; }
  ul { padding-left: 16px; display: flex; flex-direction: column; gap: 6px; }
  li { font-size: 12px; color: #475569; }
  /* Badges */
  .badge { display: inline-block; padding: 2px 7px; border-radius: 99px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; }
  .badge.green { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .badge.amber { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
  .badge.blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .badge.red { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  /* Form */
  .form-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
  label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; }
  input, select { border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 10px; font-size: 12px; color: #334155; outline: none; background: #f8fafc; width: 100%; max-width: 320px; }
  input:focus, select:focus { border-color: #7c3aed; background: white; }
  .btn-primary { background: #0f172a; color: white; border: none; border-radius: 6px; padding: 8px 16px; font-size: 11px; font-weight: 700; cursor: pointer; margin-top: 4px; }
  .btn-outline { background: white; color: #334155; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 14px; font-size: 11px; font-weight: 700; cursor: pointer; }
  /* Arch diagram */
  .arch-diagram { display: flex; flex-direction: column; align-items: flex-start; gap: 0; }
  .arch-layer { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 16px; font-size: 12px; font-weight: 600; color: #334155; width: 100%; max-width: 420px; }
  .arch-arrow { font-size: 16px; color: #94a3b8; padding: 2px 16px; }
  /* Prototype badge */
  .proto-badge { background: #fdf4ff; color: #7c3aed; border: 1px solid #e9d5ff; border-radius: 99px; font-size: 9px; font-weight: 800; padding: 2px 8px; letter-spacing: 0.3px; text-transform: uppercase; }
</style>
</head>
<body>
<aside class="sidebar">
  <div class="sidebar-logo">
    <div class="app-name">${systemName}</div>
    <span class="app-tag">Prototype</span>
  </div>
  <nav>
    <div class="nav-section">Navigation</div>
    ${items.map((item, i) => `<div class="nav-item${i === 0 ? ' active' : ''}"><span class="nav-dot"></span>${item}</div>`).join('\n    ')}
  </nav>
  <div class="sidebar-footer">
    <div class="avatar-row">
      <div class="avatar">AU</div>
      <div class="avatar-info">
        <div class="name">Admin User</div>
        <div class="role">Administrator</div>
      </div>
    </div>
  </div>
</aside>

<div class="main">
  <div class="topbar">
    <div class="topbar-title">${items[0]}</div>
    <div class="topbar-actions">
      <span class="proto-badge">AI-Generated Prototype</span>
      <button class="btn-outline">Export</button>
      <button class="btn-primary">+ New</button>
    </div>
  </div>
  <div class="content">
    ${content}
  </div>
</div>
</body>
</html>`;
}

// ─── Code Viewer Modal ────────────────────────────────────────────────────────

interface CodeViewerProps {
    proto: Prototype;
    onClose: () => void;
    onRun: () => void;
    onDelete: () => void;
}

function CodeViewerModal({ proto, onClose, onRun, onDelete }: CodeViewerProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(proto.html).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleDelete = () => {
        if (!window.confirm('Delete this prototype?')) return;
        onDelete();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-lg w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in duration-200" style={{ maxHeight: '90vh' }}>
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center shrink-0">
                            <Monitor size={15} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{proto.name}</p>
                            <p className="text-[11px] text-slate-400">index.html — {(proto.html.length / 1024).toFixed(1)} KB</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                        >
                            {copied ? <CheckIcon size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                            onClick={onRun}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors"
                        >
                            <Play size={13} />
                            Run
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded text-xs font-bold hover:bg-red-50 transition-colors"
                        >
                            <Trash2 size={13} />
                            Delete
                        </button>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors ml-1">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* File tab bar */}
                <div className="flex items-center gap-0 px-4 bg-slate-950 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 text-[11px] font-bold border-t-2 border-violet-500 -mb-px">
                        <span className="text-violet-400">{'</>'}</span>
                        index.html
                    </div>
                </div>

                {/* Code */}
                <div className="flex-1 overflow-auto bg-slate-950">
                    <pre className="text-[11px] leading-relaxed text-slate-300 p-5 font-mono whitespace-pre-wrap break-words">
                        {proto.html}
                    </pre>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                    <p className="text-[11px] text-slate-400">{proto.html.split('\n').length} lines · Generated {new Date(proto.createdAt).toLocaleString()}</p>
                    <button onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-slate-900">Close</button>
                </div>
            </div>
        </div>
    );
}

// ─── Wizard Modal ─────────────────────────────────────────────────────────────

interface WizardProps {
    project: Project;
    onClose: () => void;
    onGenerated: (proto: Prototype) => void;
}

function WizardModal({ project, onClose, onGenerated }: WizardProps) {
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');

    const docs = project.requirementDocs || [];
    const selectedDoc = docs.find(d => d.id === selectedDocId);

    const handleGenerate = () => {
        if (!selectedDoc) return;
        setIsGenerating(true);

        const steps = [
            { pct: 15, label: 'Analysing document structure...' },
            { pct: 35, label: 'Mapping UI components...' },
            { pct: 55, label: 'Building layout...' },
            { pct: 75, label: 'Applying styles...' },
            { pct: 92, label: 'Finalising prototype...' },
            { pct: 100, label: 'Done!' },
        ];

        let i = 0;
        const run = () => {
            if (i >= steps.length) {
                const html = generatePrototypeHTML(selectedDoc.title, selectedDoc.type);
                const proto: Prototype = {
                    id: crypto.randomUUID(),
                    name: `${selectedDoc.title} Prototype`,
                    sourceDocId: selectedDoc.id,
                    sourceDocTitle: selectedDoc.title,
                    sourceDocType: selectedDoc.type,
                    createdAt: new Date().toISOString(),
                    html,
                };
                onGenerated(proto);
                return;
            }
            setProgress(steps[i].pct);
            setProgressLabel(steps[i].label);
            i++;
            setTimeout(run, 500 + Math.random() * 400);
        };
        setTimeout(run, 200);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <FlaskConical size={16} className="text-violet-600" />
                            <h2 className="text-base font-bold text-slate-900">New Prototype</h2>
                            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded uppercase tracking-wide">Experimental</span>
                        </div>
                        <p className="text-xs text-slate-500">Select a workspace document to generate a front-end prototype.</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors ml-2">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5">
                    {!isGenerating ? (
                        <>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3">Select a document from workspace</p>
                            {docs.length === 0 ? (
                                <div className="border border-dashed border-slate-200 rounded p-6 text-center">
                                    <FileText size={20} className="text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400">No documents in workspace yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-56 overflow-y-auto">
                                    {docs.map(doc => (
                                        <button
                                            key={doc.id}
                                            onClick={() => setSelectedDocId(doc.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded border text-left transition-all ${
                                                selectedDocId === doc.id
                                                    ? 'border-slate-900 bg-slate-50'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                                                selectedDocId === doc.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {doc.type}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate">{doc.title}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(doc.lastModified).toLocaleDateString()}</p>
                                            </div>
                                            {selectedDocId === doc.id && (
                                                <ChevronRight size={14} className="text-slate-900 shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="py-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
                                    <Loader2 size={16} className="text-violet-600 animate-spin" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-900">Generating prototype…</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{progressLabel}</p>
                                </div>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                                <div
                                    className="h-full bg-violet-500 rounded transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 text-right">{progress}%</p>
                        </div>
                    )}
                </div>

                {!isGenerating && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900">
                            Cancel
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={!selectedDocId}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded text-sm font-bold hover:bg-slate-800 disabled:opacity-40 transition-colors"
                        >
                            <FlaskConical size={14} />
                            Generate
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

interface Props {
    project: Project;
}

const STORAGE_KEY = (projectId: string) => `aidevx_prototypes_${projectId}`;

export default function PrototypeTab({ project }: Props) {
    const [prototypes, setPrototypes] = useState<Prototype[]>([]);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [viewingProto, setViewingProto] = useState<Prototype | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY(project.id));
            if (raw) setPrototypes(JSON.parse(raw));
        } catch { /* ignore */ }
    }, [project.id]);

    const persist = (next: Prototype[]) => {
        setPrototypes(next);
        localStorage.setItem(STORAGE_KEY(project.id), JSON.stringify(next));
    };

    const handleGenerated = (proto: Prototype) => {
        const next = [proto, ...prototypes];
        persist(next);
        setIsWizardOpen(false);
        setViewingProto(proto); // auto-open code viewer after generation
    };

    const handleDelete = (id: string) => {
        persist(prototypes.filter(p => p.id !== id));
        if (viewingProto?.id === id) setViewingProto(null);
    };

    const handleRun = (proto: Prototype) => {
        const blob = new Blob([proto.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
    };

    const DOC_TYPE_COLORS: Record<string, string> = {
        BRS: 'bg-blue-50 text-blue-700 border-blue-200',
        URS: 'bg-violet-50 text-violet-700 border-violet-200',
        SRS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        SDS: 'bg-amber-50 text-amber-700 border-amber-200',
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-sm font-bold text-slate-900">Prototype Generation</h2>
                        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded uppercase tracking-wide">Experimental</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Generate interactive front-end prototypes from your workspace documents. Full back-end integration coming soon.</p>
                </div>
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm shrink-0 ml-4"
                >
                    <Plus size={13} />
                    New Prototype
                </button>
            </div>

            {/* Experimental notice */}
            <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded p-3">
                <FlaskConical size={15} className="text-violet-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-violet-700 leading-relaxed">
                    Prototypes are generated locally and stored in your browser. Back-end persistence, version history, and AI-driven generation from document content will be added in a future release.
                </p>
            </div>

            {/* List */}
            {prototypes.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded flex flex-col items-center justify-center py-14 text-center bg-white">
                    <Monitor size={28} className="text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-500 mb-1">No prototypes yet</p>
                    <p className="text-[11px] text-slate-400 mb-5 max-w-xs">
                        Select a workspace document and generate a front-end prototype in seconds.
                    </p>
                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                        <Plus size={13} />
                        New Prototype
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {prototypes.map(proto => (
                        <div
                            key={proto.id}
                            className="bg-white border border-slate-200 rounded p-4 flex items-center gap-4 hover:border-slate-300 transition-colors group"
                        >
                            <div className="w-10 h-10 rounded bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-colors">
                                <Monitor size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-xs font-bold text-slate-900 truncate">{proto.name}</p>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${DOC_TYPE_COLORS[proto.sourceDocType] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                        {proto.sourceDocType}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    From: <span className="font-medium text-slate-500">{proto.sourceDocTitle}</span>
                                    <span className="mx-1.5">·</span>
                                    {new Date(proto.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setViewingProto(proto)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    <Eye size={13} />
                                    View Code
                                </button>
                                <button
                                    onClick={() => handleRun(proto)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-900 rounded text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                                >
                                    <Play size={13} />
                                    Run
                                </button>
                                <button
                                    onClick={() => handleDelete(proto.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded border border-slate-200 hover:border-red-200 transition-colors"
                                    title="Delete prototype"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isWizardOpen && (
                <WizardModal
                    project={project}
                    onClose={() => setIsWizardOpen(false)}
                    onGenerated={handleGenerated}
                />
            )}

            {viewingProto && (
                <CodeViewerModal
                    proto={viewingProto}
                    onClose={() => setViewingProto(null)}
                    onRun={() => handleRun(viewingProto)}
                    onDelete={() => handleDelete(viewingProto.id)}
                />
            )}
        </div>
    );
}
