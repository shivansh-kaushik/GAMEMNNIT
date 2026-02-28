import * as THREE from 'three';
import React, { useMemo, useRef, useLayoutEffect } from 'react';

interface ComplexRoadProps {
    position: [number, number, number];
    size: [number, number]; // [width, depth]
    roadWidth?: number;     // Width of the asphalt part
}

const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);
const ASPHALT_MATERIAL = new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    roughness: 0.9,
    metalness: 0.1
});
const FOOTPATH_MATERIAL = new THREE.MeshStandardMaterial({
    color: '#a1a1a1',
    roughness: 0.7,
    metalness: 0.2
});

export const ComplexRoad: React.FC<ComplexRoadProps> = ({
    position,
    size,
    roadWidth = 9
}) => {
    const asphaltRef = useRef<THREE.InstancedMesh>(null);
    const footpathRef = useRef<THREE.InstancedMesh>(null);
    const [totalWidth, totalDepth] = size;

    const { asphaltCoords, footpathCoords } = useMemo(() => {
        const asphalt: THREE.Vector2[] = [];
        const footpath: THREE.Vector2[] = [];

        const roadStart = (totalWidth - roadWidth) / 2;
        const roadEnd = roadStart + roadWidth;

        for (let x = 0; x < totalWidth; x++) {
            for (let z = 0; z < totalDepth; z++) {
                if (x >= roadStart && x < roadEnd) {
                    asphalt.push(new THREE.Vector2(x, z));
                } else {
                    footpath.push(new THREE.Vector2(x, z));
                }
            }
        }
        return { asphaltCoords: asphalt, footpathCoords: footpath };
    }, [totalWidth, totalDepth, roadWidth]);

    useLayoutEffect(() => {
        const updateMesh = (mesh: THREE.InstancedMesh | null, coords: THREE.Vector2[], yOffset: number) => {
            if (!mesh) return;
            const dummy = new THREE.Object3D();
            coords.forEach((coord, i) => {
                dummy.position.set(
                    position[0] + coord.x,
                    position[1] + yOffset,
                    position[2] + coord.y
                );
                dummy.rotation.x = -Math.PI / 2;
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
        };

        updateMesh(asphaltRef.current, asphaltCoords, 0);
        updateMesh(footpathRef.current, footpathCoords, 0.05); // Footpath slightly raised
    }, [asphaltCoords, footpathCoords, position]);

    return (
        <group>
            <instancedMesh
                ref={asphaltRef}
                args={[PLANE_GEOMETRY, ASPHALT_MATERIAL, asphaltCoords.length]}
                receiveShadow
            />
            <instancedMesh
                ref={footpathRef}
                args={[PLANE_GEOMETRY, FOOTPATH_MATERIAL, footpathCoords.length]}
                receiveShadow
            />
        </group>
    );
};
