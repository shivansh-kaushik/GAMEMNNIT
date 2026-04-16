// src/navigation/bearing.ts

export interface Position {
  lat: number;
  lon: number;
}

export function haversineDistance(from: Position, to: Position): number {
  const R = 6371e3; // metres
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180;
  const Δλ = ((to.lon - from.lon) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function haversineBearing(from: Position, to: Position): number {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lon - from.lon) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360; // 0–360 degrees
}

export type DirectionType = "straight" | "slight-left" | "left" | "sharp-left" |
                            "slight-right" | "right" | "sharp-right" | "u-turn";

export function relativeDirection(
  userHeading: number,   // from deviceorientation alpha (0=North, 90=East)
  waypointBearing: number
): DirectionType {
  
  let diff = waypointBearing - userHeading;
  // Normalize to -180 to +180
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  if (Math.abs(diff) < 20) return "straight";
  if (diff > 0 && diff < 45) return "slight-right";
  if (diff >= 45 && diff < 110) return "right";
  if (diff >= 110 && diff < 160) return "sharp-right";
  if (diff >= 160) return "u-turn";
  if (diff < 0 && diff > -45) return "slight-left";
  if (diff <= -45 && diff > -110) return "left";
  if (diff <= -110 && diff > -160) return "sharp-left";
  return "u-turn";
}
