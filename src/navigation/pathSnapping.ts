/**
 * pathSnapping.ts
 * Implements Vector Projection to map a noisy GPS coordinate onto the nearest 
 * segment of the planned A* route. This provides "Path Snapping" for Level 1 
 * AR Navigation safety and stability.
 */

import { ARNavWaypoint } from '../ar/arNavigation';

export interface SnappedLocation {
    lat: number;
    lon: number;
    crossTrackError: number; // Distance in meters from raw GPS to snapped path
    isLocked: boolean;       // True if error is within acceptable bounds
}

// Haversine distance in meters
function getDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Projects Point P onto Line Segment AB.
 * Returns the projected point and whether it falls exactly onto the segment bounds.
 */
function projectPointToSegment(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number
): { x: number, y: number, clamped: boolean } {
    const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
    if (l2 === 0) return { x: ax, y: ay, clamped: true };

    let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
    t = Math.max(0, Math.min(1, t));

    return {
        x: ax + t * (bx - ax),
        y: ay + t * (by - ay),
        clamped: t === 0 || t === 1
    };
}

/**
 * Finds the closest point on the active route to the user's raw GPS.
 * Evaluates the segment between the user's current assumed node and the next node.
 */
export function snapToPath(
    rawLat: number, rawLon: number, 
    waypoints: ARNavWaypoint[],
    toleranceMeters: number = 15 // If drift > 15m, path lock fails
): SnappedLocation {
    if (!waypoints || waypoints.length < 2) {
        return { lat: rawLat, lon: rawLon, crossTrackError: 0, isLocked: false };
    }

    // Usually, we only need to snap to the segment heading towards the *next* waypoint.
    // However, if the user backtracks slightly, we check the first 2 segments.
    let bestSnap = { lat: rawLat, lon: rawLon };
    let minError = Infinity;

    for (let i = 0; i < Math.min(2, waypoints.length - 1); i++) {
        const A = waypoints[i];
        const B = waypoints[i+1];

        // Project raw lon/lat onto AB line
        const proj = projectPointToSegment(rawLon, rawLat, A.gpsLon, A.gpsLat, B.gpsLon, B.gpsLat);
        
        const dist = getDistanceM(rawLat, rawLon, proj.y, proj.x);
        if (dist < minError) {
            minError = dist;
            bestSnap = { lat: proj.y, lon: proj.x };
        }
    }

    // If drift is catastrophic, break the lock
    const isLocked = minError <= toleranceMeters;

    return {
        lat: isLocked ? bestSnap.lat : rawLat,
        lon: isLocked ? bestSnap.lon : rawLon,
        crossTrackError: minError,
        isLocked: isLocked
    };
}
