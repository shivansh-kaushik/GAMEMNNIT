/**
 * src/hooks/useNavigationConfidence.ts
 */
import { useState, useEffect } from 'react';
import { remainingDistance } from '../ar/arNavigation';

export type ConfidenceLevel = 'On Track' | 'Slightly Off' | 'Recalculating';

export function useNavigationConfidence(currentLat: number, currentLon: number, destId: string | null) {
  const [confidence, setConfidence] = useState<ConfidenceLevel>('On Track');
  const [prevDist, setPrevDist] = useState<number | null>(null);

  useEffect(() => {
    if (!destId) {
      setConfidence('On Track');
      setPrevDist(null);
      return;
    }

    const dist = remainingDistance(currentLat, currentLon, destId);
    
    if (prevDist !== null) {
      const diff = dist - prevDist;
      
      if (diff < -1) {
        setConfidence('On Track');       // Distance decreasing (significantly)
      } else if (diff > 5) {
        setConfidence('Recalculating');  // Distance strongly increasing
      } else if (diff > 0) {
        setConfidence('Slightly Off');   // Distance slightly increasing
      }
    }
    setPrevDist(dist);
    
  }, [currentLat, currentLon, destId]);

  return confidence;
}
