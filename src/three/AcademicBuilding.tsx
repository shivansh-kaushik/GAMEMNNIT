import * as THREE from 'three';
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { Html } from '@react-three/drei';

interface AcademicBuildingProps {
    position: [number, number, number];
    size?: [number, number, number]; // [width, height, depth]
    name?: string;
    rotation?: [number, number, number];
}

const BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

// Materials matching the drone footage
const FACADE_BEIGE = new THREE.MeshStandardMaterial({ color: '#e5c9b3', roughness: 0.8 }); // Pinkish/beige tone
const ROOF_GREY = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.7 });
const GRASS_MATERIAL = new THREE.MeshStandardMaterial({ color: '#4ade80', roughness: 0.9 });
const GLASS_MATERIAL = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.3 }); // Dark windows
const PATH_MATERIAL = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.6 });
const BRICK_MATERIAL = new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.8 }); // Red central tower
const FIN_MATERIAL = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.4 }); // White vertical fins

export const AcademicBuilding: React.FC<AcademicBuildingProps> = ({
    position,
    size = [40, 12, 30],
    name = "ACADEMIC BUILDING",
    rotation = [0, 0, 0]
}) => {
    const [width, height, depth] = size;
    const midX = Math.floor(width / 2);

    // Define the voxel structure
    const voxelData = useMemo(() => {
        const voxels: { pos: THREE.Vector3, type: 'wall' | 'roof' | 'glass' | 'grass' | 'path' | 'floor' | 'brick' | 'fin' }[] = [];

        // Building Dimensions Reference: [210, 12, 170]
        const wallThickness = 2;
        const floorHeight = 4;

        const midZ = Math.floor(depth / 2);
        const towerWidthZ = 40; // Tower in center
        const towerProtrusion = 4;

        // Horizontal corridors (West-East)
        const corridor1Z = 50;
        const corridor2Z = 120;
        const corridorWidth = 6;

        // Vertical corridor (interconnect)
        const verticalCorridorWidth = 6;

        for (let y = 0; y < height; y++) {
            const isFloorSlab = y === 0 || y === 4 || y === 8;
            const isRoofSlab = y === height - 1;
            const isTowerY = y < height + 4; // Central tower can be taller

            for (let x = 0; x < width; x++) {
                for (let z = 0; z < depth; z++) {
                    // 1. Exterior Shell
                    const isNorthWall = z < wallThickness;
                    const isSouthWall = z >= depth - wallThickness;
                    const isWestWall = x < wallThickness;
                    const isEastWall = x >= width - wallThickness;
                    const isOuterWall = isNorthWall || isSouthWall || isWestWall || isEastWall;

                    // Central Tower Logic (Brick)
                    const isTowerZ = z >= midZ - towerWidthZ / 2 && z < midZ + towerWidthZ / 2;
                    const isTowerX = (x < wallThickness + towerProtrusion && x >= 0);
                    const isCentralTower = isTowerZ && isTowerX && isWestWall;

                    // Library Section Logic (SE corner for vertical fins)
                    const isLibraryArea = x >= width - wallThickness && z > corridor2Z;

                    // 2. Corridors
                    const isInHorizCorridor = (z >= corridor1Z && z < corridor1Z + corridorWidth) ||
                        (z >= corridor2Z && z < corridor2Z + corridorWidth);
                    const isInVertCorridor = (x >= midX - verticalCorridorWidth / 2 && x < midX + verticalCorridorWidth / 2);
                    const isInAnyCorridor = isInHorizCorridor || isInVertCorridor;

                    // Gate Locations
                    // Front (West, x=0)
                    const isMainGate = x < 2 && z > midZ - 5 && z < midZ + 5 && y < 4; // Main gate center
                    const isFrontSecGate = x < 2 && z > 20 && z < 30 && y < 4; // Front secondary (North)

                    // Back (East, x=width)
                    const isBackSecGate = x >= width - 2 && z > 20 && z < 30 && y < 4; // Back secondary (North)
                    const isLibraryGate = x >= width - 2 && z > depth - 30 && z < depth - 20 && y < 4; // Library gate (South)

                    const isAnyGate = isMainGate || isFrontSecGate || isBackSecGate || isLibraryGate;

                    if (isRoofSlab || (isTowerY && isCentralTower && y >= height - 1)) {
                        if (isOuterWall || x % 20 === 0 || z % 20 === 0 || isCentralTower) {
                            voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'roof' });
                        }
                    } else if (isFloorSlab) {
                        voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'floor' });
                    } else if (isOuterWall) {
                        if (isAnyGate) {
                            if (y === 0) voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'path' });
                        } else if (isCentralTower) {
                            voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'brick' });
                        } else if (isLibraryArea && x === width - 1 && z % 4 === 0) {
                            // Vertical fins for library facade
                            voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'fin' });
                        } else {
                            // Windows pattern
                            const isWindowSpace = (x % 6 === 0 || z % 6 === 0) && (y % floorHeight >= 2);
                            voxels.push({ pos: new THREE.Vector3(x, y, z), type: isWindowSpace ? 'glass' : 'wall' });
                        }
                    } else {
                        // Internal Walls
                        const isInteriorWall =
                            (Math.abs(z - corridor1Z) < 1) || (Math.abs(z - (corridor1Z + corridorWidth)) < 1) ||
                            (Math.abs(z - corridor2Z) < 1) || (Math.abs(z - (corridor2Z + corridorWidth)) < 1) ||
                            (Math.abs(x - midX) < 1);

                        if (isInteriorWall && !isInAnyCorridor) {
                            voxels.push({ pos: new THREE.Vector3(x, y, z), type: 'wall' });
                        }
                    }
                }
            }
        }

        return voxels;
    }, [width, height, depth, midX]);

    const materials = useMemo(() => ({
        wall: FACADE_BEIGE,
        roof: ROOF_GREY,
        glass: GLASS_MATERIAL,
        grass: GRASS_MATERIAL,
        path: PATH_MATERIAL,
        floor: new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.5 }),
        brick: BRICK_MATERIAL,
        fin: FIN_MATERIAL
    }), []);

    return (
        <group position={position} rotation={rotation}>
            {['wall', 'roof', 'glass', 'grass', 'path', 'floor', 'brick', 'fin'].map((type) => {
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
                    position={[width / 2, height + 3, 0]}
                    center
                    distanceFactor={20}
                    style={{
                        pointerEvents: 'none',
                        color: '#ffffff',
                        background: 'rgba(0,0,0,0.8)',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        border: '2px solid rgba(255,255,255,0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}
                >
                    {name}
                </Html>
            )}

            {/* Department Labels - Interior Positioning */}
            <Html position={[midX / 2, 2, 25]} center distanceFactor={15}>
                <div style={labelStyle}>MATH / MECH DEPT</div>
            </Html>
            <Html position={[midX + midX / 2, 2, 25]} center distanceFactor={15}>
                <div style={labelStyle}>ELECTRICAL DEPT</div>
            </Html>
            <Html position={[30, 2, 85]} center distanceFactor={15}>
                <div style={labelStyle}>BIOMEDICAL LAB</div>
            </Html>
            <Html position={[midX, 2, 85]} center distanceFactor={15}>
                <div style={labelStyle}>STAIRS (FLR 0-2)</div>
            </Html>
            <Html position={[midX / 2, 2, 145]} center distanceFactor={15}>
                <div style={labelStyle}>BIOTECH DEPT</div>
            </Html>
            <Html position={[midX + midX / 2, 2, 145]} center distanceFactor={15}>
                <div style={labelStyle}>CENTRAL LIBRARY</div>
            </Html>

            {/* Gate Labels */}
            <Html position={[0, 2, depth / 2]} center distanceFactor={10}>
                <div style={{ ...labelStyle, background: '#ef4444' }}>MAIN GATE (FRONT)</div>
            </Html>
            <Html position={[0, 2, 25]} center distanceFactor={10}>
                <div style={{ ...labelStyle, background: '#3b82f6' }}>FRONT SECONDARY GATE</div>
            </Html>
            <Html position={[width, 2, 25]} center distanceFactor={10}>
                <div style={{ ...labelStyle, background: '#3b82f6' }}>BACK GATE (NORTH)</div>
            </Html>
            <Html position={[width, 2, depth - 25]} center distanceFactor={10}>
                <div style={{ ...labelStyle, background: '#ef4444' }}>LIBRARY GATE (BACK)</div>
            </Html>
        </group>
    );
};

const labelStyle: React.CSSProperties = {
    color: '#fff',
    background: 'rgba(0,0,0,0.7)',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    border: '1px solid rgba(255,255,255,0.2)'
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

