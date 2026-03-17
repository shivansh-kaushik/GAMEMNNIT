/**
 * src/hooks/useVoiceGuidance.ts
 */
import { useEffect, useState, useRef } from 'react';

export function useVoiceGuidance(distanceToNextTurn: number, turnInstruction: string, isFinalDestination: boolean) {
  const [announcedDistance, setAnnouncedDistance] = useState<number | null>(null);
  const prevInstructionRef = useRef(turnInstruction);

  useEffect(() => {
    // Reset announced distance if instruction changes significantly
    if (turnInstruction !== prevInstructionRef.current) {
        setAnnouncedDistance(null);
        prevInstructionRef.current = turnInstruction;
    }
  }, [turnInstruction]);

  useEffect(() => {
    if (!window.speechSynthesis) return;

    // Trigger at 20 meters
    if (distanceToNextTurn <= 20 && distanceToNextTurn > 10 && announcedDistance !== 20) {
      const utterance = new SpeechSynthesisUtterance(`In ${Math.round(distanceToNextTurn)} meters, ${turnInstruction}`);
      window.speechSynthesis.speak(utterance);
      setAnnouncedDistance(20);
    } 
    
    // Trigger at 5 meters
    if (distanceToNextTurn <= 5 && distanceToNextTurn > 0 && announcedDistance !== 5) {
      const msg = isFinalDestination ? "You have arrived at your destination." : turnInstruction;
      const utterance = new SpeechSynthesisUtterance(msg);
      window.speechSynthesis.speak(utterance);
      setAnnouncedDistance(5);
    }
  }, [distanceToNextTurn, turnInstruction, isFinalDestination, announcedDistance]);
}
