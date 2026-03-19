/**
 * voiceGuidance.ts
 * Continuous live-navigation loop that:
 *  1. Reads GPS + compass every 2 s
 *  2. Generates a structured NavInstruction via directionGenerator
 *  3. Enriches it with natural language via Ollama (or falls back to rule-based)
 *  4. Speaks it via SpeechSynthesis if the instruction changed
 *
 * Completely decoupled from the AR rendering and A* engine.
 * Subscribe / unsubscribe pattern — no global state pollution.
 */

import { ARNavWaypoint } from '../ar/arNavigation';
import { generateInstruction, instructionToText, NavInstruction } from './directionGenerator';
import { queryLLM } from './llmClient';
import { speak } from './voiceInput';

export type GuidanceUpdateCallback = (text: string, instruction: NavInstruction) => void;

interface GuidanceSession {
    stop: () => void;
}

/**
 * Build an LLM prompt that converts a structured instruction into natural language.
 */
function buildGuidancePrompt(ins: NavInstruction): string {
    return `Convert this navigation instruction into a short, friendly spoken direction (1 sentence only, no extra text):
distance: ${ins.distance} meters
action: ${ins.action}`;
}

/**
 * Start the continuous guidance loop.
 * @param getState   Callback to get the latest [lat, lon, heading, waypoints] from ARPage
 * @param onUpdate   Callback called each cycle with the spoken text + raw instruction
 * @returns          { stop } — call stop() to cancel the loop
 */
export function startVoiceGuidance(
    getState: () => { lat: number; lon: number; heading: number; waypoints: ARNavWaypoint[] },
    onUpdate: GuidanceUpdateCallback
): GuidanceSession {
    let running = true;
    let lastAction = '';
    let lastDistance = -1;

    const tick = async () => {
        if (!running) return;

        const { lat, lon, heading, waypoints } = getState();
        if (waypoints.length === 0) {
            setTimeout(tick, 2000);
            return;
        }

        const instruction = generateInstruction(lat, lon, heading, waypoints);

        // Only update if action or distance changed meaningfully (≥5 m)
        const distChanged = Math.abs(instruction.distance - lastDistance) >= 5;
        const actionChanged = instruction.action !== lastAction;

        if (actionChanged || distChanged) {
            lastAction = instruction.action;
            lastDistance = instruction.distance;

            // Rule-based text as immediate fallback
            let text = instructionToText(instruction);

            // Try to enrich with LLM
            const llmResult = await queryLLM(
                [{ role: 'user', parts: [{ text: buildGuidancePrompt(instruction) }] }],
                'You are a navigation assistant. Convert the instruction into a single short spoken sentence.'
            );
            if (llmResult.ok && llmResult.text.trim().length > 5) {
                text = llmResult.text.trim();
            }

            speak(text);
            onUpdate(text, instruction);

            if (instruction.action === 'arrived') {
                running = false;
                return;
            }
        }

        if (running) setTimeout(tick, 2000);
    };

    // Start with a short initial delay
    setTimeout(tick, 1500);

    return {
        stop: () => { running = false; }
    };
}
