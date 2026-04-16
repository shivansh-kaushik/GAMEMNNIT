// src/ai/voiceGuidance.ts
/**
 * voiceGuidance.ts
 * Contextual and Stateful Live Navigation loop.
 * Integrates EMA GPS Smoothing -> Haversine Bearing -> Graph Context -> Output.
 */

import { ARNavWaypoint } from '../ar/arNavigation';
import { smoothGPS, Position, resetGPSFilter } from '../sensors/smoothGPS';
import { haversineBearing, haversineDistance, relativeDirection } from '../navigation/bearing';
import { shouldSpeak, resetVoiceState } from '../navigation/voiceTrigger';
import { buildVoiceInstruction, GraphNode } from '../navigation/directions';
import { getProximityAlert } from '../navigation/contextualAwareness';
import { queryLLM } from './llmClient';
import { speak } from './voiceInput';

// Mock structure conversion to bind ARNavWaypoint to GraphNode generically
function mapARToGraphNode(wp: ARNavWaypoint): GraphNode {
    return {
        id: wp.x + '_' + wp.z, 
        lat: wp.lat || 0, // Fallback if lat not dynamically synced over
        lon: wp.lon || 0,
        type: wp.type as any,
        label: wp.label
    };
}

export type GuidanceUpdateCallback = (text: string) => void;

interface GuidanceSession {
    stop: () => void;
}

export function startVoiceGuidance(
    getState: () => { lat: number; lon: number; heading: number; waypoints: ARNavWaypoint[] },
    onUpdate: GuidanceUpdateCallback
): GuidanceSession {
    let running = true;
    let currentWaypointIndex = 0;

    resetVoiceState();
    resetGPSFilter();

    const tick = async () => {
        if (!running) return;

        const { lat, lon, heading, waypoints } = getState();
        if (waypoints.length === 0 || currentWaypointIndex >= waypoints.length) {
            setTimeout(tick, 2000);
            return;
        }

        // 1. Process GPS Smoothing
        const rawPos: Position = { lat, lon };
        const pos = smoothGPS(rawPos);

        // Verify bounds. If the system hasn't populated true GPS back to Waypoints, skip math
        // (Assuming waypoints have valid lat/lon. If not, use approximation conversion logic here natively)
        
        // Convert world-space offsets back to GPS roughly (MNNIT local approximation used originally)
        const waypointsGPSMapped = waypoints.map(wp => ({
            id: String(wp.x) + '_' + String(wp.z),
            lat: wp.lat || (lat + wp.z / 110540),
            lon: wp.lon || (lon + wp.x / 111320),
            type: wp.type as any,
            label: wp.label
        }));

        // 2. Get Next Sequence bounds
        const nextWaypoint = waypointsGPSMapped[currentWaypointIndex];
        const waypointAfter = waypointsGPSMapped[currentWaypointIndex + 1];

        // 3. Mathematical Heading vs Path Mapping
        const bearing = haversineBearing(pos, nextWaypoint);
        const direction = relativeDirection(heading, bearing);
        const distance = haversineDistance(pos, nextWaypoint);

        // 4. Graph Structure Parsing
        const upcomingNodes = waypointsGPSMapped.slice(currentWaypointIndex);
        const proximityAlert = getProximityAlert(pos, upcomingNodes);

        // 5. Instruction Assembly Priority (Context > Math)
        let instruction = "";
        
        if (proximityAlert) {
            instruction = proximityAlert;
        } else {
            instruction = buildVoiceInstruction(direction, distance, nextWaypoint, waypointAfter);
        }

        // 6. Gated State Trigger (Replaces polling blast)
        if (shouldSpeak(currentWaypointIndex, distance, instruction)) {
            
            // Allow LLM override if configured/fast enough, else drop right to Speech
            // Using direct TTS for latency, background async for UI
            speak(instruction); 
            onUpdate(instruction);
            
            // Asynchronously request LLM to flavor the UI output
            queryLLM([{ role: 'user', parts: [{ text: `Convert this navigation instruction into a short, friendly spoken direction: ${instruction}` }]}], 'You are a navigation assistant.')
            .then(res => {
                if(res.ok && res.text.trim().length > 5) {
                    onUpdate(res.text.trim());
                }
            }).catch(() => {});
        }

        // 7. Loop Progression checks
        if (distance < 8) {
            currentWaypointIndex++;
        }

        if (running) {
             // 1000ms polling allows fast reaction while voiceState prevents spam
             setTimeout(tick, 1000);
        }
    };

    setTimeout(tick, 1000);

    return {
        stop: () => { running = false; }
    };
}
