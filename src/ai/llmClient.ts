/**
 * llmClient.ts — Google Gemini LLM API client
 * Sends a query to the Gemini 1.5 Flash API.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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

export async function queryLLM(messages: ChatMessage[], systemPrompt: string, maxRetries = 2): Promise<LLMResponse> {
    if (!GEMINI_API_KEY) {
        return {
            text: '',
            ok: false,
            error: 'Gemini API Key missing. Please add VITE_GEMINI_API_KEY to your .env file.'
        };
    }

    let attempt = 0;
    
    while (attempt <= maxRetries) {
        try {
            const response = await fetchWithTimeout(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: messages,
                    generationConfig: {
                        temperature: 0.2, // Slightly higher for natural chat, but keep low for strict JSON outputs
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Gemini API Error');
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

            return { text, ok: true };
            
        } catch (err: any) {
            attempt++;
            console.error(`Gemini Query Attempt ${attempt} Failed:`, err);
            
            if (attempt > maxRetries) {
                return {
                    text: '',
                    ok: false,
                    error: err.message === 'The user aborted a request.' 
                        ? 'Request timed out. Please check your connection.' 
                        : (err.message || 'Failed to connect to Gemini.')
                };
            }
            // Exponential backoff
            await wait(1000 * Math.pow(2, attempt - 1));
        }
    }
    
    return { text: '', ok: false, error: 'Unknown terminal error' };
}
