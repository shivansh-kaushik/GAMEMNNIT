const CAMPUS_ORIGIN = {
    lat: 25.4920,
    lon: 81.8630
};

const METERS_PER_DEGREE = 111000;

export function transformGPSToDigitalTwin(lat: number, lon: number): { x: number, z: number } {
    const x = (lon - CAMPUS_ORIGIN.lon) * METERS_PER_DEGREE;
    const z = (lat - CAMPUS_ORIGIN.lat) * METERS_PER_DEGREE;
    return { x, z };
}

export function transformDigitalTwinToGPS(x: number, z: number): { lat: number, lon: number } {
    const lon = (x / METERS_PER_DEGREE) + CAMPUS_ORIGIN.lon;
    const lat = (z / METERS_PER_DEGREE) + CAMPUS_ORIGIN.lat;
    return { lat, lon };
}
