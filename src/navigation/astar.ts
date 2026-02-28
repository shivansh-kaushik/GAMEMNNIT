export interface AStarNode {
    id: string;
    x: number;
    z: number;
}

function heuristic(a: AStarNode, b: AStarNode) {
    return Math.sqrt(
        Math.pow(a.x - b.x, 2) +
        Math.pow(a.z - b.z, 2)
    );
}

export function aStar(
    startId: string,
    goalId: string,
    nodes: Record<string, AStarNode>,
    edges: Record<string, string[]>
): string[] {
    if (!nodes[startId] || !nodes[goalId]) return [];

    const openSet: string[] = [startId];
    const cameFrom: Record<string, string> = {};

    const gScore: Record<string, number> = {};
    const fScore: Record<string, number> = {};

    Object.keys(nodes).forEach(n => {
        gScore[n] = Infinity;
        fScore[n] = Infinity;
    });

    gScore[startId] = 0;
    fScore[startId] = heuristic(nodes[startId], nodes[goalId]);

    while (openSet.length > 0) {
        // Sort to get node with lowest fScore
        openSet.sort((a, b) => fScore[a] - fScore[b]);
        const current = openSet.shift()!;

        if (current === goalId) {
            return reconstructPath(cameFrom, current);
        }

        const neighbors = edges[current] || [];
        for (const neighbor of neighbors) {
            const tentativeGScore = gScore[current] + heuristic(nodes[current], nodes[neighbor]);

            if (tentativeGScore < gScore[neighbor]) {
                cameFrom[neighbor] = current;
                gScore[neighbor] = tentativeGScore;
                fScore[neighbor] = tentativeGScore + heuristic(nodes[neighbor], nodes[goalId]);

                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    return [];
}

function reconstructPath(cameFrom: Record<string, string>, current: string): string[] {
    const totalPath = [current];
    while (cameFrom[current]) {
        current = cameFrom[current];
        totalPath.unshift(current);
    }
    return totalPath;
}
