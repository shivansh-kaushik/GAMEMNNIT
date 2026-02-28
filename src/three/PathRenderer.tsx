import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PathRendererProps {
    path: { x: number; z: number }[];
}

/**
 * Renders a smooth, glowing navigation path using a curve and tube geometry.
 */
export const PathRenderer: React.FC<PathRendererProps> = ({ path }) => {
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    const curve = useMemo(() => {
        if (!path || path.length < 2) return null;
        const points = path.map(p => new THREE.Vector3(p.x, 0.2, p.z));
        return new THREE.CatmullRomCurve3(points);
    }, [path]);

    useFrame((state) => {
        if (materialRef.current) {
            const time = state.clock.getElapsedTime();
            materialRef.current.emissiveIntensity = 2 + Math.sin(time * 4) * 1.5;
        }
    });

    if (!curve) return null;

    return (
        <group>
            {/* The main glowing line */}
            <mesh>
                <tubeGeometry args={[curve, 64, 0.15, 8, false]} />
                <meshStandardMaterial
                    ref={materialRef}
                    color="#00ff88"
                    emissive="#00ff88"
                    emissiveIntensity={2}
                    transparent
                    opacity={0.8}
                />
            </mesh>

            {/* Markers at each node for better visibility */}
            {path.map((node, i) => (
                <mesh key={`node-${i}`} position={[node.x, 0.2, node.z]}>
                    <sphereGeometry args={[0.3, 16, 16]} />
                    <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1} />
                </mesh>
            ))}
        </group>
    );
};
