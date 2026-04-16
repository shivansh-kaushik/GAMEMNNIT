// src/navigation/voiceTrigger.ts

export interface VoiceState {
  lastSpokenWaypointIndex: number;
  lastSpokenTime: number;
  lastInstruction: string;
}

const state: VoiceState = {
  lastSpokenWaypointIndex: -1,
  lastSpokenTime: 0,
  lastInstruction: "",
};

export function resetVoiceState() {
  state.lastSpokenWaypointIndex = -1;
  state.lastSpokenTime = 0;
  state.lastInstruction = "";
}

export function shouldSpeak(
  currentWaypointIndex: number,
  distanceToNextWaypoint: number,  // meters
  newInstruction: string,
  minSilenceMs: number = 6000      // don't speak more than once per 6s
): boolean {
  
  const now = Date.now();
  const timeSinceLastSpeak = now - state.lastSpokenTime;
  
  // Clean empty
  if (!newInstruction) return false;

  // NEW waypoint reached — always speak if the instruction is fundamentally new
  if (currentWaypointIndex !== state.lastSpokenWaypointIndex) {
    state.lastSpokenWaypointIndex = currentWaypointIndex;
    state.lastSpokenTime = now;
    state.lastInstruction = newInstruction;
    return true;
  }
  
  // Approaching next waypoint (within 20m) — speak condition
  if (distanceToNextWaypoint < 20 &&
      newInstruction !== state.lastInstruction &&
      timeSinceLastSpeak > minSilenceMs) {
    state.lastSpokenTime = now;
    state.lastInstruction = newInstruction;
    return true;
  }

  // Very close critical correction condition
  if (distanceToNextWaypoint < 8 && 
      newInstruction !== state.lastInstruction && 
      timeSinceLastSpeak > 3000) {
      state.lastSpokenTime = now;
      state.lastInstruction = newInstruction;
      return true;
  }
  
  return false; // GPS jitter, don't speak
}
