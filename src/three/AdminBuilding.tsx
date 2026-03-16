import * as THREE from 'three';
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { Html } from '@react-three/drei';

interface AdminBuildingProps {
    position: [number, number, number];
    size?: [number, number, number]; // [width, height, depth]
    name?: string;
    rotation?: [number, number, number];
}

const BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

// Materials matching the drone footage
const FACADE_MATERIAL = new THREE.MeshStandardMaterial({ color: '#e5c9b3', roughness: 0.8 }); // Similar tone to academic
const ROOF_GREY = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.7 });
const WINDOW_GLASS = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.3 }); // Dark windows
const PATH_MATERIAL = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 });
const ACCENT_MATERIAL = new THREE.MeshStandardMaterial({ color: '#b38659', roughness: 0.6 });
const GRASS_MATERIAL = new THREE.MeshStandardMaterial({ color: '#4ade80', roughness: 0.9 });

export const AdminBuilding: React.FC<AdminBuildingProps> = ({
    position,
    size = [50, 16, 25],
    name = "ADMINISTRATIVE BLOCK",
    rotation = [0, 0, 0]
}) => {
    const [width, height, depth] = size;

    const voxelData = useMemo(() => {
        const voxels: { pos: THREE.Vector3, type: 'wall' | 'roof' | 'glass' | 'path' | 'accent' | 'grass' }[] = [];

        const centerX = Math.floor(width / 2);
        const radius = 14;
        const innerRadius = 8;

        // Position the semi-circle center so it curves towards the front (high z)
        const curveCenterZ = depth - radius - 2;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                for (let z = 0; z < depth; z++) {
                    const dx = x - centerX;

                    // Main curved block
                    const dz = z - curveCenterZ;
                    const distToCenter = Math.sqrt(dx * dx + dz * dz);

                    // Top half of circle facing front (+z)
                    const isCurveWall = distToCenter <= radius && distToCenter >= innerRadius && z >= curveCenterZ;

                    // Two straight wings extending to the back (-z)
                    const isLeftWing = x >= centerX - radius - 2 && x <= centerX - radius + 2 && z < curveCenterZ && z > 2;
                    const isRightWing = x >= centerX + radius - 2 && x <= centerX + radius + 2 && z < curveCenterZ && z > 2;

                    const isBuilding = isCurveWall || isLeftWing || isRightWing;

                    if (isBuilding) {
                        const isRoof = y === height - 1;
                        if (isRoof) {
                            voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'roof' });
                        } else {
                            // Windows logic
                            const isOuter = distToCenter >= radius - 1 || distToCenter <= innerRadius + 1;
                            const isWindowPattern = isOuter && (x % 3 === 0) && (y % 4 === 2 || y % 4 === 3);

                            // Central entrance facing +z
                            const isEntrance = Math.abs(dx) < 3 && z > depth - 6 && y < 4;

                            if (isEntrance) {
                                if (y === 0) voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'path' });
                            } else {
                                voxels.push({ pos: new THREE.Vector3(x, y, z), type: isWindowPattern ? 'glass' : 'wall' });
                            }
                        }
                    } else if (y === 0 && z < curveCenterZ && Math.abs(dx) < radius - 2) {
                        // Fill courtyard with grass behind the curve
                        voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'grass' });
                    }
                }
            }
        }
        return voxels;
    }, [width, height, depth]);

    const materials = {
        wall: FACADE_MATERIAL,
        roof: ROOF_GREY,
        glass: WINDOW_GLASS,
        path: PATH_MATERIAL,
        accent: ACCENT_MATERIAL,
        grass: GRASS_MATERIAL
    };

    return (
        <group position={position} rotation={rotation}>
            {['wall', 'roof', 'glass', 'path', 'accent', 'grass'].map((type) => {
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
                    position={[width / 2, height + 4, depth]}
                    center
                    distanceFactor={20}
                    style={{
                        pointerEvents: 'none',
                        color: 'white',
                        background: 'rgba(0,0,0,0.8)',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        border: '2px solid rgba(255,255,255,0.4)'
                    }}
                >
                    {name}
                </Html>
            )}

            <Html position={[width / 2, 6, depth - 2]} center distanceFactor={15}>
                <div style={{ color: '#fff', background: 'rgba(50,50,50,0.6)', padding: '3px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>MAIN OFFICE</div>
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
