/**
 * llmClient.ts — OpenAI Chat Completions API client
 * Sends queries to GPT-4o-mini (fast + cheap, ideal for real-time nav queries).
 * Drop-in replacement for the previous Gemini client.
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

// Gemini used a 'model' role — OpenAI uses 'assistant'. Map on the way out.
export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export interface LLMResponse {
    text: string;
    ok: boolean;
    error?: string;
}

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 15000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Convert Gemini-format messages to OpenAI format */
function toOpenAIMessages(messages: ChatMessage[], systemPrompt: string) {
    const result: { role: string; content: string }[] = [
        { role: 'system', content: systemPrompt }
    ];
    for (const m of messages) {
        result.push({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.parts.map(p => p.text).join('')
        });
    }
    return result;
}

export async function queryLLM(messages: ChatMessage[], systemPrompt: string, maxRetries = 2): Promise<LLMResponse> {
    if (!OPENAI_API_KEY) {
        return {
            text: '',
            ok: false,
            error: 'OpenAI API Key missing. Please add VITE_OPENAI_API_KEY to your .env file.'
        };
    }

    let attempt = 0;

    while (attempt <= maxRetries) {
        try {
            const response = await fetchWithTimeout(OPENAI_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: toOpenAIMessages(messages, systemPrompt),
                    temperature: 0.2,
                    max_tokens: 1024,
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'OpenAI API Error');
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content ?? '';

            return { text, ok: true };

        } catch (err: any) {
            attempt++;
            console.error(`OpenAI Query Attempt ${attempt} Failed:`, err);

            if (attempt > maxRetries) {
                return {
                    text: '',
                    ok: false,
                    error: err.message === 'The user aborted a request.'
                        ? 'Request timed out. Please check your connection.'
                        : (err.message || 'Failed to connect to OpenAI.')
                };
            }
            await wait(1000 * Math.pow(2, attempt - 1));
        }
    }

    return { text: '', ok: false, error: 'Unknown terminal error' };
}
