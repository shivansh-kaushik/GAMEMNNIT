import { latLngToVoxel } from '../core/GISUtils';

export interface GraphNode {
    id: string;
    lat: number;
    lng: number;
    x: number;
    z: number;
    name?: string;
}

export interface NavigationGraph {
    nodes: Record<string, GraphNode>;
    edges: Record<string, string[]>;
}

/**
 * Converts a GeoJSON FeatureCollection of LineStrings into a 
 * navigation graph for A* pathfinding.
 */
export function buildGraphFromGeoJSON(geojson: any): NavigationGraph {
    const nodes: Record<string, GraphNode> = {};
    const edges: Record<string, string[]> = {};

    geojson.features.forEach((feature: any) => {
        if (feature.geometry.type !== 'LineString') return;

        const coords = feature.geometry.coordinates;
        for (let i = 0; i < coords.length - 1; i++) {
            const p1 = coords[i];
            const p2 = coords[i + 1];

            const id1 = `${p1[1].toFixed(6)},${p1[0].toFixed(6)}`;
            const id2 = `${p2[1].toFixed(6)},${p2[0].toFixed(6)}`;

            // Create nodes if they don't exist
            if (!nodes[id1]) {
                const voxel = latLngToVoxel(p1[1], p1[0]);
                nodes[id1] = {
                    id: id1,
                    lat: p1[1],
                    lng: p1[0],
                    x: voxel[0],
                    z: voxel[2]
                };
            }
            if (!nodes[id2]) {
                const voxel = latLngToVoxel(p2[1], p2[0]);
                nodes[id2] = {
                    id: id2,
                    lat: p2[1],
                    lng: p2[0],
                    x: voxel[0],
                    z: voxel[2]
                };
            }

            // Create edges
            if (!edges[id1]) edges[id1] = [];
            if (!edges[id2]) edges[id2] = [];

            if (!edges[id1].includes(id2)) edges[id1].push(id2);
            if (!edges[id2].includes(id1)) edges[id2].push(id1);
        }
    });

    return { nodes, edges };
}

/**
 * Finds the nearest node in the graph to a given scene position [x, z].
 */
export function findNearestNode(x: number, z: number, nodes: Record<string, GraphNode>): string {
    let nearestId = '';
    let minDist = Infinity;

    Object.values(nodes).forEach(node => {
        const d = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(z - node.z, 2));
        if (d < minDist) {
            minDist = d;
            nearestId = node.id;
        }
    });

    return nearestId;
}
