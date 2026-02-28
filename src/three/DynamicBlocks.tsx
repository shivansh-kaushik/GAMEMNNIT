import * as THREE from 'three';
import React, { useMemo, useRef, useLayoutEffect } from 'react';

interface DynamicBlocksProps {
    blocks: { position: [number, number, number]; type: 'B' | 'R' }[];
}

const BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);

const BUILDING_MATERIAL = new THREE.MeshStandardMaterial({ color: '#888888' });
const ROAD_MATERIAL = new THREE.MeshStandardMaterial({ color: '#222222' });

export const DynamicBlocks: React.FC<DynamicBlocksProps> = ({ blocks }) => {
    const buildingMeshRef = useRef<THREE.InstancedMesh>(null);
    const roadMeshRef = useRef<THREE.InstancedMesh>(null);

    const buildingBlocks = useMemo(() => blocks.filter(b => b.type === 'B'), [blocks]);
    const roadBlocks = useMemo(() => blocks.filter(b => b.type === 'R'), [blocks]);

    useLayoutEffect(() => {
        const dummy = new THREE.Object3D();

        if (buildingMeshRef.current) {
            buildingBlocks.forEach((block, i) => {
                dummy.position.set(...block.position);
                dummy.updateMatrix();
                buildingMeshRef.current!.setMatrixAt(i, dummy.matrix);
            });
            buildingMeshRef.current.instanceMatrix.needsUpdate = true;
        }

        if (roadMeshRef.current) {
            roadBlocks.forEach((block, i) => {
                dummy.position.set(block.position[0], block.position[1] + 0.01, block.position[2]);
                dummy.rotation.x = -Math.PI / 2;
                dummy.updateMatrix();
                roadMeshRef.current!.setMatrixAt(i, dummy.matrix);
            });
            roadMeshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [buildingBlocks, roadBlocks]);

    return (
        <group>
            {buildingBlocks.length > 0 && (
                <instancedMesh
                    ref={buildingMeshRef}
                    args={[BOX_GEOMETRY, BUILDING_MATERIAL, buildingBlocks.length]}
                    castShadow
                    receiveShadow
                />
            )}
            {roadBlocks.length > 0 && (
                <instancedMesh
                    ref={roadMeshRef}
                    args={[PLANE_GEOMETRY, ROAD_MATERIAL, roadBlocks.length]}
                    receiveShadow
                />
            )}
        </group>
    );
};
