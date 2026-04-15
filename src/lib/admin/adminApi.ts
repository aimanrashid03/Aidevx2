import { supabase } from '../supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function getAccessToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Session expired — please sign out and sign back in.');
    return session.access_token;
}

async function callFn(fnName: string, action: string, payload: object = {}): Promise<unknown> {
    const token = await getAccessToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) {
        let errMsg = `Error ${res.status}`;
        try {
            const err = await res.json() as { error?: string; message?: string };
            errMsg = err.error || err.message || errMsg;
        } catch { /* body wasn't JSON */ }
        throw new Error(errMsg);
    }
    return res.json();
}

export async function callAdminUsers(action: string, payload: object = {}): Promise<unknown> {
    return callFn('admin-users', action, payload);
}

export async function callAdminTelemetry(action: string, payload: object = {}): Promise<unknown> {
    return callFn('admin-telemetry', action, payload);
}

export async function pingEdgeFunction(fnName: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const token = await getAccessToken();
    const start = Date.now();
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}?mode=ping`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY,
            },
        });
        const latencyMs = Date.now() - start;
        return { ok: res.status < 500, latencyMs };
    } catch (err) {
        return { ok: false, latencyMs: Date.now() - start, error: String(err) };
    }
}
