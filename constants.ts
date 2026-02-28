
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

// Refined Spatial Layout - Rebuilt based on Campus Diagram
export const CAMPUS_BUILDINGS: Building[] = [
  // Top Row
  { id: 'seminar', name: 'Seminar Halls', position: [0, 8, -100], size: [30, 16, 25], color: '#94a3b8' },
  { id: 'admin', name: 'Admin Building', position: [70, 8, -100], size: [60, 16, 25], color: '#f8fafc' },

  // Middle Row
  { id: 'cc', name: 'Computer Center', position: [-80, 8, 0], size: [35, 16, 30], color: '#60a5fa' },
  { id: 'dean', name: 'Dean Acadmics', position: [0, 8, 0], size: [35, 16, 30], color: '#93c5fd' },
  { id: 'academic', name: 'Acadmic Bhulding', position: [90, 8, 10], size: [70, 16, 100], color: '#cbd5e1' },
  { id: 'sports', name: 'Sports Ground', position: [200, 0.2, 10], size: [100, 0.4, 150], color: '#059669' },

  // Bottom Area
  { id: 'csed', name: 'CSED Dept', position: [-80, 8, 100], size: [35, 16, 35], color: '#3b82f6' },
  { id: 'geotech', name: 'Geo Tech Labs', position: [10, 8, 110], size: [25, 16, 60], color: '#64748b' },
  { id: 'mp_hall', name: 'MP Hall', position: [70, 8, 200], size: [120, 16, 60], color: '#c084fc' },
];

export const ACCESS_POINTS: AccessPoint[] = [
  { id: 'ap1', ssid: 'MNNIT_ADMIN_WIFI', position: [70, 2, -100], floor: 0 },
  { id: 'ap2', ssid: 'MNNIT_CC_PUBLIC', position: [-80, 2, 0], floor: 0 },
  { id: 'ap3', ssid: 'MNNIT_ACADEMIC_F1', position: [90, 6, 10], floor: 1 },
  { id: 'ap4', ssid: 'MNNIT_CSED_DEPT', position: [-80, 2, 100], floor: 0 },
  { id: 'ap5', ssid: 'MNNIT_MP_HALL', position: [70, 2, 200], floor: 0 },
];

export const MISSIONS: Mission[] = [
  { id: 'm1', targetId: 'academic', description: 'Reach the Acadmic Bhulding' },
  { id: 'm2', targetId: 'cc', description: 'Locate the Computer Center' },
  { id: 'm3', targetId: 'admin', description: 'Go to Admin Building' },
  { id: 'm4', targetId: 'csed', description: 'Find CSED Dept' },
];

export const PLAYER_START_POS: [number, number, number] = [0, 1, -20];
export const MOVEMENT_SPEED = 0.35;
export const VERTICAL_SPEED = 0.2;
export const REACH_THRESHOLD = 6.0;
export const FLOOR_HEIGHT = 4.0;
