/**
 * pathSnapping.ts
 * Advanced Map Matching: Vector Projection, Temporal Smoothing (Lerp),
 * and Edge Confidence Scoring to resolve intersection ambiguity and prevent
 * aggressive over-constraining.
 */

import { ARNavWaypoint } from '../ar/arNavigation';

export interface SnappedLocation {
    lat: number;
    lon: number;
    crossTrackError: number; // Distance in meters from raw GPS to snapped path
    isLocked: boolean;       // True if error is within acceptable bounds
    confidence: number;      // 0.0 to 1.0 (Higher means surer edge match)
}

function getDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/** Calculate absolute bearing between two GPS points */
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const l1 = lat1 * Math.PI / 180;
    const l2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(l2);
    const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/** Differences in angles wrapping 360 */
function angleDifference(a: number, b: number): number {
    const diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
}

/** Vector projection of Point P onto Segment AB */
function projectPointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
    if (l2 === 0) return { x: ax, y: ay, clamped: true };
    let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
    t = Math.max(0, Math.min(1, t));
    return { x: ax + t * (bx - ax), y: ay + t * (by - ay), clamped: t === 0 || t === 1 };
}

/**
 * Advanced Snap To Path
 * @param userHeading - Device compass heading
 * @param prevSnap - The previous SnappedLocation (for temporal smoothing)
 */
export function advancedSnapToPath(
    rawLat: number, rawLon: number, 
    userHeading: number,
    waypoints: ARNavWaypoint[],
    prevSnap: SnappedLocation | null,
    toleranceMeters: number = 20
): SnappedLocation {
    if (!waypoints || waypoints.length < 2) {
        return { lat: rawLat, lon: rawLon, crossTrackError: 0, isLocked: false, confidence: 1.0 };
    }

    let bestSnap = { lat: rawLat, lon: rawLon };
    let minScore = Infinity; // We want lowest score
    let bestDist = Infinity;
    let edgeConfidence = 0;

    // Evaluate the first 3 segments ahead to handle intersections
    for (let i = 0; i < Math.min(3, waypoints.length - 1); i++) {
        const A = waypoints[i];
        const B = waypoints[i+1];

        const proj = projectPointToSegment(rawLon, rawLat, A.gpsLon, A.gpsLat, B.gpsLon, B.gpsLat);
        const distToSegment = getDistanceM(rawLat, rawLon, proj.y, proj.x);

        const edgeBearing = calculateBearing(A.gpsLat, A.gpsLon, B.gpsLat, B.gpsLon);
        const headingAlignment = angleDifference(userHeading, edgeBearing);

        // EDGE CONFIDENCE SCORING
        // Distance is heavily weighted (1.0), heading misalignment adds penalty (0.1)
        // Previous edge continuity: if we snap to the 2nd edge (index 1) but haven't reached it, small penalty.
        const continuityPenalty = (i > 0) ? (i * 5) : 0;
        const score = distToSegment + (headingAlignment * 0.1) + continuityPenalty;

        if (score < minScore) {
            minScore = score;
            bestDist = distToSegment;
            bestSnap = { lat: proj.y, lon: proj.x };
            
            // Confidence calculation based on heading alignment (0 diff = 1.0, 90 diff = 0.0)
            edgeConfidence = Math.max(0, 1 - (headingAlignment / 90));
        }
    }

    const isLocked = bestDist <= toleranceMeters;

    // PROGRESSIVE LOCK & TEMPORAL SMOOTHING
    // Instead of instantly jumping from GPS 1 -> GPS 2, we LERP (Linear Interpolate) 
    // the target lock. If confidence is high, snap harder. If low, pull gently.
    let finalLat = isLocked ? bestSnap.lat : rawLat;
    let finalLon = isLocked ? bestSnap.lon : rawLon;

    if (prevSnap && isLocked) {
        // High confidence = 60% jump towards path. Low confidence = 10% jump (slow pull)
        const lerpFactor = 0.1 + (edgeConfidence * 0.5); 
        finalLat = prevSnap.lat + (finalLat - prevSnap.lat) * lerpFactor;
        finalLon = prevSnap.lon + (finalLon - prevSnap.lon) * lerpFactor;
    }

    return {
        lat: finalLat,
        lon: finalLon,
        crossTrackError: bestDist,
        isLocked: isLocked,
        confidence: edgeConfidence
    };
}
