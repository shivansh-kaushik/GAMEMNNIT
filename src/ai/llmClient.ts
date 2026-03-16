/**
 * llmClient.ts — Google Gemini LLM API client
 * Sends a query to the Gemini 1.5 Flash API.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface LLMResponse {
    text: string;
    ok: boolean;
    error?: string;
}

export async function queryLLM(prompt: string): Promise<LLMResponse> {
    if (!GEMINI_API_KEY) {
        return {
            text: '',
            ok: false,
            error: 'Gemini API Key missing. Please add VITE_GEMINI_API_KEY to your .env file.'
        };
    }

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
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
        console.error('Gemini Query Failed:', err);
        return {
            text: '',
            ok: false,
            error: err.message || 'Failed to connect to Gemini.'
        };
    }
}
