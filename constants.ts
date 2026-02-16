
import { Building, Mission, AccessPoint } from './types';

// Research Blueprint Texture Placeholder (can be replaced with a real satellite crop)
// Research Blueprint: Using a high-contrast satellite view for clear spatial differentiation
export const CAMPUS_GROUND_URL = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=3870&auto=format&fit=crop';

export const CUSTOM_MODEL_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/obj/male02/male02.obj';

export const MODEL_CONFIG = {
  scale: 0.04,
  rotation: [0, Math.PI, 0] as [number, number, number],
  position: [0, 0, 0] as [number, number, number],
};

// Refined Spatial Layout - Aligned to create a more "Campus-like" quad structure on the map
export const CAMPUS_BUILDINGS: Building[] = [
  // Central Admin - The Anchor
  { id: 'admin', name: 'Admin Block', position: [0, 8, -40], size: [24, 16, 12], color: '#f8fafc' },
  
  // Academic Zone
  { id: 'cse', name: 'CSE Dept', position: [-50, 6, -10], size: [20, 12, 25], color: '#93c5fd' },
  { id: 'ece', name: 'ECE Dept', position: [-50, 6, 25], size: [20, 12, 25], color: '#cbd5e1' },
  
  // Resources
  { id: 'library', name: 'Central Library', position: [40, 7, 0], size: [22, 14, 22], color: '#fca5a5' },
  
  // Student Life
  { id: 'hostel', name: 'Mega Hostel', position: [0, 10, 60], size: [35, 20, 25], color: '#fbbf24' },
  { id: 'mp_hall', name: 'MP Hall', position: [50, 8, -50], size: [25, 15, 25], color: '#c084fc' },
  { id: 'canteen', name: 'Canteen', position: [-20, 3, 40], size: [15, 6, 15], color: '#4ade80' },
];

export const ACCESS_POINTS: AccessPoint[] = [
  { id: 'ap1', ssid: 'MNNIT_ADMIN_G', position: [0, 2, 0], floor: 0 },
  { id: 'ap2', ssid: 'MNNIT_ADMIN_F1', position: [0, 6, 0], floor: 1 },
  { id: 'ap3', ssid: 'MNNIT_LIB_MAIN', position: [0, 5, 50], floor: 0 },
  { id: 'ap4', ssid: 'MNNIT_CSE_WIFI', position: [-45, 2, 20], floor: 0 },
  { id: 'ap5', ssid: 'MNNIT_MEGA_HOSTEL', position: [50, 5, -60], floor: 0 },
];

export const MISSIONS: Mission[] = [
  { id: 'm1', targetId: 'library', description: 'Route to Central Library' },
  { id: 'm2', targetId: 'cse', description: 'Find CSE Department' },
  { id: 'm3', targetId: 'hostel', description: 'Return to Mega Hostel' },
  { id: 'm4', targetId: 'admin', description: 'Admin Floor 1 (RSSI Floor Test)' },
];

export const PLAYER_START_POS: [number, number, number] = [0, 1, -20];
export const MOVEMENT_SPEED = 0.35;
export const VERTICAL_SPEED = 0.2;
export const REACH_THRESHOLD = 6.0;
export const FLOOR_HEIGHT = 4.0;
