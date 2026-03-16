import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NavigationArrowProps {
    playerPos: [number, number, number];
    targetPos: [number, number, number] | null;
}

export const NavigationArrow: React.FC<NavigationArrowProps> = ({ playerPos, targetPos }) => {
    const groupRef = useRef<THREE.Group>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const timeRef = useRef(0);

    useFrame((_, delta) => {
        timeRef.current += delta;
        if (!groupRef.current || !targetPos) return;

        // Calculate direction toward target
        const dx = targetPos[0] - playerPos[0];
        const dz = targetPos[2] - playerPos[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);

        // Place arrow 6 units ahead of player, in the direction of the target, at ground level
        const aheadDist = Math.min(6, dist * 0.4); // Don't overshoot if close
        const bobY = Math.sin(timeRef.current * 3) * 0.2;
        groupRef.current.position.set(
            playerPos[0] + (dx / dist) * aheadDist,
            0.5 + bobY,
            playerPos[2] + (dz / dist) * aheadDist
        );

        // Rotate to point at target
        groupRef.current.rotation.y = angle;

        // Pulse the glow
        if (glowRef.current) {
            const scale = 1 + Math.sin(timeRef.current * 5) * 0.15;
            glowRef.current.scale.set(scale, scale, scale);
        }
    });

    if (!targetPos) return null;

    // Calculate distance for the HUD
    const dx = targetPos[0] - playerPos[0];
    const dz = targetPos[2] - playerPos[2];
    const distance = Math.sqrt(dx * dx + dz * dz);

    return (
        <group ref={groupRef}>
            {/* Main Arrow - GTA-style chevron pointing forward (along Z) */}
            {/* Arrow body */}
            <mesh position={[0, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.5, 1.2, 4]} />
                <meshStandardMaterial
                    color="#ff2d55"
                    emissive="#ff2d55"
                    emissiveIntensity={1.5}
                    transparent
                    opacity={0.9}
                />
            </mesh>

            {/* Arrow tail / stem */}
            <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[0.3, 0.6, 0.15]} />
                <meshStandardMaterial
                    color="#ff2d55"
                    emissive="#ff2d55"
                    emissiveIntensity={1.2}
                    transparent
                    opacity={0.85}
                />
            </mesh>

            {/* Outer glow ring */}
            <mesh ref={glowRef} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.0, 0.05, 8, 32]} />
                <meshStandardMaterial
                    color="#ff6b9d"
                    emissive="#ff2d55"
                    emissiveIntensity={2}
                    transparent
                    opacity={0.4}
                />
            </mesh>

            {/* Inner ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.7, 0.03, 8, 24]} />
                <meshStandardMaterial
                    color="#ff2d55"
                    emissive="#ff2d55"
                    emissiveIntensity={1.5}
                    transparent
                    opacity={0.6}
                />
            </mesh>

            {/* Distance marker - small floating text pillar */}
            <mesh position={[0, 1.2, 0]}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshStandardMaterial
                    color="#00ff88"
                    emissive="#00ff88"
                    emissiveIntensity={2}
                    transparent
                    opacity={0.8}
                />
            </mesh>

            {/* Point light for the glow effect */}
            <pointLight color="#ff2d55" intensity={3} distance={8} decay={2} />
        </group>
    );
};
