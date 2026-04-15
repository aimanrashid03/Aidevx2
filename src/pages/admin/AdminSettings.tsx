import { useState, useEffect } from 'react';
import { ToggleLeft, RefreshCw, AlertCircle, Info, Save } from 'lucide-react';
import { callAdminTelemetry } from '../../lib/admin/adminApi';
import clsx from 'clsx';

interface AppConfigRow {
    key: string;
    value: unknown;
    updated_at: string | null;
    updated_by: string | null;
}

interface FlagDef {
    key: string;
    label: string;
    description: string;
    type: 'boolean' | 'string';
    options?: string[];
    default: unknown;
}

const FLAG_DEFS: FlagDef[] = [
    {
        key: 'feature.auto_generate',
        label: 'Auto-Generate Document',
        description: 'Allow users to trigger full-document AI generation (BRS). Disable to prevent LLM calls during maintenance.',
        type: 'boolean',
        default: true,
    },
    {
        key: 'feature.prototype',
        label: 'UI Prototype Generation',
        description: 'Allow users to generate HTML UI prototypes from requirement documents.',
        type: 'boolean',
        default: true,
    },
    {
        key: 'llm.model_override.section',
        label: 'Section Gen Model Override',
        description: 'Override the LLM model used for per-section AI generation. Leave empty to use server env default.',
        type: 'string',
        options: ['', 'deepseek/deepseek-chat-v3-0324', 'google/gemini-2.5-flash-preview', 'anthropic/claude-haiku-4-5'],
        default: '',
    },
    {
        key: 'llm.model_override.auto_generate',
        label: 'Auto Gen Model Override',
        description: 'Override the LLM model for full-document auto-generation.',
        type: 'string',
        options: ['', 'deepseek/deepseek-chat-v3-0324', 'google/gemini-2.5-flash-preview'],
        default: '',
    },
    {
        key: 'llm.model_override.prototype',
        label: 'Prototype Gen Model Override',
        description: 'Override the LLM model for UI prototype generation (needs 16k+ output).',
        type: 'string',
        options: ['', 'google/gemini-2.5-flash-preview', 'deepseek/deepseek-chat-v3-0324'],
        default: 'google/gemini-2.5-flash-preview',
    },
];

export default function AdminSettings() {
    const [configs, setConfigs] = useState<Map<string, AppConfigRow>>(new Map());
    const [draft, setDraft] = useState<Map<string, unknown>>(new Map());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [tableExists, setTableExists] = useState(true);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    useEffect(() => { fetchConfigs(); }, []);

    const fetchConfigs = async () => {
        setLoading(true);
        setError(null);
        setSaveSuccess(null);
        try {
            const result = await callAdminTelemetry('app_config_get') as { rows: AppConfigRow[] };
            const map = new Map<string, AppConfigRow>();
            result.rows.forEach(r => map.set(r.key, r));
            setConfigs(map);
            // Init draft from current values
            const draftMap = new Map<string, unknown>();
            FLAG_DEFS.forEach(def => {
                const row = map.get(def.key);
                draftMap.set(def.key, row ? row.value : def.default);
            });
            setDraft(draftMap);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('42P01') || msg.includes('does not exist')) {
                setTableExists(false);
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (key: string) => {
        setSaving(prev => ({ ...prev, [key]: true }));
        setError(null);
        setSaveSuccess(null);
        try {
            const value = draft.get(key);
            await callAdminTelemetry('app_config_set', { key, value });
            setSaveSuccess(`"${FLAG_DEFS.find(f => f.key === key)?.label}" saved.`);
            await fetchConfigs();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    const isDirty = (key: string): boolean => {
        const current = configs.get(key)?.value;
        const d = draft.get(key);
        return JSON.stringify(current ?? FLAG_DEFS.find(f => f.key === key)?.default) !== JSON.stringify(d);
    };

    if (loading) return <div className="p-8 text-center text-slate-500 text-sm">Loading feature flags...</div>;

    return (
        <div className="p-6 space-y-6 max-w-3xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <ToggleLeft size={22} /> Feature Flags
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Runtime toggles and model overrides — changes take effect on the next function invocation.
                    </p>
                </div>
                <button onClick={fetchConfigs}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {saveSuccess && (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                    <p className="text-sm font-medium">{saveSuccess}</p>
                </div>
            )}

            {!tableExists && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">Migration required</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            The <code className="bg-amber-100 px-1 rounded">app_config</code> table does not exist yet.
                            Run migration <code className="bg-amber-100 px-1 rounded">20260415000002_app_config.sql</code> to enable feature flags.
                        </p>
                    </div>
                </div>
            )}

            {tableExists && (
                <div className="space-y-4">
                    {FLAG_DEFS.map(def => {
                        const currentVal = draft.get(def.key);
                        const dirty = isDirty(def.key);
                        const row = configs.get(def.key);

                        return (
                            <div key={def.key} className={clsx(
                                'rounded-lg border bg-white p-4 shadow-sm transition-all',
                                dirty ? 'border-[var(--accent-300)]' : 'border-slate-200'
                            )}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-900">{def.label}</span>
                                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{def.key}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">{def.description}</p>
                                        {row?.updated_at && (
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Last changed {new Date(row.updated_at).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {def.type === 'boolean' ? (
                                            <button
                                                onClick={() => setDraft(prev => {
                                                    const next = new Map(prev);
                                                    next.set(def.key, !currentVal);
                                                    return next;
                                                })}
                                                className={clsx(
                                                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                                    currentVal ? 'bg-[var(--accent-600)]' : 'bg-slate-300'
                                                )}
                                            >
                                                <span className={clsx(
                                                    'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                                                    currentVal ? 'translate-x-4' : 'translate-x-0.5'
                                                )} />
                                            </button>
                                        ) : (
                                            <select
                                                value={(currentVal as string) ?? ''}
                                                onChange={e => setDraft(prev => {
                                                    const next = new Map(prev);
                                                    next.set(def.key, e.target.value);
                                                    return next;
                                                })}
                                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-slate-200 outline-none"
                                            >
                                                {def.options?.map(opt => (
                                                    <option key={opt} value={opt}>{opt || '(use env default)'}</option>
                                                ))}
                                            </select>
                                        )}
                                        {dirty && (
                                            <button
                                                onClick={() => handleSave(def.key)}
                                                disabled={saving[def.key]}
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] transition-colors disabled:opacity-50"
                                            >
                                                <Save size={11} />
                                                {saving[def.key] ? 'Saving...' : 'Save'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
