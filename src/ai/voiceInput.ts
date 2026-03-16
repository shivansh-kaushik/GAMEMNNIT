/**
 * voiceInput.ts — Web Speech API wrapper
 * Provides a simple startListening() / stopListening() interface.
 */

export type VoiceCallback = (transcript: string) => void;
export type VoiceErrorCallback = (error: string) => void;

// Use `any` type references to avoid TypeScript errors when lib.dom doesn't include
// the experimental SpeechRecognition types. This is safe at runtime.
let recognition: any = null;

export function isSpeechAvailable(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function startListening(
    onResult: VoiceCallback,
    onError: VoiceErrorCallback
): void {
    if (!isSpeechAvailable()) {
        onError('Voice search is not supported in this browser.');
        return;
    }

    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'en-IN'; // Prefer Indian English
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: any) => {
        const transcript: string = e.results[0][0].transcript.trim();
        onResult(transcript);
    };

    recognition.onerror = (e: any) => {
        onError(`Voice error: ${e.error}`);
    };

    recognition.start();
}

export function stopListening(): void {
    recognition?.stop();
    recognition = null;
}

/** Browser TTS — speak a navigation instruction aloud */
export function speak(text: string): void {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.lang = 'en-IN';
    window.speechSynthesis.speak(utt);
}
