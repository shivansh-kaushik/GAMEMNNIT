/**
 * pathSnapping.ts
 *
 * Advanced Map Matching: Vector Projection, Temporal Smoothing (Lerp),
 * GPS Bearing Fusion, and Edge Confidence Scoring.
 *
 * Key upgrade over previous version:
 *   - `gpsBearing` (from Kalman velocity vector) is now fused with compass
 *     heading to produce a movement-aligned bearing. This makes edge selection
 *     physically accurate — it rewards edges that match where you are MOVING,
 *     not just where the phone is pointing.
 *   - When stationary (gpsBearing === -1), the system falls back to compass only.
 */

import { ARNavWaypoint } from '../ar/arNavigation';

export interface SnappedLocation {
    lat: number;
    lon: number;
    crossTrackError: number; // Distance in metres from raw GPS to snapped path
    isLocked: boolean;       // True if error is within acceptable bounds
    confidence: number;      // 0.0 to 1.0 (higher = more certain edge match)
}

function getDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const l1 = lat1 * Math.PI / 180;
    const l2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(l2);
    const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function angleDifference(a: number, b: number): number {
    const diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
}

function projectPointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
    if (l2 === 0) return { x: ax, y: ay };
    const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2));
    return { x: ax + t * (bx - ax), y: ay + t * (by - ay) };
}

/**
 * Fuse GPS bearing (Kalman velocity) with compass heading.
 *
 * Strategy:
 *   - If moving (speed > 0, gpsBearing ≥ 0): blend GPS bearing 60% + compass 40%
 *   - If stationary (gpsBearing === -1): use compass only
 *
 * This produces a heading that reflects actual movement direction when walking,
 * and falls back to device orientation when standing still.
 */
export function fusedBearing(
    compassHeading: number,
    gpsBearing: number,   // -1 = stationary
    speed: number         // m/s, 0 = stationary
): number {
    if (gpsBearing < 0 || speed < 0.5) {
        // Stationary or slow: trust compass
        return compassHeading;
    }
    // Moving: blend GPS bearing (ground truth) with compass (instantaneous)
    // Handle angle wrapping for circular mean blend:
    const diffRad = (gpsBearing - compassHeading) * Math.PI / 180;
    const diff = Math.atan2(Math.sin(diffRad), Math.cos(diffRad)) * 180 / Math.PI;
    return (compassHeading + 0.6 * diff + 360) % 360;
}

/**
 * Advanced Snap To Path with GPS bearing fusion and temporal smoothing.
 *
 * @param rawLat         Raw (or Kalman-filtered) latitude
 * @param rawLon         Raw (or Kalman-filtered) longitude
 * @param compassHeading Device compass bearing in degrees
 * @param gpsBearing     GPS velocity-derived bearing (-1 = stationary)
 * @param speed          Kalman-estimated speed in m/s
 * @param waypoints      Current route waypoints
 * @param prevSnap       Previous snap result for temporal smoothing
 * @param toleranceMeters Max cross-track error to consider "locked"
 */
export function advancedSnapToPath(
    rawLat: number,
    rawLon: number,
    compassHeading: number,
    waypoints: ARNavWaypoint[],
    prevSnap: SnappedLocation | null,
    toleranceMeters: number = 20,
    gpsBearing: number = -1,
    speed: number = 0
): SnappedLocation {
    if (!waypoints || waypoints.length < 2) {
        return { lat: rawLat, lon: rawLon, crossTrackError: 0, isLocked: false, confidence: 1.0 };
    }

    // Compute movement-aligned heading
    const effectiveHeading = fusedBearing(compassHeading, gpsBearing, speed);

    let bestSnap = { lat: rawLat, lon: rawLon };
    let minScore = Infinity;
    let bestDist = Infinity;
    let edgeConfidence = 0;

    // Evaluate next 3 segments ahead (handles intersections and slight lookahead)
    for (let i = 0; i < Math.min(3, waypoints.length - 1); i++) {
        const A = waypoints[i];
        const B = waypoints[i + 1];

        const proj = projectPointToSegment(rawLon, rawLat, A.gpsLon, A.gpsLat, B.gpsLon, B.gpsLat);
        const distToSegment = getDistanceM(rawLat, rawLon, proj.y, proj.x);

        const edgeBearing = calculateBearing(A.gpsLat, A.gpsLon, B.gpsLat, B.gpsLon);
        const headingAlignment = angleDifference(effectiveHeading, edgeBearing);

        // EDGE CONFIDENCE SCORING:
        //   distance matters most (1.0 weight)
        //   heading misalignment adds penalty (0.08 weight — reduced from 0.1
        //   because GPS bearing is now more reliable)
        //   look-ahead edges get continuity penalty
        const continuityPenalty = i > 0 ? i * 5 : 0;
        const score = distToSegment + (headingAlignment * 0.08) + continuityPenalty;

        if (score < minScore) {
            minScore = score;
            bestDist = distToSegment;
            bestSnap = { lat: proj.y, lon: proj.x };

            // Confidence: 0° alignment = 1.0, 90° = 0.0, >90° = negative clamp to 0
            edgeConfidence = Math.max(0, 1 - headingAlignment / 90);
        }
    }

    const isLocked = bestDist <= toleranceMeters;

    // PROGRESSIVE LOCK & TEMPORAL SMOOTHING (LERP)
    // Snap harder when confidence is high, pull gently when uncertain.
    let finalLat = isLocked ? bestSnap.lat : rawLat;
    let finalLon = isLocked ? bestSnap.lon : rawLon;

    if (prevSnap && isLocked) {
        // High confidence = 60% jump. Low confidence = 10% gentle pull.
        const lerpFactor = 0.1 + edgeConfidence * 0.5;
        finalLat = prevSnap.lat + (finalLat - prevSnap.lat) * lerpFactor;
        finalLon = prevSnap.lon + (finalLon - prevSnap.lon) * lerpFactor;
    }

    return {
        lat: finalLat,
        lon: finalLon,
        crossTrackError: bestDist,
        isLocked,
        confidence: edgeConfidence,
    };
}
