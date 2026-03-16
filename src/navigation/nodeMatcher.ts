export function findNearestGraphNode(userX: number, userZ: number, nodes: Record<string, { x: number, z: number }>): string | null {
    let nearestNodeId: string | null = null;
    let minDistance = Infinity;

    for (const [id, node] of Object.entries(nodes)) {
        const dx = userX - node.x;
        const dz = userZ - node.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < minDistance) {
            minDistance = distance;
            nearestNodeId = id;
        }
    }

    return nearestNodeId;
}
