// src/sensors/smoothGPS.ts

export interface Position { 
  lat: number; 
  lon: number; 
}

let smoothed: Position | null = null;
const ALPHA = 0.25; // lower = smoother but more lag. 0.2–0.3 is good for walking

export function smoothGPS(raw: Position): Position {
  if (!smoothed || isNaN(smoothed.lat) || isNaN(smoothed.lon)) {
    smoothed = { ...raw };
    return raw;
  }
  
  // Guard against massive GPS jumps resetting the filter entirely
  const jump = Math.sqrt(Math.pow(raw.lat - smoothed.lat, 2) + Math.pow(raw.lon - smoothed.lon, 2));
  if (jump > 0.001) { // roughly 100m+ jump
      smoothed = { ...raw };
      return raw;
  }

  smoothed = {
    lat: ALPHA * raw.lat + (1 - ALPHA) * smoothed.lat,
    lon: ALPHA * raw.lon + (1 - ALPHA) * smoothed.lon,
  };
  return smoothed;
}

export function resetGPSFilter() {
    smoothed = null;
}
