import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { RoundedBox, Text, Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { CAMPUS_BUILDINGS } from '../constants';

interface CampusEnvironmentProps {
    targetBuildingId?: string;
}

const Tree: React.FC<{ position: [number, number, number] }> = ({ position }) => (
    <group position={position}>
        <Cylinder args={[0.2, 0.3, 2, 8]} position={[0, 1, 0]} castShadow>
            <meshStandardMaterial color="#3d2b1f" />
        </Cylinder>
        <Sphere args={[1.5, 8, 8]} position={[0, 2.5, 0]} castShadow>
            <meshStandardMaterial color="#065f46" />
        </Sphere>
    </group>
);

const CampusEnvironment: React.FC<CampusEnvironmentProps> = ({ targetBuildingId }) => {
    // Load the custom satellite map using standard loader for debugging
    const mapTexture = useLoader(THREE.TextureLoader, '/campus_map.jpg');
    console.log("CampusEnvironment Rendered. Texture:", mapTexture);

    const treePositions = useMemo(() => {
        return Array.from({ length: 40 }).map(() => [
            (Math.random() - 0.5) * 180,
            0,
            (Math.random() - 0.5) * 180
        ] as [number, number, number]).filter(pos => {
            return !CAMPUS_BUILDINGS.some(b =>
                Math.abs(pos[0] - b.position[0]) < b.size[0] / 2 + 2 &&
                Math.abs(pos[2] - b.position[2]) < b.size[2] / 2 + 2
            );
        });
    }, []);

    return (
        <>
            {/* Ground Plane - Satellite Map (200 Acres ~ 900x900m) */}
            {/* Using MeshBasicMaterial to ignore lighting/shadows and ensure map is always visible */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
                <planeGeometry args={[900, 900]} />
                <meshBasicMaterial map={mapTexture} color="#ffffff" side={THREE.DoubleSide} />
            </mesh>
            <gridHelper args={[900, 90, "#ffffff", "#ffffff"]} position={[0, 0.1, 0]} material-opacity={0.1} material-transparent />

            {/* Campus Buildings */}
            {CAMPUS_BUILDINGS.map(b => (
                <group key={b.id} position={b.position}>
                    <RoundedBox args={b.size} radius={0.5} smoothness={4} castShadow receiveShadow>
                        <meshStandardMaterial
                            color={b.color}
                            emissive={targetBuildingId === b.id ? b.color : "black"}
                            emissiveIntensity={targetBuildingId === b.id ? 0.5 : 0}
                            transparent opacity={0.9}
                        />
                    </RoundedBox>
                    {/* Floating Label */}
                    <group position={[0, b.size[1] / 2 + 3, 0]}>
                        <Text fontSize={2} color="white" anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#000000">
                            {b.name}
                        </Text>
                        <mesh position={[0, -1.5, 0]}>
                            <sphereGeometry args={[0.5]} />
                            <meshBasicMaterial color={b.color} />
                        </mesh>
                        <mesh position={[0, -2.5, 0]}>
                            <cylinderGeometry args={[0.1, 0.1, 2]} />
                            <meshBasicMaterial color={b.color} />
                        </mesh>
                    </group>
                </group>
            ))}

            {/* Trees */}
            {treePositions.map((pos, i) => <Tree key={i} position={pos} />)}
        </>
    );
};

export default CampusEnvironment;
