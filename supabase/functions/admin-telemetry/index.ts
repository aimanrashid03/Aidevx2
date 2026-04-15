import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    })
}

function errResponse(msg: string, status = 400): Response {
    return json({ error: msg }, status)
}

// Wrap a Supabase query (thenable but not a full Promise) so we can safely catch errors
async function safeQuery<T>(query: PromiseLike<T>, fallback: T): Promise<T> {
    try {
        return await query
    } catch {
        return fallback
    }
}

async function pingOo(ooUrl: string): Promise<{ reachable: boolean; latencyMs: number }> {
    if (!ooUrl) return { reachable: false, latencyMs: 0 }
    const start = Date.now()
    try {
        const res = await fetch(`${ooUrl}/healthcheck`, { signal: AbortSignal.timeout(5000) })
        return { reachable: res.ok, latencyMs: Date.now() - start }
    } catch {
        return { reachable: false, latencyMs: Date.now() - start }
    }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    // Ping mode — quick reachability check, no auth required
    const url = new URL(req.url)
    if (url.searchParams.get('mode') === 'ping') {
        return json({ ok: true, t: Date.now() })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        // Auth: decode JWT manually (per CLAUDE.md — auth.getUser() causes extra round-trip failures)
        const token = req.headers.get('authorization')?.replace(/^bearer\s+/i, '') ?? ''
        if (!token) return errResponse('Unauthorized', 401)

        let userId: string
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
            userId = payload.sub
        } catch {
            return errResponse('Unauthorized', 401)
        }

        const admin = createClient(supabaseUrl, serviceKey)

        // Verify caller is admin
        const { data: profile } = await admin
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()
        if (!profile || profile.role !== 'admin') return errResponse('Forbidden', 403)

        const { action, payload = {} } = await req.json() as { action: string; payload?: Record<string, unknown> }

        // ── tech_stack ──────────────────────────────────────────────────────
        if (action === 'tech_stack') {
            const ooUrl = Deno.env.get('VITE_ONLYOFFICE_SERVER_URL') ?? ''

            const fallbackResult = { data: null, error: null }

            const [migrationsResult, indexResult, pgvectorResult, ooPing] = await Promise.all([
                safeQuery(admin.rpc('get_applied_migrations'), fallbackResult),
                safeQuery(admin.rpc('get_embedding_indexes'), fallbackResult),
                safeQuery(admin.rpc('check_pgvector').single(), fallbackResult),
                pingOo(ooUrl),
            ])

            const migrations: { version: string; name?: string }[] = migrationsResult.data
                ? (migrationsResult.data as { version: string; name?: string }[])
                : []

            let pgIndexes: string[] = []
            if (indexResult.data) {
                pgIndexes = Array.isArray(indexResult.data)
                    ? (indexResult.data as { indexname: string }[]).map(r => r.indexname)
                    : []
            }

            return json({
                migrations,
                pgIndexes,
                pgvectorPresent: pgvectorResult.data === true,
                ooReachable: ooPing.reachable,
                ooLatencyMs: ooPing.latencyMs,
                ooUrl,
            })
        }

        // ── rag_status ─────────────────────────────────────────────────────
        // Note: embedding_status lives on project_documents; embeddings live on document_chunks
        if (action === 'rag_status') {
            const fallbackResult = { data: null, error: null, count: null }

            const [countsResult, failedResult, totalChunksResult] = await Promise.all([
                safeQuery(admin.rpc('get_embedding_status_counts'), fallbackResult),
                admin
                    .from('project_documents')
                    .select('id, file_name, created_at')
                    .eq('embedding_status', 'failed')
                    .order('created_at', { ascending: false })
                    .limit(50),
                admin
                    .from('document_chunks')
                    .select('id', { count: 'exact', head: true }),
            ])

            let statusCounts: { status: string; count: number }[] = []
            if (countsResult.data) {
                statusCounts = countsResult.data as { status: string; count: number }[]
            } else {
                for (const status of ['processed', 'processing', 'pending', 'failed']) {
                    const { count } = await admin
                        .from('project_documents')
                        .select('*', { count: 'exact', head: true })
                        .eq('embedding_status', status)
                    statusCounts.push({ status, count: count ?? 0 })
                }
            }

            const totalChunks = totalChunksResult.count ?? 0
            const failedDocs = (failedResult.data ?? []) as { id: string; file_name: string | null; created_at: string }[]

            let dimensionMismatches = 0
            try {
                const { data } = await admin.rpc('count_dimension_mismatches')
                dimensionMismatches = (data as number) ?? 0
            } catch {
                dimensionMismatches = 0
            }

            let avgChunksPerDoc = 0
            if (totalChunks > 0) {
                const { count: docCount } = await admin
                    .from('document_chunks')
                    .select('document_path', { count: 'exact', head: true })
                avgChunksPerDoc = docCount ? totalChunks / docCount : 0
            }

            return json({
                statusCounts,
                totalChunks,
                failedChunks: failedDocs.map(d => ({
                    id: d.id,
                    document_id: d.id,
                    doc_title: d.file_name ?? null,
                    project_name: null,
                    created_at: d.created_at,
                })),
                dimensionMismatches,
                avgChunksPerDoc,
            })
        }

        // ── rag_requeue ────────────────────────────────────────────────────
        if (action === 'rag_requeue') {
            const { error } = await admin
                .from('project_documents')
                .update({ embedding_status: 'pending' })
                .eq('embedding_status', 'failed')
            if (error) throw error
            return json({ success: true })
        }

        // ── storage_stats ──────────────────────────────────────────────────
        if (action === 'storage_stats') {
            // Use the storage JS API (not from('objects') which hits public schema)
            const bucket = admin.storage.from('documents')

            // List templates folder
            const { data: templateFiles } = await bucket.list('templates', { limit: 100 })

            // List root to enumerate project folders, then sample a few for stats
            const { data: rootItems } = await bucket.list('', { limit: 1000 })

            interface StorageFile {
                name: string
                metadata?: { size?: number; mimetype?: string } | null
                updated_at?: string | null
                created_at?: string | null
            }

            const templates = ((templateFiles ?? []) as StorageFile[]).map(f => ({
                name: `templates/${f.name}`,
                size: (f.metadata?.size ?? 0) as number,
                lastModified: (f.updated_at ?? f.created_at ?? new Date().toISOString()) as string,
                isTemplate: true,
                isOrphaned: false,
            }))

            // Get storage_path values from requirement_docs to detect orphans
            const { data: docs } = await admin.from('requirement_docs').select('storage_path')
            const docPaths = new Set(
                ((docs ?? []) as { storage_path: string | null }[]).map(d => d.storage_path).filter(Boolean)
            )

            const rootFiles = ((rootItems ?? []) as StorageFile[]).filter(f => f.metadata) // files, not folders
            const totalBytes = [...templates, ...rootFiles].reduce((s, f) => s + ((f as { size?: number }).size ?? 0), 0)
            const objectCount = (templateFiles?.length ?? 0) + (rootItems?.length ?? 0)

            const orphanedCount = rootFiles.filter(f => !docPaths.has(f.name)).length

            return json({
                totalBytes,
                objectCount,
                orphanedCount,
                templates,
                objects: templates,
            })
        }

        // ── template_upload_url ────────────────────────────────────────────
        if (action === 'template_upload_url') {
            const { templateName } = payload as { templateName: 'URS' | 'BRS' }
            if (!['URS', 'BRS'].includes(templateName)) return errResponse('Invalid template name')

            const { data, error } = await admin
                .storage
                .from('documents')
                .createSignedUploadUrl(`templates/${templateName}.docx`)
            if (error) throw error
            return json({ uploadUrl: data.signedUrl })
        }

        // ── app_config_get ─────────────────────────────────────────────────
        if (action === 'app_config_get') {
            const { data, error } = await admin
                .from('app_config')
                .select('key, value, updated_at, updated_by')
            if (error) {
                if ((error as { code?: string }).code === '42P01') return json({ rows: [] })
                throw error
            }
            return json({ rows: data ?? [] })
        }

        // ── app_config_set ─────────────────────────────────────────────────
        if (action === 'app_config_set') {
            const { key, value } = payload as { key: string; value: unknown }
            const { error } = await admin
                .from('app_config')
                .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: userId })
            if (error) throw error

            await admin.from('admin_audit_log').insert({
                actor_id: userId,
                action: 'flag.set',
                target_type: 'flag',
                target_id: key,
                metadata: { value },
            })

            return json({ success: true })
        }

        // ── oo_status ──────────────────────────────────────────────────────
        if (action === 'oo_status') {
            const ooUrl = Deno.env.get('VITE_ONLYOFFICE_SERVER_URL') ?? ''
            const ooPing = await pingOo(ooUrl)

            let callbackLogs: { metadata: Record<string, unknown> | null; created_at: string }[] = []
            try {
                const { data } = await admin
                    .from('admin_audit_log')
                    .select('metadata, created_at')
                    .eq('action', 'oo.save')
                    .order('created_at', { ascending: false })
                    .limit(10)
                callbackLogs = (data ?? []) as typeof callbackLogs
            } catch {
                // best-effort
            }

            return json({
                status: {
                    reachable: ooPing.reachable,
                    latencyMs: ooPing.latencyMs,
                    serverUrl: ooUrl,
                    jwtEnabled: false,
                },
                recentCallbacks: callbackLogs.map(l => ({
                    doc_id: (l.metadata?.doc_id as string) ?? '',
                    timestamp: l.created_at,
                    success: (l.metadata?.success as boolean) ?? true,
                })),
            })
        }

        return errResponse(`Unknown action: ${action}`)

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return errResponse(msg)
    }
})
