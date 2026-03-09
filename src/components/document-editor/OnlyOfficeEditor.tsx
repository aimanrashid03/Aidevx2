import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

// ─── OnlyOffice DocsAPI type declarations ─────────────────────────────────────

interface OnlyOfficeInstance {
    destroyEditor(): void;
    downloadAs(format: string): void;
    requestClose(): void;
    forceSave(): void;
}

declare global {
    interface Window {
        DocsAPI?: {
            DocEditor: new (containerId: string, config: object) => OnlyOfficeInstance;
        };
    }
}

// ─── Public handle (exposed via ref) ─────────────────────────────────────────

export interface OnlyOfficeEditorHandle {
    downloadAs(format: 'pdf' | 'docx'): void;
    forceSave(): void;
    pasteText(text: string): void;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OnlyOfficeEditorProps {
    /** Full OnlyOffice config object from getOnlyOfficeConfig() */
    config: object;
    /** Base URL of the OnlyOffice Document Server, e.g. http://localhost:8080 */
    serverUrl: string;
    onDocumentReady?: () => void;
    /** Called when the user makes or undoes changes (true = has unsaved changes) */
    onDocumentStateChange?: (modified: boolean) => void;
    onError?: (err: { errorCode: number; errorDescription: string }) => void;
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const OnlyOfficeEditor = forwardRef<OnlyOfficeEditorHandle, OnlyOfficeEditorProps>(
    function OnlyOfficeEditor(
        { config, serverUrl, onDocumentReady, onDocumentStateChange, onError, className = '' },
        ref,
    ) {
        const containerRef = useRef<HTMLDivElement>(null);
        const instanceRef = useRef<OnlyOfficeInstance | null>(null);
        const scriptLoadedRef = useRef(false);
        const configRef = useRef(config);
        configRef.current = config;

        // Expose imperative handle to parent
        useImperativeHandle(ref, () => ({
            downloadAs(format) {
                instanceRef.current?.downloadAs(format);
            },
            forceSave() {
                instanceRef.current?.forceSave();
            },
            pasteText(text: string) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const connector = (instanceRef.current as any)?.createConnector?.();
                    if (connector) {
                        connector.executeMethod('PasteText', [text]);
                    }
                } catch { /* ignore if connector unavailable */ }
            },
        }));

        // Memoise the callbacks so they don't cause needless re-mounts
        const onReadyRef = useRef(onDocumentReady);
        const onStateRef = useRef(onDocumentStateChange);
        const onErrorRef = useRef(onError);
        onReadyRef.current = onDocumentReady;
        onStateRef.current = onDocumentStateChange;
        onErrorRef.current = onError;

        const mountEditor = useCallback(() => {
            if (!containerRef.current || !window.DocsAPI) return;

            // Destroy any previous instance
            if (instanceRef.current) {
                try { instanceRef.current.destroyEditor(); } catch { /* ignore */ }
                instanceRef.current = null;
            }

            // Replace container contents with a fresh div
            const container = containerRef.current;
            container.innerHTML = '';
            const editorDiv = document.createElement('div');
            editorDiv.id = `oo-editor-${Date.now()}`;
            editorDiv.style.width = '100%';
            editorDiv.style.height = '100%';
            container.appendChild(editorDiv);

            const fullConfig = {
                ...configRef.current,
                events: {
                    onDocumentReady: () => onReadyRef.current?.(),
                    onDocumentStateChange: (event: { data: boolean }) =>
                        onStateRef.current?.(event.data),
                    onError: (event: { data: { errorCode: number; errorDescription: string } }) =>
                        onErrorRef.current?.(event.data),
                },
            };

            instanceRef.current = new window.DocsAPI.DocEditor(editorDiv.id, fullConfig);
        }, []); // no deps — uses refs

        // ── Load api.js once, then mount ──────────────────────────────────────
        useEffect(() => {
            const scriptId = 'onlyoffice-api-js';
            const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

            if (existing) {
                if (window.DocsAPI) {
                    scriptLoadedRef.current = true;
                    mountEditor();
                } else {
                    existing.addEventListener('load', () => {
                        scriptLoadedRef.current = true;
                        mountEditor();
                    }, { once: true });
                }
                return;
            }

            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `${serverUrl}/web-apps/apps/api/documents/api.js`;
            script.async = true;
            script.onload = () => {
                scriptLoadedRef.current = true;
                mountEditor();
            };
            script.onerror = () => {
                onErrorRef.current?.({
                    errorCode: -1,
                    errorDescription: `Failed to load OnlyOffice api.js from ${serverUrl}`,
                });
            };
            document.head.appendChild(script);
        }, [serverUrl, mountEditor]);

        // ── Re-mount when config changes (document key rotation) ──────────────
        // Compare only the document.key to avoid re-mounting on every render
        const configKey = (config as Record<string, Record<string, unknown>>)?.document?.key;
        const prevKeyRef = useRef<unknown>(null);

        useEffect(() => {
            if (!scriptLoadedRef.current || !window.DocsAPI) return;
            if (prevKeyRef.current !== null && prevKeyRef.current === configKey) return;
            prevKeyRef.current = configKey;
            mountEditor();
        }, [configKey, mountEditor]);

        // ── Cleanup on unmount ────────────────────────────────────────────────
        useEffect(() => {
            return () => {
                if (instanceRef.current) {
                    try { instanceRef.current.destroyEditor(); } catch { /* ignore */ }
                }
            };
        }, []);

        return (
            <div
                ref={containerRef}
                className={`onlyoffice-container ${className}`}
                style={{ width: '100%', height: '100%' }}
            />
        );
    },
);

export default OnlyOfficeEditor;
