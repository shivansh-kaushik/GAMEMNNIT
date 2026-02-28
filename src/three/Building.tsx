import * as THREE from 'three';
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { Html } from '@react-three/drei';

interface BuildingProps {
    id: string;
    position: [number, number, number];
    size: [number, number, number]; // [width, height, depth] in voxels
    color?: string;
    name?: string;
    type?: string;
    hasEntrance?: boolean;
}

const BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const BUILDING_MATERIAL = new THREE.MeshStandardMaterial({ color: '#888888' });

export const Building: React.FC<BuildingProps> = ({
    id,
    position,
    size,
    color = '#888888',
    name,
    type,
    hasEntrance = true
}) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const [width, height, depth] = size;

    // Create a hollow structure with a gate
    const instances = useMemo(() => {
        const coords: THREE.Vector3[] = [];

        // Gate dimensions (2 wide, 3 high)
        const gateWidth = 2;
        const gateHeight = 3;
        const gateXStart = Math.floor((width - gateWidth) / 2);

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                for (let z = 0; z < depth; z++) {
                    const isOuterWall = x === 0 || x === width - 1 || z === 0 || z === depth - 1;
                    const isRoof = y === height - 1;
                    const isFloor = y === 0;

                    if (isOuterWall || isRoof || isFloor) {
                        // Check if this block should be part of the gate opening
                        // Gate is on the front face (z=0)
                        const isGateOpening = hasEntrance &&
                            z === 0 &&
                            x >= gateXStart &&
                            x < gateXStart + gateWidth &&
                            y > 0 &&
                            y <= gateHeight;

                        if (!isGateOpening) {
                            coords.push(new THREE.Vector3(x, y, z));
                        }
                    }
                }
            }
        }
        return coords;
    }, [width, height, depth, hasEntrance]);

    const material = useMemo(() => {
        let baseColor = color || '#888888';

        // Type-based overrides if color is default
        if (color === '#888888' || !color) {
            switch (type) {
                case 'academic': baseColor = '#cbd5e1'; break;
                case 'admin': baseColor = '#f8fafc'; break;
                case 'hostel': baseColor = '#93c5fd'; break;
                case 'lab': baseColor = '#94a3b8'; break;
                case 'sports': baseColor = '#059669'; break;
                case 'other': baseColor = '#c084fc'; break;
            }
        }

        return new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.6,
            metalness: 0.1,
            transparent: type === 'academic' || type === 'admin',
            opacity: type === 'academic' || type === 'admin' ? 0.9 : 1.0
        });
    }, [color, type]);

    useLayoutEffect(() => {
        if (!meshRef.current) return;

        const dummy = new THREE.Object3D();
        instances.forEach((coord, i) => {
            dummy.position.set(
                position[0] + coord.x,
                position[1] + coord.y,
                position[2] + coord.z
            );
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [instances, position]);

    return (
        <group>
            <instancedMesh
                ref={meshRef}
                args={[BOX_GEOMETRY, material, instances.length]}
                castShadow
                receiveShadow
            />
            {name && (
                <Html
                    position={[position[0] + width / 2, position[1] + height + 2, position[2] + depth / 2]}
                    center
                    distanceFactor={20}
                    style={{
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        color: 'white',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        border: '1px solid rgba(255,255,255,0.3)',
                        textTransform: 'uppercase'
                    }}
                >
                    {name}
                </Html>
            )}
        </group>
    );
};
