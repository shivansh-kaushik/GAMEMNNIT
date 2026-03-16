export interface BuildingData {
    id: string;
    name: string;
    type: 'academic' | 'admin' | 'lab' | 'sports' | 'other';
    latitude: number;
    longitude: number;
    position: [number, number, number];
    size: [number, number, number];
    color: string;
    floor?: number;
    wing?: string;
    isIndoor?: boolean;
    parentBuilding?: string;
}

// ─── ANCHORS (corrected from OSM / user screenshot) ─────────────────────────
// Academic Block (large H-shaped building): 25.4947°N, 81.8641°E
// Admin Block (curved-facade, west of academic): 25.4945°N, 81.8625°E
// ~0.00001° lat ≈ 1.1 m  |  ~0.00001° lon ≈ 1.0 m at this latitude
const ACAD_LAT = 25.4947;
const ACAD_LON = 81.8641;

export const CAMPUS_BUILDINGS: BuildingData[] = [

    // ── MAJOR OUTDOOR BUILDINGS ──────────────────────────────────────────────
    {
        id: 'academic',
        name: "ACADEMIC BUILDING",
        type: 'academic',
        latitude: ACAD_LAT,
        longitude: ACAD_LON,
        position: [25, 0, 15],
        size: [40, 12, 30],
        color: "#fef3c7"
    },
    {
        id: 'admin',
        name: "ADMIN BUILDING",
        type: 'admin',
        latitude: 25.4945,
        longitude: 81.8625,
        position: [20, 0, -25],
        size: [50, 16, 25],
        color: "#d9b38c"
    },

    // ── GROUND FLOOR departments ─────────────────────────────────────────────
    {
        id: 'applied_mechanics',
        name: "APPLIED MECHANICS (GF)",
        type: 'academic',
        latitude: ACAD_LAT - 0.0003,
        longitude: ACAD_LON - 0.0010,
        position: [0, 0, 0], size: [0, 0, 0], color: "#4ade80",
        floor: 0, wing: "West Wing", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'chemical',
        name: "CHEMICAL ENGINEERING (GF)",
        type: 'academic',
        latitude: ACAD_LAT - 0.0003,
        longitude: ACAD_LON - 0.0003,
        position: [0, 0, 0], size: [0, 0, 0], color: "#4ade80",
        floor: 0, wing: "Centre", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'civil',
        name: "CIVIL ENGINEERING (GF)",
        type: 'academic',
        latitude: ACAD_LAT - 0.0003,
        longitude: ACAD_LON + 0.0004,
        position: [0, 0, 0], size: [0, 0, 0], color: "#4ade80",
        floor: 0, wing: "East Wing", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'library',
        name: "CENTRAL LIBRARY (GF)",
        type: 'academic',
        latitude: ACAD_LAT - 0.0003,
        longitude: ACAD_LON + 0.0010,
        position: [0, 0, 0], size: [0, 0, 0], color: "#4ade80",
        floor: 0, wing: "South Block", isIndoor: true, parentBuilding: 'academic'
    },

    // ── 1ST FLOOR departments ─────────────────────────────────────────────────
    {
        id: 'cse',
        name: "COMPUTER SCIENCE / CSED (1F)",
        type: 'academic',
        latitude: ACAD_LAT,
        longitude: ACAD_LON - 0.0010,
        position: [0, 0, 0], size: [0, 0, 0], color: "#38bdf8",
        floor: 1, wing: "West Wing", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'electrical',
        name: "ELECTRICAL ENGG (1F)",
        type: 'academic',
        latitude: ACAD_LAT,
        longitude: ACAD_LON - 0.0003,
        position: [0, 0, 0], size: [0, 0, 0], color: "#38bdf8",
        floor: 1, wing: "Centre", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'ece',
        name: "ELECTRONICS & COMM (1F)",
        type: 'academic',
        latitude: ACAD_LAT,
        longitude: ACAD_LON + 0.0004,
        position: [0, 0, 0], size: [0, 0, 0], color: "#38bdf8",
        floor: 1, wing: "East Wing", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'mechanical',
        name: "MECHANICAL ENGG (1F)",
        type: 'academic',
        latitude: ACAD_LAT,
        longitude: ACAD_LON + 0.0010,
        position: [0, 0, 0], size: [0, 0, 0], color: "#38bdf8",
        floor: 1, wing: "East Block", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'biotech',
        name: "BIOTECHNOLOGY (1F)",
        type: 'academic',
        latitude: ACAD_LAT + 0.0002,
        longitude: ACAD_LON - 0.0006,
        position: [0, 0, 0], size: [0, 0, 0], color: "#38bdf8",
        floor: 1, wing: "North Wing", isIndoor: true, parentBuilding: 'academic'
    },

    // ── 2ND FLOOR departments ─────────────────────────────────────────────────
    {
        id: 'mathematics',
        name: "MATHEMATICS (2F)",
        type: 'academic',
        latitude: ACAD_LAT + 0.0005,
        longitude: ACAD_LON - 0.0010,
        position: [0, 0, 0], size: [0, 0, 0], color: "#f472b6",
        floor: 2, wing: "West Wing", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'physics',
        name: "PHYSICS (2F)",
        type: 'academic',
        latitude: ACAD_LAT + 0.0005,
        longitude: ACAD_LON - 0.0003,
        position: [0, 0, 0], size: [0, 0, 0], color: "#f472b6",
        floor: 2, wing: "Centre", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'chemistry',
        name: "CHEMISTRY (2F)",
        type: 'academic',
        latitude: ACAD_LAT + 0.0005,
        longitude: ACAD_LON + 0.0004,
        position: [0, 0, 0], size: [0, 0, 0], color: "#f472b6",
        floor: 2, wing: "East Wing", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'materials',
        name: "MATERIAL SCIENCE (2F)",
        type: 'academic',
        latitude: ACAD_LAT + 0.0005,
        longitude: ACAD_LON + 0.0010,
        position: [0, 0, 0], size: [0, 0, 0], color: "#f472b6",
        floor: 2, wing: "East Block", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'management',
        name: "SCHOOL OF MANAGEMENT (2F)",
        type: 'academic',
        latitude: ACAD_LAT + 0.0008,
        longitude: ACAD_LON - 0.0003,
        position: [0, 0, 0], size: [0, 0, 0], color: "#f472b6",
        floor: 2, wing: "North Centre", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'humanities',
        name: "HUMANITIES (2F)",
        type: 'academic',
        latitude: ACAD_LAT + 0.0008,
        longitude: ACAD_LON + 0.0004,
        position: [0, 0, 0], size: [0, 0, 0], color: "#f472b6",
        floor: 2, wing: "North East", isIndoor: true, parentBuilding: 'academic'
    },
    {
        id: 'gis_cell',
        name: "GIS CELL (2F)",
        type: 'lab',
        latitude: ACAD_LAT + 0.0008,
        longitude: ACAD_LON + 0.0010,
        position: [0, 0, 0], size: [0, 0, 0], color: "#f472b6",
        floor: 2, wing: "North Block", isIndoor: true, parentBuilding: 'academic'
    }
];

export const MNNIT_BOUNDS: [[number, number], [number, number]] = [
    [25.485, 81.855], // Southwest
    [25.498, 81.875]  // Northeast
];
