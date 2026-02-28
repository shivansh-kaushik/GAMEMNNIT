import * as THREE from 'three';
import React, { useMemo, useRef, useLayoutEffect } from 'react';

interface RoadProps {
    position: [number, number, number];
    size: [number, number]; // [width, depth]
}

const ROAD_GEOMETRY = new THREE.PlaneGeometry(1, 1);
const ROAD_MATERIAL = new THREE.MeshStandardMaterial({
    color: '#222222',
    roughness: 0.8,
    metalness: 0.2
});

export const Road: React.FC<RoadProps> = ({ position, size }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const [width, depth] = size;

    const instances = useMemo(() => {
        const coords: THREE.Vector2[] = [];
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < depth; z++) {
                coords.push(new THREE.Vector2(x, z));
            }
        }
        return coords;
    }, [width, depth]);

    useLayoutEffect(() => {
        if (!meshRef.current) return;

        const dummy = new THREE.Object3D();
        instances.forEach((coord, i) => {
            dummy.position.set(
                position[0] + coord.x,
                position[1], // Flat on the ground
                position[2] + coord.y
            );
            dummy.rotation.x = -Math.PI / 2; // Lie flat
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [instances, position]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[ROAD_GEOMETRY, ROAD_MATERIAL, instances.length]}
            receiveShadow
        />
    );
};
