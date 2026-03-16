/**
 * arNavigation.ts — A* path adapter for AR mode.
 * Converts the existing graph-based navigation path into AR world-space waypoints.
 */

import { gpsToARWorld, ARWorldPoint } from './arEngine';
import { CAMPUS_BUILDINGS } from '../navigation/buildings';

export interface ARNavWaypoint extends ARWorldPoint {
    distFromPrev: number;
    totalDist: number;
    label?: string;
}

/**
 * Generate AR navigation waypoints between two GPS points.
 * Samples every ~5 metres along the straight-line path.
 * In production this would consume the full A* path edge list.
 */
export function buildARPath(
    startLat: number, startLon: number,
    destId: string,
    spacingMeters = 5
): ARNavWaypoint[] {
    const dest = CAMPUS_BUILDINGS.find(b => b.id === destId);
    if (!dest) return [];

    // Total distance in metres (Euclidean on GPS plane)
    const dx = (dest.longitude - startLon) * Math.cos((startLat * Math.PI) / 180) * 111320;
    const dz = (dest.latitude - startLat) * 110540;
    const totalDist = Math.sqrt(dx * dx + dz * dz);

    const steps = Math.max(2, Math.ceil(totalDist / spacingMeters));
    const waypoints: ARNavWaypoint[] = [];
    let accumulated = 0;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat = startLat + t * (dest.latitude - startLat);
        const lon = startLon + t * (dest.longitude - startLon);
        const wp = gpsToARWorld(lat, lon, startLat, startLon);

        const dist = i === 0 ? 0 : spacingMeters;
        accumulated += dist;

        waypoints.push({
            ...wp,
            distFromPrev: dist,
            totalDist: totalDist - accumulated,
            label: i === steps ? dest.name : undefined
        });
    }

    return waypoints;
}

/** Remaining distance in metres from current GPS to destination */
export function remainingDistance(
    lat: number, lon: number,
    destId: string
): number {
    const dest = CAMPUS_BUILDINGS.find(b => b.id === destId);
    if (!dest) return 0;
    const dx = (dest.longitude - lon) * Math.cos((lat * Math.PI) / 180) * 111320;
    const dz = (dest.latitude - lat) * 110540;
    return Math.sqrt(dx * dx + dz * dz);
}
