export type PathNode = {
    x: number;
    z: number;
    g: number;
    h: number;
    f: number;
    parent?: PathNode;
};

export class Pathfinder {
    constructor(private grid: string[][]) { }

    private heuristic(a: { x: number, z: number }, b: { x: number, z: number }) {
        // Manhattan distance
        return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
    }

    public findPath(startX: number, startZ: number, endX: number, endZ: number): PathNode[] {
        const open: PathNode[] = [];
        const closed: Set<string> = new Set();

        const startNode: PathNode = {
            x: Math.floor(startX),
            z: Math.floor(startZ),
            g: 0,
            h: 0,
            f: 0
        };

        const endPos = {
            x: Math.floor(endX),
            z: Math.floor(endZ)
        };

        open.push(startNode);

        while (open.length > 0) {
            // Sort to get node with lowest F score
            open.sort((a, b) => a.f - b.f);
            const current = open.shift()!;
            const key = `${current.x}-${current.z}`;

            if (closed.has(key)) continue;
            closed.add(key);

            // Check if reached destination
            if (current.x === endPos.x && current.z === endPos.z) {
                const path: PathNode[] = [];
                let temp: PathNode | undefined = current;
                while (temp) {
                    path.push(temp);
                    temp = temp.parent;
                }
                return path.reverse();
            }

            const neighbors = [
                { x: current.x + 1, z: current.z },
                { x: current.x - 1, z: current.z },
                { x: current.x, z: current.z + 1 },
                { x: current.x, z: current.z - 1 }
            ];

            for (const n of neighbors) {
                const nKey = `${n.x}-${n.z}`;

                // Bounds and walkability check
                if (
                    n.x < 0 ||
                    n.z < 0 ||
                    n.z >= this.grid.length || // Assuming grid[z][x] or grid[x][z]
                    n.x >= (this.grid[0]?.length || 0) ||
                    closed.has(nKey)
                ) continue;

                // In our campusMap, "R" is walkable
                // Handle coordinate mapping carefully
                const cell = this.grid[n.z][n.x];
                if (cell !== "R") continue;

                const g = current.g + 1;
                const h = this.heuristic(n, endPos);
                const f = g + h;

                open.push({
                    x: n.x,
                    z: n.z,
                    g,
                    h,
                    f,
                    parent: current
                });
            }
        }

        return [];
    }
}
