import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TransportMode } from '../components/TransportSelector';

interface PlayerAvatarProps {
    position: [number, number, number];
    rotation: number; // Y-axis rotation (heading)
    mode: TransportMode;
}

/** Walking person: capsule body + sphere head */
const WalkingPerson: React.FC<{ time: number }> = ({ time }) => {
    const bobY = Math.sin(time * 8) * 0.05;
    const legSwing = Math.sin(time * 8) * 0.4;

    return (
        <group position={[0, bobY, 0]}>
            {/* Body */}
            <mesh position={[0, 0.7, 0]}>
                <capsuleGeometry args={[0.15, 0.5, 8, 16]} />
                <meshStandardMaterial color="#3b82f6" />
            </mesh>
            {/* Head */}
            <mesh position={[0, 1.15, 0]}>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial color="#fbbf24" />
            </mesh>
            {/* Left Leg */}
            <group position={[-0.08, 0.25, 0]} rotation={[legSwing, 0, 0]}>
                <mesh position={[0, -0.15, 0]}>
                    <capsuleGeometry args={[0.05, 0.25, 4, 8]} />
                    <meshStandardMaterial color="#1e3a5f" />
                </mesh>
            </group>
            {/* Right Leg */}
            <group position={[0.08, 0.25, 0]} rotation={[-legSwing, 0, 0]}>
                <mesh position={[0, -0.15, 0]}>
                    <capsuleGeometry args={[0.05, 0.25, 4, 8]} />
                    <meshStandardMaterial color="#1e3a5f" />
                </mesh>
            </group>
            {/* Left Arm */}
            <group position={[-0.22, 0.85, 0]} rotation={[-legSwing, 0, 0]}>
                <mesh position={[0, -0.12, 0]}>
                    <capsuleGeometry args={[0.04, 0.2, 4, 8]} />
                    <meshStandardMaterial color="#3b82f6" />
                </mesh>
            </group>
            {/* Right Arm */}
            <group position={[0.22, 0.85, 0]} rotation={[legSwing, 0, 0]}>
                <mesh position={[0, -0.12, 0]}>
                    <capsuleGeometry args={[0.04, 0.2, 4, 8]} />
                    <meshStandardMaterial color="#3b82f6" />
                </mesh>
            </group>
        </group>
    );
};

/** Cyclist: person sitting on a bicycle frame */
const Cyclist: React.FC<{ time: number }> = ({ time }) => {
    const wheelSpin = time * 12;
    const pedalAngle = time * 8;

    return (
        <group>
            {/* Bicycle Frame */}
            <group position={[0, 0.35, 0]}>
                {/* Main Frame Bar */}
                <mesh position={[0, 0.15, 0]} rotation={[0, 0, 0.2]}>
                    <boxGeometry args={[0.03, 0.5, 0.03]} />
                    <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Top Bar */}
                <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <boxGeometry args={[0.03, 0.4, 0.03]} />
                    <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Seat Post */}
                <mesh position={[-0.12, 0.4, 0]}>
                    <boxGeometry args={[0.03, 0.15, 0.03]} />
                    <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Seat */}
                <mesh position={[-0.12, 0.48, 0]}>
                    <boxGeometry args={[0.1, 0.03, 0.08]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                {/* Handlebar */}
                <mesh position={[0.18, 0.45, 0]} rotation={[0, 0, 0]}>
                    <boxGeometry args={[0.03, 0.03, 0.2]} />
                    <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
                </mesh>
            </group>

            {/* Front Wheel */}
            <group position={[0.25, 0.2, 0]} rotation={[wheelSpin, 0, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.2, 0.02, 8, 24]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
                {/* Spokes */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.005, 0.005, 0.38, 4]} />
                    <meshStandardMaterial color="#999" metalness={0.9} />
                </mesh>
                <mesh rotation={[Math.PI / 2, Math.PI / 4, 0]}>
                    <cylinderGeometry args={[0.005, 0.005, 0.38, 4]} />
                    <meshStandardMaterial color="#999" metalness={0.9} />
                </mesh>
            </group>

            {/* Rear Wheel */}
            <group position={[-0.25, 0.2, 0]} rotation={[wheelSpin, 0, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.2, 0.02, 8, 24]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.005, 0.005, 0.38, 4]} />
                    <meshStandardMaterial color="#999" metalness={0.9} />
                </mesh>
                <mesh rotation={[Math.PI / 2, Math.PI / 4, 0]}>
                    <cylinderGeometry args={[0.005, 0.005, 0.38, 4]} />
                    <meshStandardMaterial color="#999" metalness={0.9} />
                </mesh>
            </group>

            {/* Pedals (rotating) */}
            <group position={[0, 0.35, 0]} rotation={[pedalAngle, 0, 0]}>
                <mesh position={[0, 0, 0.08]}>
                    <boxGeometry args={[0.06, 0.02, 0.03]} />
                    <meshStandardMaterial color="#666" />
                </mesh>
                <mesh position={[0, 0, -0.08]}>
                    <boxGeometry args={[0.06, 0.02, 0.03]} />
                    <meshStandardMaterial color="#666" />
                </mesh>
            </group>

            {/* Rider Body */}
            <group position={[-0.08, 0.85, 0]}>
                <mesh position={[0, 0, 0]}>
                    <capsuleGeometry args={[0.12, 0.3, 8, 16]} />
                    <meshStandardMaterial color="#00ff88" />
                </mesh>
                {/* Head */}
                <mesh position={[0, 0.28, 0]}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshStandardMaterial color="#fbbf24" />
                </mesh>
                {/* Helmet */}
                <mesh position={[0, 0.32, 0]}>
                    <sphereGeometry args={[0.11, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color="#ef4444" />
                </mesh>
            </group>
        </group>
    );
};

