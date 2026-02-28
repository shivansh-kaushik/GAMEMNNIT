import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PathNode } from '../core/Pathfinder';
import * as THREE from 'three';

interface PathRendererProps {
    path: PathNode[];
}

/**
 * Renders a glowing green trail for the navigation path.
 */
export const PathRenderer: React.FC<PathRendererProps> = ({ path }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.getElapsedTime();
        groupRef.current.children.forEach((child, i) => {
            const mesh = child as THREE.Mesh;
            const material = mesh.material as THREE.MeshBasicMaterial;
            // Subtle pulse and wave effect
            const offset = i * 0.1;
            const pulse = Math.sin(time * 3 + offset) * 0.2 + 0.8;
            material.opacity = pulse * 0.6;
        });
    });

    if (!path || path.length === 0) return null;

    return (
        <group ref={groupRef}>
            {path.map((node, i) => (
                <mesh
                    key={`${node.x}-${node.z}-${i}`}
                    position={[node.x + 0.5, 0.15, node.z + 0.5]}
                >
                    <boxGeometry args={[0.7, 0.08, 0.7]} />
                    <meshBasicMaterial
                        color="#00ff88"
                        transparent
                        opacity={0.6}
                        depthWrite={false}
                    />
                </mesh>
            ))}
        </group>
    );
};
