export interface Building {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}

export interface BuildingRecord {
  $id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  width: number;
  height: number;
  depth: number;
  color?: string;
}

export interface RoadRecord {
  $id: string;
  name: string;
  waypoints: string; // JSON string [lat, lng][]
}

export interface BuildingData extends Building { }

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