/** Car: simple low-poly car shape */
const Car: React.FC<{ time: number }> = ({ time }) => {
    const wheelSpin = time * 15;

    return (
        <group>
            {/* Car Body */}
            <mesh position={[0, 0.35, 0]}>
                <boxGeometry args={[1.8, 0.35, 0.8]} />
                <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Cabin */}
            <mesh position={[0.05, 0.6, 0]}>
                <boxGeometry args={[0.9, 0.3, 0.7]} />
                <meshStandardMaterial color="#60a5fa" metalness={0.3} roughness={0.2} transparent opacity={0.7} />
            </mesh>
            {/* Hood */}
            <mesh position={[0.6, 0.42, 0]}>
                <boxGeometry args={[0.5, 0.05, 0.75]} />
                <meshStandardMaterial color="#2563eb" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Headlights */}
            <mesh position={[0.91, 0.35, 0.25]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0.91, 0.35, -0.25]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.5} />
            </mesh>
            {/* Tail Lights */}
            <mesh position={[-0.91, 0.35, 0.25]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[-0.91, 0.35, -0.25]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
            </mesh>

            {/* Wheels */}
            {[
                [0.55, 0.15, 0.42],
                [0.55, 0.15, -0.42],
                [-0.55, 0.15, 0.42],
                [-0.55, 0.15, -0.42]
            ].map((pos, i) => (
                <group key={i} position={pos as [number, number, number]} rotation={[wheelSpin, 0, 0]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.13, 0.13, 0.08, 12]} />
                        <meshStandardMaterial color="#222" />
                    </mesh>
                    {/* Rim */}
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.07, 0.07, 0.09, 8]} />
                        <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.1} />
                    </mesh>
                </group>
            ))}
        </group>
    );
};

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ position, rotation, mode }) => {
    const groupRef = useRef<THREE.Group>(null);
    const timeRef = useRef(0);

    useFrame((_, delta) => {
        timeRef.current += delta;
        if (groupRef.current) {
            // Smooth lerp to target position
            groupRef.current.position.lerp(
                new THREE.Vector3(position[0], 0, position[2]),
                0.1
            );
            // Smooth rotation
            const targetQuat = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(0, rotation, 0)
            );
            groupRef.current.quaternion.slerp(targetQuat, 0.1);
        }
    });

    return (
        <group ref={groupRef} position={[position[0], 0, position[2]]}>
            {mode === 'walk' && <WalkingPerson time={timeRef.current} />}
            {mode === 'cycle' && <Cyclist time={timeRef.current} />}
            {mode === 'car' && <Car time={timeRef.current} />}
        </group>
    );
};
