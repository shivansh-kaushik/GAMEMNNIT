/**
 * arNavigation.ts — A* path adapter for AR mode.
 * Converts the existing graph-based navigation path into AR world-space waypoints.
 * Uses the road graph (mnnit_paths.json) via A* — NOT straight-line interpolation.
 */

import { gpsToARWorld, ARWorldPoint } from './arEngine';
import { CAMPUS_BUILDINGS } from '../navigation/buildings';
import { buildGraphFromGeoJSON } from '../navigation/graphGenerator';
import { aStar } from '../navigation/astar';
import { findNearestGraphNode } from '../navigation/nodeMatcher';
import { latLngToVoxel } from '../core/GISUtils';
import pathData from '../data/mnnit_paths.json';

export interface ARNavWaypoint extends ARWorldPoint {
    distFromPrev: number;
    totalDist: number;
    label?: string;
    gpsLat: number;
    gpsLon: number;
}

// Build graph once at module level (singleton)
const _graph = buildGraphFromGeoJSON(pathData);

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dx = (lon2 - lon1) * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180) * 111320;
    const dz = (lat2 - lat1) * 110540;
    return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Generate AR navigation waypoints between current GPS and a destination.
 * Uses A* over the campus road graph — follows real roads, NOT straight lines.
 */
export function buildARPath(
    startLat: number, startLon: number,
    destId: string,
    spacingMeters = 5
): ARNavWaypoint[] {
    const dest = CAMPUS_BUILDINGS.find(b => b.id === destId);
    if (!dest) return [];

    // 1. Convert start + destination to voxel space (used by the graph)
    const startVoxel = latLngToVoxel(startLat, startLon);
    const destVoxel  = latLngToVoxel(dest.latitude, dest.longitude);

    // 2. Snap both ends to nearest graph nodes
    const startNodeId = findNearestGraphNode(startVoxel[0], startVoxel[2], _graph.nodes);
    const destNodeId  = findNearestGraphNode(destVoxel[0],  destVoxel[2],  _graph.nodes);

    if (!startNodeId || !destNodeId) {
        // Graph not loaded / empty — graceful fallback to straight line
        return buildStraightLine(startLat, startLon, dest, spacingMeters);
    }

    // 3. Run A* over the road graph
    const pathNodeIds = aStar(startNodeId, destNodeId, _graph.nodes, _graph.edges);

    if (pathNodeIds.length === 0) {
        // A* returned no path — fallback
        return buildStraightLine(startLat, startLon, dest, spacingMeters);
    }

    // 4. Convert graph node IDs → GPS lat/lon waypoints
    const waypoints: ARNavWaypoint[] = [];
    let accumulated = 0;
    let prevLat = startLat;
    let prevLon = startLon;

    // Ensure the first waypoint is exactly the user's current position
    waypoints.push({
        ...gpsToARWorld(startLat, startLon, startLat, startLon),
        distFromPrev: 0,
        totalDist: 0, // will be recalculated below
        gpsLat: startLat,
        gpsLon: startLon
    });

    for (let i = 0; i < pathNodeIds.length; i++) {
        const node = _graph.nodes[pathNodeIds[i]];
        if (!node) continue;

        const nodeLat = node.lat;
        const nodeLon = node.lng;

        const dist = haversineMeters(prevLat, prevLon, nodeLat, nodeLon);
        accumulated += dist;

        waypoints.push({
            ...gpsToARWorld(nodeLat, nodeLon, startLat, startLon),
            distFromPrev: dist,
            totalDist: 0, // recalculated below
            label: i === pathNodeIds.length - 1 ? dest.name : undefined,
            gpsLat: nodeLat,
            gpsLon: nodeLon
        });

        prevLat = nodeLat;
        prevLon = nodeLon;
    }

    // Ensure we end exactly at the destination building's GPS
    const lastDist = haversineMeters(prevLat, prevLon, dest.latitude, dest.longitude);
    if (lastDist > 2) {
        waypoints.push({
            ...gpsToARWorld(dest.latitude, dest.longitude, startLat, startLon),
            distFromPrev: lastDist,
            totalDist: 0,
            label: dest.name,
            gpsLat: dest.latitude,
            gpsLon: dest.longitude
        });
        accumulated += lastDist;
    }

    // Fill in totalDist (remaining distance from each waypoint to the end)
    let remaining = accumulated;
    for (const wp of waypoints) {
        remaining -= wp.distFromPrev;
        (wp as any).totalDist = Math.max(0, remaining);
    }

    return waypoints;
}

/** Fallback: simple straight-line interpolation (only used if graph is empty) */
function buildStraightLine(
    startLat: number, startLon: number,
    dest: { latitude: number; longitude: number; name: string },
    spacingMeters: number
): ARNavWaypoint[] {
    const dx = (dest.longitude - startLon) * Math.cos((startLat * Math.PI) / 180) * 111320;
    const dz = (dest.latitude  - startLat) * 110540;
    const totalDist = Math.sqrt(dx * dx + dz * dz);
    const steps = Math.max(2, Math.ceil(totalDist / spacingMeters));
    const waypoints: ARNavWaypoint[] = [];
    let accumulated = 0;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat = startLat + t * (dest.latitude  - startLat);
        const lon = startLon + t * (dest.longitude - startLon);
        const dist = i === 0 ? 0 : spacingMeters;
        accumulated += dist;
        waypoints.push({
            ...gpsToARWorld(lat, lon, startLat, startLon),
            distFromPrev: dist,
            totalDist: totalDist - accumulated,
            label: i === steps ? dest.name : undefined,
            gpsLat: lat,
            gpsLon: lon
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
    return haversineMeters(lat, lon, dest.latitude, dest.longitude);
}
