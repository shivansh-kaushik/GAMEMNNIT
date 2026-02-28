import * as THREE from 'three';
import React, { useMemo, useRef, useLayoutEffect } from 'react';

interface TreeRendererProps {
    count?: number;
    boundary: number;
    seed?: number;
    blockedAreas: { position: [number, number, number], size: [number, number, number] }[];
}

const TRUNK_GEOMETRY = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
const LEAVES_GEOMETRY = new THREE.SphereGeometry(1.5, 8, 8);

const TRUNK_MATERIAL = new THREE.MeshStandardMaterial({ color: "#3d2b1f" });
const LEAVES_MATERIAL = new THREE.MeshStandardMaterial({ color: "#065f46" });

export const TreeRenderer: React.FC<TreeRendererProps> = ({
    count = 100,
    boundary,
    seed = 123.456,
    blockedAreas
}) => {
    const trunkRef = useRef<THREE.InstancedMesh>(null);
    const leavesRef = useRef<THREE.InstancedMesh>(null);

    const positions = useMemo(() => {
        // Simple seeded random function
        let s = seed || 123.456;
        const random = () => {
            const x = Math.sin(s++) * 10000;
            return x - Math.floor(x);
        };

        const posArr: THREE.Vector3[] = [];
        let attempts = 0;
        const maxAttempts = count * 10;

        while (posArr.length < count && attempts < maxAttempts) {
            attempts++;
            const x = (random() - 0.5) * boundary;
            const z = (random() - 0.5) * boundary;

            // Check if blocked
            const isBlocked = blockedAreas.some(area => {
                const [bx, by, bz] = area.position;
                const [bw, bh, bd] = area.size;
                return x > bx - 2 && x < bx + bw + 2 && z > bz - 2 && z < bz + bd + 2;
            });

            if (!isBlocked) {
                posArr.push(new THREE.Vector3(x, 0, z));
            }
        }
        return posArr;
    }, [count, boundary, blockedAreas, seed]);

    useLayoutEffect(() => {
        if (!trunkRef.current || !leavesRef.current) return;

        const dummy = new THREE.Object3D();
        positions.forEach((pos, i) => {
            // Trunk
            dummy.position.set(pos.x, 1, pos.z);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            trunkRef.current!.setMatrixAt(i, dummy.matrix);

            // Leaves
            dummy.position.set(pos.x, 2.5, pos.z);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            leavesRef.current!.setMatrixAt(i, dummy.matrix);
        });

        trunkRef.current.instanceMatrix.needsUpdate = true;
        leavesRef.current.instanceMatrix.needsUpdate = true;
    }, [positions]);

    return (
        <group>
            <instancedMesh ref={trunkRef} args={[TRUNK_GEOMETRY, TRUNK_MATERIAL, positions.length]} castShadow receiveShadow />
            <instancedMesh ref={leavesRef} args={[LEAVES_GEOMETRY, LEAVES_MATERIAL, positions.length]} castShadow receiveShadow />
        </group>
    );
};
