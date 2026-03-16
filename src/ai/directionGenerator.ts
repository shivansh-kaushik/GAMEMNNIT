/**
 * directionGenerator.ts
 * Converts live GPS position + waypoint list into a structured navigation instruction.
 * Does NOT modify the A* engine or AR rendering — purely a data transformer.
 */

import { ARNavWaypoint } from '../ar/arNavigation';

export type NavAction = 'walk_straight' | 'turn_left' | 'turn_right' | 'arrived';

export interface NavInstruction {
    action: NavAction;
    distance: number;       // metres to next waypoint
    bearing: number;        // compass bearing to next waypoint (degrees)
    headingDelta: number;   // difference vs current device heading (negative = left, positive = right)
}

const ARRIVED_THRESHOLD_M = 8; // within 8 m → arrived

/**
 * Compute the bearing in degrees from point A to point B.
 */
function bearingTo(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const la1 = (lat1 * Math.PI) / 180;
    const la2 = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(la2);
    const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Euclidean distance in metres between two GPS coordinates.
 */
function distMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dx = (lon2 - lon1) * Math.cos((lat1 * Math.PI) / 180) * 111320;
    const dy = (lat2 - lat1) * 110540;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Given the user's current GPS position, compass heading, and the ordered waypoints,
 * return the next NavigationInstruction.
 */
export function generateInstruction(
    currentLat: number,
    currentLon: number,
    currentHeading: number,     // degrees, 0=North
    waypoints: ARNavWaypoint[]
): NavInstruction {
    if (waypoints.length === 0) {
        return { action: 'arrived', distance: 0, bearing: 0, headingDelta: 0 };
    }

    // Find the nearest upcoming waypoint (simple sequential: first one > threshold)
    let targetWp = waypoints[waypoints.length - 1]; // default to last
    for (const wp of waypoints) {
        const d = distMetres(currentLat, currentLon,
            currentLat + wp.z / 110540, currentLon + wp.x / 111320);
        if (d > ARRIVED_THRESHOLD_M) {
            targetWp = wp;
            break;
        }
    }

    // Reconstruct target GPS from world-space offset stored in waypoint
    const targetLat = currentLat + targetWp.z / 110540;
    const targetLon = currentLon + targetWp.x / 111320;

    const dist = distMetres(currentLat, currentLon, targetLat, targetLon);

    if (dist < ARRIVED_THRESHOLD_M) {
        return { action: 'arrived', distance: 0, bearing: 0, headingDelta: 0 };
    }

    const bearing = bearingTo(currentLat, currentLon, targetLat, targetLon);
    let headingDelta = bearing - currentHeading;

    // Normalize to [-180, 180]
    if (headingDelta > 180) headingDelta -= 360;
    if (headingDelta < -180) headingDelta += 360;

    let action: NavAction;
    if (Math.abs(headingDelta) < 20) {
        action = 'walk_straight';
    } else if (headingDelta < 0) {
        action = 'turn_left';
    } else {
        action = 'turn_right';
    }

    return { action, distance: Math.round(dist), bearing, headingDelta };
}

/** 
 * Convert a NavInstruction to a short string suitable for TTS / LLM enrichment.
 * This rule-based fallback is always available even when Ollama is offline.
 */
export function instructionToText(ins: NavInstruction): string {
    switch (ins.action) {
        case 'arrived':
            return 'You have reached your destination.';
        case 'walk_straight':
            return `Walk straight for about ${ins.distance} meters.`;
        case 'turn_left':
            return `Turn left, then walk ${ins.distance} meters.`;
        case 'turn_right':
            return `Turn right, then walk ${ins.distance} meters.`;
        default:
            return `Continue for ${ins.distance} meters.`;
    }
}
