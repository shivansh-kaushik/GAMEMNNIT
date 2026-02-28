import * as THREE from 'three';
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { Html } from '@react-three/drei';

interface AdminBuildingProps {
    position: [number, number, number];
    size?: [number, number, number]; // [width, height, depth]
    name?: string;
}

const BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

// Materials based on the sandstone/desert look in the photo
const SANDSTONE_MATERIAL = new THREE.MeshStandardMaterial({ color: '#d9b38c', roughness: 0.8 });
const SANDSTONE_DARK = new THREE.MeshStandardMaterial({ color: '#b38659', roughness: 0.6 });
const PURPLE_BANNER = new THREE.MeshStandardMaterial({ color: '#5b21b6', roughness: 0.5 });
const PORCH_WHITE = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 });
const WINDOW_GLASS = new THREE.MeshStandardMaterial({ color: '#93c5fd', transparent: true, opacity: 0.5, metalness: 0.9 });
const FLOOR_MATERIAL = new THREE.MeshStandardMaterial({ color: '#94a3b8' });

export const AdminBuilding: React.FC<AdminBuildingProps> = ({
    position,
    size = [50, 16, 25],
    name = "ADMINISTRATIVE BUILDING"
}) => {
    const [width, height, depth] = size;

    const voxelData = useMemo(() => {
        const voxels: { pos: THREE.Vector3, type: 'sandstone' | 'sandstone_dark' | 'purple' | 'porch' | 'glass' | 'floor' }[] = [];

        const centerX = width / 2;
        const radius = 12;
        const wingWidth = (width - radius * 2) / 2;

        for (let y = 0; y < height; y++) {
            const isFloorBase = y % 4 === 0;

            for (let x = 0; x < width; x++) {
                for (let z = 0; z < depth; z++) {
                    const isOuterWall = x === 0 || x === width - 1 || z === depth - 1;

                    // Central Curved Section
                    const dx = x - centerX;
                    const dz = z - 2; // Offset curve from front
                    const distToCenter = Math.sqrt(dx * dx + dz * dz);
                    const isCurve = Math.abs(distToCenter - radius) < 1 && dz >= 0 && z < radius + 2;
                    const isCurveFill = distToCenter < radius && dz >= 0 && z < radius + 2;

                    // Wings
                    const isRightWing = x > centerX + radius;
                    const isLeftWing = x < centerX - radius;
                    const isWing = (isLeftWing || isRightWing) && z < 15;

                    // Building Logic
                    if (isFloorBase && (isCurveFill || isWing)) {
                        voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'floor' });
                    }

                    // Central Curved Facade
                    if (isCurve) {
                        const isBannerArea = y >= 6 && y <= 8 && Math.abs(dx) < 6;
                        const isPorchEntry = y < 3 && Math.abs(dx) < 3;

                        if (isBannerArea) {
                            voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'purple' });
                        } else if (isPorchEntry) {
                            // Leave gap for entry
                            continue;
                        } else {
                            const isWindow = (y % 4 > 1) && (Math.abs(dx) % 3 !== 0);
                            voxels.push({ pos: new THREE.Vector3(x, y, z), type: isWindow ? 'glass' : 'sandstone' });
                        }
                        continue;
                    }

                    // Side Wings Facade
                    if (isWing) {
                        const isWingFront = z === 0;
                        const isWingSide = x === 0 || x === width - 1;
                        const isWingBack = z === 15;

                        if (isWingFront || isWingSide || isWingBack) {
                            // Varied heights for wings
                            const maxWingHeight = isLeftWing ? 12 : 14;
                            if (y < maxWingHeight) {
                                const isWindow = (x % 5 === 0 || x % 5 === 1) && (y % 4 > 1);
                                voxels.push({ pos: new THREE.Vector3(x, y, z), type: isWindow ? 'glass' : 'sandstone_dark' });
                            }
                        }
                    }

                    // Porch at base of curve
                    if (y === 0 && Math.abs(dx) < radius && z < 4) {
                        voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'porch' });
                    }
                }
            }
        }
        return voxels;
    }, [width, height, depth]);

    const materials = {
        sandstone: SANDSTONE_MATERIAL,
        sandstone_dark: SANDSTONE_DARK,
        purple: PURPLE_BANNER,
        porch: PORCH_WHITE,
        glass: WINDOW_GLASS,
        floor: FLOOR_MATERIAL
    };

    return (
        <group position={position}>
            {Object.keys(materials).map((type) => {
                const typeVoxels = voxelData.filter(v => v.type === type);
                if (typeVoxels.length === 0) return null;
                return (
                    <InstancedSubMesh
                        key={type}
                        voxels={typeVoxels}
                        material={materials[type as keyof typeof materials]}
                    />
                );
            })}

            {name && (
                <Html
                    position={[width / 2, height + 2, 0]}
                    center
                    distanceFactor={20}
                    style={{
                        pointerEvents: 'none',
                        color: 'white',
                        background: '#5b21b6',
                        padding: '2px 10px',
                        borderRadius: '2px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        boxShadow: '0 0 10px rgba(91, 33, 182, 0.5)'
                    }}
                >
                    {name}
                </Html>
            )}

            {/* Office Labels */}
            <Html position={[10, 6, 5]} center distanceFactor={12}>
                <div style={{ color: '#fff', background: 'rgba(128,0,128,0.6)', padding: '3px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>REGISTRAR OFFICE</div>
            </Html>
            <Html position={[40, 6, 5]} center distanceFactor={12}>
                <div style={{ color: '#fff', background: 'rgba(128,0,128,0.6)', padding: '3px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>DIRECTOR'S OFFICE</div>
            </Html>
        </group>
    );
};

interface InstancedSubMeshProps {
    voxels: { pos: THREE.Vector3 }[];
    material: THREE.Material;
}

const InstancedSubMesh: React.FC<InstancedSubMeshProps> = ({ voxels, material }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        const dummy = new THREE.Object3D();
        voxels.forEach((v, i) => {
            dummy.position.copy(v.pos);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [voxels]);

    return (
        <instancedMesh ref={meshRef} args={[BOX_GEOMETRY, material, voxels.length]} castShadow receiveShadow />
    );
};
