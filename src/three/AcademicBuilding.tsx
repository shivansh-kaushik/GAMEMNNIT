import * as THREE from 'three';
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { Html } from '@react-three/drei';

interface AcademicBuildingProps {
    position: [number, number, number];
    size?: [number, number, number]; // [width, height, depth]
    color?: string;
    name?: string;
}

const BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

// Materials
const FACADE_MAROON = new THREE.MeshStandardMaterial({ color: '#742a2a', roughness: 0.4 }); // Central block
const FACADE_BEIGE = new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.7 });  // Side wings
const PORCH_WHITE = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 });   // Entrance porch
const FLOOR_MATERIAL = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.8 });
const GLASS_MATERIAL = new THREE.MeshStandardMaterial({ color: '#93c5fd', transparent: true, opacity: 0.4, metalness: 0.8 });
const GRASS_MATERIAL = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.9 });
const STAIRS_MATERIAL = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.5 });
const WALL_MATERIAL = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.6 }); // Retained for internal walls

export const AcademicBuilding: React.FC<AcademicBuildingProps> = ({
    position,
    size = [40, 12, 30], // Default size for the detailed model
    name = "ACADEMIC BUILDING"
}) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const [width, height, depth] = size;

    // Define the voxel structure
    const voxelData = useMemo(() => {
        const voxels: { pos: THREE.Vector3, type: 'wall' | 'floor' | 'glass' | 'grass' | 'stairs' | 'maroon' | 'porch' | 'beige' }[] = [];

        const floorHeight = 4;
        const centerX = Math.floor(width / 2);
        const centralBlockWidth = 10;
        const porchHeight = 2;

        for (let y = 0; y < height; y++) {
            const isFloorBase = y % floorHeight === 0;

            for (let x = 0; x < width; x++) {
                for (let z = 0; z < depth; z++) {
                    const isOuterWall = x === 0 || x === width - 1 || z === 0 || z === depth - 1;
                    const isFrontWall = z === 0;

                    // Central Block Region
                    const isCentralX = x >= centerX - centralBlockWidth / 2 && x <= centerX + centralBlockWidth / 2;
                    const isCentralBlock = isCentralX && isFrontWall;
                    const isPorchArea = isCentralX && z === 0 && y < porchHeight;

                    // Gardens (3 internal gardens)
                    const isGarden1 = x > 8 && x < 15 && z > 10 && z < 18;
                    const isGarden2 = x > 25 && x < 32 && z > 10 && z < 18;
                    const isGarden3 = x > 15 && x < 25 && z > 20 && z < 27;
                    const isGarden = isGarden1 || isGarden2 || isGarden3;

                    // Circular Stairs
                    const distToStairs = Math.sqrt(Math.pow(x - 15, 2) + Math.pow(z - 18, 2));
                    const isStairs = distToStairs < 2 && !isFloorBase;

                    if (isGarden) {
                        if (y === 0) voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'grass' });
                        continue;
                    }

                    if (isFloorBase && !isPorchArea) {
                        voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'floor' });
                    }

                    // Porch logic
                    if (isPorchArea) {
                        const isMainEntryWay = x > centerX - 2 && x < centerX + 2 && y < 3;
                        if (!isMainEntryWay || y === porchHeight - 1) {
                            voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'porch' });
                        }
                        continue;
                    }

                    if (isOuterWall) {
                        if (isCentralBlock) {
                            // The central maroon block is taller
                            const isTallSection = y < height + 4; // Extend height for central block
                            if (isTallSection) {
                                voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'maroon' });
                            }
                        } else {
                            // Side wings (beige/yellow)
                            const isWindow = (x % 4 === 0 || x % 4 === 1) && (y % floorHeight > 1);
                            voxels.push({ pos: new THREE.Vector3(x, y, z), type: isWindow ? 'glass' : 'beige' });
                        }
                    } else if (isStairs) {
                        const angle = (y * Math.PI) / 2;
                        const sx = Math.round(15 + Math.cos(angle) * 1.2);
                        const sz = Math.round(18 + Math.sin(angle) * 1.2);
                        if (x === sx && z === sz) {
                            voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'stairs' });
                        }
                    } else {
                        // Internal walls (simplified)
                        const isCorridor = z === 8 || z === 18;
                        if (isCorridor && y % floorHeight !== 0) {
                            voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'wall' });
                        }
                    }
                }
            }
        }
        return voxels;
    }, [width, height, depth]);

    // Materials map
    const materials = useMemo(() => ({
        wall: WALL_MATERIAL,
        floor: FLOOR_MATERIAL,
        glass: GLASS_MATERIAL,
        grass: GRASS_MATERIAL,
        stairs: STAIRS_MATERIAL,
        maroon: FACADE_MAROON,
        porch: PORCH_WHITE,
        beige: FACADE_BEIGE
    }), []);

    useLayoutEffect(() => {
        if (!meshRef.current) return;

        // Note: For multi-material instanced mesh, usually you'd need multiple meshes.
        // But for voxels, we can also use groups or just focus on the main structure.
        // To keep it clean and performant, I'll use a single material for now OR
        // just draw the walls and floor as main.
    }, []);

    return (
        <group position={position}>
            {/* We'll use multiple instanced meshes for different materials to get the look right */}
            {['wall', 'floor', 'glass', 'grass', 'stairs', 'maroon', 'porch', 'beige'].map((type) => {
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
                    position={[width / 2, height + 2, depth / 2]}
                    center
                    distanceFactor={20}
                    style={{
                        pointerEvents: 'none',
                        color: '#00ff88',
                        background: 'rgba(0,0,0,0.8)',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        border: '2px solid #00ff88',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}
                >
                    {name}
                </Html>
            )}

            {/* Internal Floor Labels */}
            <Html position={[8, 2, 8]} center distanceFactor={15}>
                <div style={{ color: '#aaa', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '3px', fontSize: '10px' }}>MECHANICAL DEPT (GF)</div>
            </Html>
            <Html position={[32, 2, 8]} center distanceFactor={15}>
                <div style={{ color: '#aaa', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '3px', fontSize: '10px' }}>ELECTRICAL DEPT (GF)</div>
            </Html>
            <Html position={[8, 6, 18]} center distanceFactor={15}>
                <div style={{ color: '#aaa', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '3px', fontSize: '10px' }}>BIOTECH DEPT (1F)</div>
            </Html>
            <Html position={[32, 6, 18]} center distanceFactor={15}>
                <div style={{ color: '#aaa', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '3px', fontSize: '10px' }}>MATH DEPT (1F)</div>
            </Html>
            <Html position={[Math.floor(width / 2), 10, 15]} center distanceFactor={15}>
                <div style={{ color: '#00ff88', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', border: '1px solid #00ff88', fontSize: '12px', fontWeight: 'bold' }}>CENTRAL LIBRARY (2F)</div>
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
