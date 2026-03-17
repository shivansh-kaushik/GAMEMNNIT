/**
 * intentParser.ts — Extracts navigation intent from LLM response.
 * Also provides a basic rule-based fallback if LLM is unavailable.
 */

import { CAMPUS_BUILDINGS } from '../navigation/buildings';
import { ARSensors } from '../ar/arEngine';

export interface NavIntent {
    intent: 'navigate' | 'info' | 'unknown';
    destinationId?: string;
    destinationName?: string;
    reply?: string;
}

/** Parse a JSON-format LLM response (best case) */
function tryParseJSON(text: string, originalQuery: string): NavIntent | null {
    try {
        // Extract JSON block
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const json = JSON.parse(jsonMatch[0]);
        const conversationalReply = text.split(jsonMatch[0])[0].trim();

        if (json.intent === 'navigate' && json.destination) {
            const match = matchDestination(json.destination);
            if (match.intent === 'navigate') {
                return { ...match, reply: conversationalReply || match.reply };
            }
        }

        if (json.intent === 'info' && json.reply) {
            return { intent: 'info', reply: json.reply };
        }

        if (json.intent === 'unknown') {
            return { intent: 'unknown', reply: conversationalReply || "This location is not in the campus database." };
        }
    } catch { /* ignore */ }
    return null;
}

/** Fuzzy match a destination string to a known campus building */
function matchDestination(query: string): NavIntent {
    const q = query.toLowerCase();
    const stopWords = ['of', 'and', 'the', 'in', 'at', 'with', 'to', 'for', 'building', 'block', 'dept'];

    // 1. Precise ID match
    const preciseMatch = CAMPUS_BUILDINGS.find(b => q.includes(b.id.replace('_', ' ')));
    if (preciseMatch) return createNavIntent(preciseMatch);

    // 2. Word-by-word match, ignoring generic terms
    const match = CAMPUS_BUILDINGS.find(b => {
        const nameParts = b.name.toLowerCase().split(/[(\s)/,.\-]+/).filter(w => w.length > 2 && !stopWords.includes(w));
        return nameParts.some(w => q.includes(w));
    });

    if (match) return createNavIntent(match);

    return { intent: 'unknown', reply: 'This location is not in the campus database.' };
}

function createNavIntent(match: any): NavIntent {
    return {
        intent: 'navigate',
        destinationId: match.id,
        destinationName: match.name,
        reply: `Navigating to ${match.name}.`
    };
}

/** Build the LLM system prompt for navigation intent extraction */
export function buildNavigationPrompt(sensors: ARSensors | null, activeDestId: string | null): string {
    const buildingList = CAMPUS_BUILDINGS
        .map(b => `"${b.name}"`)
        .join(', ');

    let contextStr = "User's current location is UNKNOWN (GPS not locked).";
    if (sensors) {
        contextStr = `User's current location: GPS(${sensors.gpsLat.toFixed(5)}, ${sensors.gpsLon.toFixed(5)}). Compass Heading: ${Math.round(sensors.compassBearing)}°.`;
    }
    
    let destStr = "The user is not currently navigating anywhere.";
    if (activeDestId) {
        const destName = CAMPUS_BUILDINGS.find(b => b.id === activeDestId)?.name || activeDestId;
        destStr = `The user is CURRENTLY navigating to: ${destName}.`;
    }

    return `You are an AI navigation assistant for the MNNIT Allahabad Smart Campus Navigation System.
Your purpose is to help users navigate the campus efficiently and answer questions related to campus locations.

LIVE CONTEXT:
- ${contextStr}
- ${destStr}

Rules:
1. ONLY answer questions related to: Campus navigation, Buildings, Departments, Hostels, Gates, Facilities, Paths and routes, Campus services.
2. If a user asks something unrelated to campus navigation, respond EXACTLY with: "I can only assist with MNNIT campus navigation."
3. Use the provided campus location dataset for coordinates. Use the LIVE CONTEXT to answer relative questions like "where am I" or "what is in front of me".
4. When a user asks for directions or to go somewhere:
   * You MUST identify the place from the dataset.
   * You MUST include the coordinates (latitude and longitude) in your conversational response.
   * You MUST also provide the JSON block at the end.
5. If the destination is unknown, respond: "This location is not in the campus database."
6. Keep responses concise but include the requested coordinates.

Available Dataset:
- Library: latitude: 25.49268, longitude: 81.86355
- CSED Building: latitude: 25.49240, longitude: 81.86370
- Admin Building: latitude: 25.49210, longitude: 81.86330
- Main Gate: latitude: 25.49150, longitude: 81.86300
- Hostel Area: latitude: 25.49310, longitude: 81.86420
- ${buildingList}

Example interaction:
User: "Where is the library?"
Assistant: "The Central Library is located at (25.49268, 81.86355). You can use the AR navigation to get there. {"intent":"navigate","destination":"CENTRAL LIBRARY (GF)"}"

First, provide your helpful conversational response. 
Then, provide a JSON block for system integration at the VERY END:
{"intent":"navigate","destination":"<exact building name>"} OR {"intent":"info","reply":"<your conversational response>"} OR {"intent":"unknown"}`;
}

/** Main entry-point: parse LLM response text into a NavIntent */
export function parseIntent(llmText: string, originalQuery: string): NavIntent {
    // 1. Try to parse JSON from LLM
    const parsed = tryParseJSON(llmText, originalQuery);
    if (parsed) return parsed;

    // 2. Check for hard refusal
    if (llmText.toLowerCase().includes("only assist with mnnit campus navigation")) {
        return { intent: 'unknown', reply: "I can only assist with MNNIT campus navigation." };
    }

    // 3. Fallback to fuzzy matching the original query only if it looks like a navigation request
    const navKeywords = ['navigate', 'take me', 'where is', 'show me', 'go to', 'directions'];
    const looksLikeNav = navKeywords.some(k => originalQuery.toLowerCase().includes(k));

    if (looksLikeNav) {
        return matchDestination(originalQuery);
    }

    return { intent: 'unknown', reply: "I can only assist with MNNIT campus navigation." };
}
