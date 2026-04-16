// src/navigation/directions.ts

export interface GraphNode {
  id: string;
  type?: 'junction' | 'stairs' | 'lift' | 'entrance' | 'road' | 'building';
  lat: number;
  lon: number;
  label?: string;
  floor?: number;
}

export function buildVoiceInstruction(
  direction: string,
  distanceToNext: number,
  nextWaypoint?: GraphNode,
  waypointAfter?: GraphNode
): string {
  
  if (!nextWaypoint) return "You have arrived.";

  const dist = Math.round(distanceToNext / 5) * 5; // round to nearest 5m
  const landmark = nextWaypoint.label ?? "the junction";
  
  // Approach announcement (15–35m away)
  if (distanceToNext > 15 && distanceToNext < 35) {
    switch (direction) {
      case "straight":
        return `Continue straight for ${dist} metres towards ${landmark}.`;
      case "slight-left":
      case "left":
        return `In ${dist} metres, turn left at ${landmark}.`;
      case "sharp-left":
        return `In ${dist} metres, take a sharp left at ${landmark}.`;
      case "slight-right":
      case "right":
        return `In ${dist} metres, turn right at ${landmark}.`;
      case "sharp-right":
        return `In ${dist} metres, take a sharp right at ${landmark}.`;
      case "u-turn":
        return `You have passed the route. Please turn around.`;
    }
  }
  
  // Arrival at waypoint bounds (<15m)
  if (distanceToNext <= 15) {
    if (nextWaypoint.type === "stairs") {
      return `Take the stairs ${waypointAfter ? "ahead" : "here"}.`;
    }
    if (nextWaypoint.type === "lift") {
      return `Use the lift on your ${direction === 'straight' ? 'side' : direction}.`;
    }
    if (nextWaypoint.type === "entrance" || nextWaypoint.type === "building") {
      return `You have arrived at ${landmark}.`;
    }
    if (direction === "straight") {
      return `Keep going straight.`;
    }
    return `Turn ${direction} at ${landmark}.`;
  }
  
  // Greater than 35m default maintenance
  return `Head ${direction}.`;
}
