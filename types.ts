
export interface Building {
  id: string;
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

export interface AccessPoint {
  id: string;
  ssid: string;
  position: [number, number, number];
  floor: number;
}

export interface RSSIReading {
  ssid: string;
  rssi: number;
  distance: number;
}

export interface NavigationState {
  currentBuildingId: string | null;
  startTime: number | null;
  endTime: number | null;
  distanceTraveled: number;
  isComplete: boolean;
  detectedFloor: number;
  fingerprintConfidence: number;
}

export interface Mission {
  id: string;
  targetId: string;
  description: string;
}
