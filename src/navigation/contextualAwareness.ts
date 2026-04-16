// src/navigation/contextualAwareness.ts

import { haversineDistance, Position } from './bearing';
import { GraphNode } from './directions';

export function getProximityAlert(
  userPosition: Position,
  upcomingNodes: GraphNode[],
  lookAheadMeters: number = 25
): string | null {
  
  for (const node of upcomingNodes) {
    const dist = haversineDistance(userPosition, node);
    if (dist > lookAheadMeters) continue;
    
    switch (node.type) {
      case 'stairs':
        return node.floor !== undefined
          ? `Staircase ahead. ${node.floor > 0 ? 'Go up' : 'Go down'} to floor ${Math.abs(node.floor)}.`
          : 'Staircase ahead.';
      
      case 'lift':
        return `Lift on your ${node.label ?? 'right'}. Press floor ${node.floor ?? ''}.`;
      
      case 'entrance':
        return `Building entrance in ${Math.round(dist)} metres. ${node.label ?? ''}.`;
      
      case 'road':
        // Only warn once if very close
        if (dist > 10 && dist < 20) {
           return `Road crossing ahead. Check for vehicles.`;
        }
        break;
    }
  }
  
  return null; // nothing nearby matching spatial triggers
}
