/**
 * Shared LLM / embedding / RAG configuration loaded from environment variables.
 * All values have sensible defaults so the app works out-of-the-box with OpenAI.
 *
 * To switch to a self-hosted LLM (e.g. Ollama):
 *   supabase secrets set LLM_BASE_URL=http://host.docker.internal:11434/v1
 *   supabase secrets set LLM_API_KEY=ollama
 *   supabase secrets set LLM_MODEL=llama3.1
 *   supabase secrets set EMBEDDING_BASE_URL=http://host.docker.internal:11434/v1
 *   supabase secrets set EMBEDDING_MODEL=nomic-embed-text
 *   supabase secrets set EMBEDDING_DIMENSIONS=768
 *
 * For local dev add the same keys to supabase/.env.local.
 */

export function getLlmConfig() {
    return {
        baseUrl: Deno.env.get('LLM_BASE_URL') || 'https://api.openai.com/v1',
        apiKey: Deno.env.get('LLM_API_KEY') || Deno.env.get('OPENAI_API_KEY') || '',
        model: Deno.env.get('LLM_MODEL') || 'gpt-4o',
        temperature: parseFloat(Deno.env.get('LLM_TEMPERATURE') || '0.4'),
    }
}

export function getEmbeddingConfig() {
    return {
        baseUrl: Deno.env.get('EMBEDDING_BASE_URL') || 'https://api.openai.com/v1',
        apiKey: Deno.env.get('EMBEDDING_API_KEY') || Deno.env.get('OPENAI_API_KEY') || '',
        model: Deno.env.get('EMBEDDING_MODEL') || 'text-embedding-3-small',
        dimensions: parseInt(Deno.env.get('EMBEDDING_DIMENSIONS') || '1536'),
    }
}

export function getRagConfig() {
    return {
        matchThreshold: parseFloat(Deno.env.get('RAG_MATCH_THRESHOLD') || '0.45'),
        matchCount: parseInt(Deno.env.get('RAG_MATCH_COUNT') || '18'),
    }
}

/** Per-content-type temperature and token limits for more precise generation */
export function getContentTypeConfig(contentType: string, chatMode: boolean) {
    if (chatMode) return { temperature: 0.5, max_tokens: 2500 }
    switch (contentType) {
        case 'table':   return { temperature: 0.2, max_tokens: 1500 }
        case 'diagram': return { temperature: 0.2, max_tokens: 1000 }
        default:        return { temperature: 0.3, max_tokens: 2500 }
    }
}
