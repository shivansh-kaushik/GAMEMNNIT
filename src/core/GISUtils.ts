/**
 * GIS utilities for MNNIT Voxel Campus
 * Handles conversion between WGS84 (Lat/Long) and local Voxel coordinates.
 */

// MNNIT Allahabad Center Coordinates
export const MNNIT_CENTER = {
    lat: 25.494677,
    lng: 81.864779
};

// Voxel scale: 1 voxel = 1 meter approx.
// At this latitude, 1 degree lat is ~111,320m
// 1 degree lng is ~111,320 * cos(lat)
const METERS_PER_DEGREE_LAT = 111320;
const METERS_PER_DEGREE_LNG = METERS_PER_DEGREE_LAT * Math.cos(MNNIT_CENTER.lat * Math.PI / 180);

/**
 * Converts Lat/Long to local Voxel [x, y, z]
 * (x increases East, z increases South)
 */
export function latLngToVoxel(lat: number, lng: number): [number, number, number] {
    const dx = (lng - MNNIT_CENTER.lng) * METERS_PER_DEGREE_LNG;
    const dz = (MNNIT_CENTER.lat - lat) * METERS_PER_DEGREE_LAT;

    // Offset by some world center if needed. 
    // Let's assume MNNIT_CENTER is at [25, 0, 25] in our voxel world for alignment.
    return [dx + 25, 0, dz + 25];
}

/**
 * Converts Voxel [x, y, z] back to Lat/Long
 */
export function voxelToLatLng(x: number, z: number): { lat: number, lng: number } {
    const lng = MNNIT_CENTER.lng + (x - 25) / METERS_PER_DEGREE_LNG;
    const lat = MNNIT_CENTER.lat - (z - 25) / METERS_PER_DEGREE_LAT;
    return { lat, lng };
}

/**
 * Bounds for MNNIT Campus (approx 1km x 1km)
 */
export const MNNIT_BOUNDS = {
    minLat: MNNIT_CENTER.lat - 0.005,
    maxLat: MNNIT_CENTER.lat + 0.005,
    minLng: MNNIT_CENTER.lng - 0.005,
    maxLng: MNNIT_CENTER.lng + 0.005
};
