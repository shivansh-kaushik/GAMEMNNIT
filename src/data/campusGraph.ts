export interface Node {
    id: string;
    x: number;
    z: number;
    name: string;
}

export const nodes: Record<string, Node> = {
    gate: { id: 'gate', x: 0, z: 0, name: 'Main Gate' },
    admin: { id: 'admin', x: 20, z: -25, name: 'Admin Building' },
    academic: { id: 'academic', x: 25, z: 15, name: 'CSE/Academic Building' },
    library: { id: 'library', x: 50, z: 10, name: 'Central Library' },
    hostel: { id: 'hostel', x: 10, z: 40, name: 'Hostel Block' },
    intersection_1: { id: 'intersection_1', x: 10, z: 10, name: 'Main Junction' }
};

export const edges: Record<string, string[]> = {
    gate: ['intersection_1'],
    intersection_1: ['gate', 'admin', 'academic', 'hostel'],
    admin: ['intersection_1', 'academic'],
    academic: ['intersection_1', 'admin', 'library'],
    library: ['academic'],
    hostel: ['intersection_1']
};
