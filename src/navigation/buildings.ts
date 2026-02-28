export interface BuildingData {
    id: string;
    name: string;
    type: 'academic' | 'admin' | 'lab' | 'sports' | 'other';
    latitude: number;
    longitude: number;
    position: [number, number, number]; // [x, y, z] in Three.js world
    size: [number, number, number];    // [width, height, depth]
    color: string;
}

export const CAMPUS_BUILDINGS: BuildingData[] = [
    {
        id: 'academic',
        name: "ACADEMIC BUILDING",
        type: 'academic',
        latitude: 25.492,
        longitude: 81.867,
        position: [25, 0, 15],
        size: [40, 12, 30],
        color: "#fef3c7"
    },
    {
        id: 'admin',
        name: "ADMIN BUILDING",
        type: 'admin',
        latitude: 25.491,
        longitude: 81.865,
        position: [20, 0, -25],
        size: [50, 16, 25],
        color: "#d9b38c"
    },
];

export const MNNIT_BOUNDS: [[number, number], [number, number]] = [
    [25.485, 81.855], // Southwest
    [25.498, 81.875]  // Northeast
];
