/**
 * Shared LLM / embedding / RAG configuration loaded from environment variables.
 * All values have sensible defaults for Anthropic (Claude) + Voyage AI.
 *
 * To switch to a self-hosted LLM (e.g. Ollama):
 *   supabase secrets set LLM_PROVIDER=openai
 *   supabase secrets set LLM_BASE_URL=http://host.docker.internal:11434/v1
 *   supabase secrets set LLM_API_KEY=ollama
 *   supabase secrets set LLM_MODEL=llama3.1
 *   supabase secrets set EMBEDDING_BASE_URL=http://host.docker.internal:11434/v1
 *   supabase secrets set EMBEDDING_MODEL=nomic-embed-text
 *   supabase secrets set EMBEDDING_DIMENSIONS=768
 *
 * For local dev add the same keys to supabase/.env.local.
 */

export type LlmProvider = 'anthropic' | 'openai'

export interface LlmConfig {
    baseUrl: string
    apiKey: string
    model: string
    temperature: number
    provider: LlmProvider
}

export interface EmbeddingConfig {
    baseUrl: string
    apiKey: string
    model: string
    dimensions: number
}

export function getLlmConfig(): LlmConfig {
    return {
        baseUrl: Deno.env.get('LLM_BASE_URL') || 'https://api.anthropic.com/v1',
        apiKey: Deno.env.get('LLM_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || '',
        model: Deno.env.get('LLM_MODEL') || 'claude-haiku-4-5-20251001',
        temperature: parseFloat(Deno.env.get('LLM_TEMPERATURE') || '0.4'),
        provider: (Deno.env.get('LLM_PROVIDER') as LlmProvider) || 'anthropic',
    }
}

export function getEmbeddingConfig(): EmbeddingConfig {
    return {
        baseUrl: Deno.env.get('EMBEDDING_BASE_URL') || 'https://api.voyageai.com/v1',
        apiKey: Deno.env.get('EMBEDDING_API_KEY') || Deno.env.get('VOYAGE_API_KEY') || '',
        model: Deno.env.get('EMBEDDING_MODEL') || 'voyage-3-lite',
        dimensions: parseInt(Deno.env.get('EMBEDDING_DIMENSIONS') || '512'),
    }
}

export function getRagConfig() {
    return {
        matchThreshold: parseFloat(Deno.env.get('RAG_MATCH_THRESHOLD') || '0.30'),
        matchCount: parseInt(Deno.env.get('RAG_MATCH_COUNT') || '18'),
    }
}

/** Per-content-type temperature and token limits for more precise generation */
export function getContentTypeConfig(contentType: string, chatMode: boolean) {
    if (chatMode) return { temperature: 0.5, max_tokens: 2500 }
    switch (contentType) {
        case 'table':   return { temperature: 0.2, max_tokens: 1500 }
        case 'diagram': return { temperature: 0.2, max_tokens: 1800 }
        default:        return { temperature: 0.3, max_tokens: 2500 }
    }
}

// ── LLM request/response helpers ──────────────────────────────────────────────

export function buildLlmHeaders(config: LlmConfig): Record<string, string> {
    if (config.provider === 'anthropic') {
        return {
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        }
    }
    return {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
    }
}

export function buildLlmEndpoint(config: LlmConfig): string {
    if (config.provider === 'anthropic') return `${config.baseUrl}/messages`
    return `${config.baseUrl}/chat/completions`
}

export function buildLlmRequestBody(
    messages: { role: string; content: string }[],
    config: LlmConfig,
    opts: { temperature: number; maxTokens: number; stream: boolean },
) {
    if (config.provider === 'anthropic') {
        const systemMsg = messages.find(m => m.role === 'system')
        const nonSystemMsgs = messages.filter(m => m.role !== 'system')
        return {
            model: config.model,
            ...(systemMsg ? { system: systemMsg.content } : {}),
            messages: nonSystemMsgs,
            max_tokens: opts.maxTokens,
            temperature: opts.temperature,
            stream: opts.stream,
        }
    }
    return {
        model: config.model,
        messages,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        stream: opts.stream,
    }
}

// deno-lint-ignore no-explicit-any
export function parseLlmResponse(data: any, provider: LlmProvider): string {
    if (provider === 'anthropic') {
        return data?.content?.[0]?.text ?? ''
    }
    return data?.choices?.[0]?.message?.content ?? ''
}

/**
 * Transform an Anthropic streaming response into OpenAI-compatible SSE format.
 * This allows the frontend to remain unchanged (it expects choices[0].delta.content).
 */
export async function pipeAnthropicStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    writer: WritableStreamDefaultWriter<Uint8Array>,
    encoder: TextEncoder,
) {
    const decoder = new TextDecoder()
    let buffer = ''

    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            // Keep the last (potentially incomplete) line in the buffer
            buffer = lines.pop() ?? ''

            for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed.startsWith('data: ')) continue

                const jsonStr = trimmed.slice(6)
                if (jsonStr === '[DONE]') {
                    await writer.write(encoder.encode('data: [DONE]\n\n'))
                    continue
                }

                try {
                    const event = JSON.parse(jsonStr)
                    if (event.type === 'content_block_delta' && event.delta?.text) {
                        // Re-emit as OpenAI-compatible SSE
                        const openAiChunk = {
                            choices: [{ delta: { content: event.delta.text } }],
                        }
                        await writer.write(
                            encoder.encode(`data: ${JSON.stringify(openAiChunk)}\n\n`),
                        )
                    } else if (event.type === 'message_stop') {
                        await writer.write(encoder.encode('data: [DONE]\n\n'))
                    }
                    // Ignore message_start, content_block_start/stop, ping
                } catch {
                    // Skip malformed JSON lines
                }
            }
        }
    } finally {
        await writer.close()
    }
}
