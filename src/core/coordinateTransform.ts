/**
 * coordinateTransform.ts
 *
 * Converts between WGS84 (GPS) and the local 3D voxel world used by VoxelCampus.
 *
 * DATUM:  MNNIT_CENTER = 25.494677°N, 81.864779°E  →  voxel [25, 0, 25]
 * SCALE:  1 voxel ≈ 1 metre
 *   Latitude : 1° ≈ 111 320 m
 *   Longitude: 1° ≈ 111 320 × cos(lat) m   ← cos(lat) correction is REQUIRED
 *
 * These constants intentionally match GISUtils.ts so the GPS player dot
 * and the DB-loaded 3D buildings share a single consistent coordinate frame.
 */

const MNNIT_LAT = 25.494677;
const MNNIT_LON = 81.864779;

// Voxel world offset: MNNIT_CENTER maps to [25, 0, 25], not [0, 0, 0]
const VOXEL_ORIGIN_X = 25;
const VOXEL_ORIGIN_Z = 25;

const METERS_PER_DEG_LAT = 111320;
// cos(lat) correction — longitude degrees are shorter at higher latitudes
const METERS_PER_DEG_LNG = 111320 * Math.cos(MNNIT_LAT * Math.PI / 180);

/**
 * Convert a GPS position (WGS84) to a voxel [x, z] position in the 3D campus world.
 * x increases East, z increases South (matching Three.js convention).
 */
export function transformGPSToDigitalTwin(lat: number, lon: number): { x: number; z: number } {
    const x = (lon - MNNIT_LON) * METERS_PER_DEG_LNG + VOXEL_ORIGIN_X;
    const z = (MNNIT_LAT - lat) * METERS_PER_DEG_LAT + VOXEL_ORIGIN_Z;
    return { x, z };
}

/**
 * Inverse: convert a voxel [x, z] back to GPS lat/lon.
 */
export function transformDigitalTwinToGPS(x: number, z: number): { lat: number; lon: number } {
    const lon = (x - VOXEL_ORIGIN_X) / METERS_PER_DEG_LNG + MNNIT_LON;
    const lat = MNNIT_LAT - (z - VOXEL_ORIGIN_Z) / METERS_PER_DEG_LAT;
    return { lat, lon };
}
