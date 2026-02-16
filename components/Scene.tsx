
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useLoader, ThreeElements, useThree } from '@react-three/fiber';
import { RoundedBox, Text, Sphere, Box, Cylinder, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import {
  ACCESS_POINTS, MOVEMENT_SPEED, VERTICAL_SPEED,
  REACH_THRESHOLD, PLAYER_START_POS, FLOOR_HEIGHT, CUSTOM_MODEL_URL,
  CAMPUS_BUILDINGS // MODEL_CONFIG removed as it is unused in simple mesh
} from '../constants';
import { Building, RSSIReading } from '../types';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements { }
  }
}

/**
 * Interface for Scene component props
 */
interface SceneProps {
  targetBuilding?: Building;
  onReached: () => void;
  onMove: (distance: number) => void;
  onWifiUpdate: (readings: RSSIReading[], floor: number, confidence: number) => void;
  isComplete: boolean;
  researchMode: boolean;
}



const PlayerModel: React.FC = () => {
  // Use simple geometry instead of loading external OBJ to prevent crashes
  return (
    <mesh castShadow receiveShadow position={[0, 1, 0]}>
      <capsuleGeometry args={[0.5, 1.8, 4, 8]} />
      <meshStandardMaterial color="#3b82f6" />
      <mesh position={[0, 0.5, 0.4]}>
        <boxGeometry args={[0.6, 0.2, 0.2]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </mesh>
  );
};

const NavigationPath: React.FC<{ playerPos: THREE.Vector3, targetPos: THREE.Vector3 }> = ({ playerPos, targetPos }) => {
  const points = useMemo(() => {
    const p = [];
    // Create more points for a smoother path visualization
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      const vec = new THREE.Vector3().lerpVectors(playerPos, targetPos, i / steps);
      // Raycast height adjustment could be here, but flat map is fine for now
      vec.y = 0.2;
      p.push(vec);
    }
    return p;
  }, [playerPos, targetPos]);

  return (
    <group>
      {points.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]} lookAt={() => targetPos}>
          {/* Navigation Arrows on the ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.2, 0.6, 3]} /* triangle shape */ />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.6 - (i / 25)} />
          </mesh>
        </group>
      ))}
      {/* Dynamic line connecting user to target */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(v => [v.x, v.y, v.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" transparent opacity={0.2} linewidth={1} />
      </line>
    </group>
  );
};

const Scene: React.FC<SceneProps & { onPositionUpdate?: (pos: [number, number, number]) => void }> = ({
  targetBuilding, onReached, onMove, onWifiUpdate, isComplete, researchMode, onPositionUpdate
}) => {
  const playerRef = useRef<THREE.Group>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const { gl, camera } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => setKeys(k => ({ ...k, [e.code]: true }));
    const handleKeyUp = (e: KeyboardEvent) => setKeys(k => ({ ...k, [e.code]: false }));
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Pointer-lock: click canvas to lock, mousemove updates yaw/pitch
    const elem = gl?.domElement as HTMLElement | undefined;
    const onClick = () => { if (elem && document.pointerLockElement !== elem) elem.requestPointerLock?.(); };
    const onMouseMove = (e: MouseEvent) => {
      if (!elem) return;
      if (document.pointerLockElement === elem) {
        const sensitivity = 0.0025;
        yaw.current -= e.movementX * sensitivity;
        pitch.current -= e.movementY * sensitivity;
        const limit = Math.PI / 2 - 0.05;
        pitch.current = Math.max(-limit, Math.min(limit, pitch.current));
      }
    };

    if (elem) {
      elem.addEventListener('click', onClick);
      document.addEventListener('mousemove', onMouseMove);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (elem) {
        elem.removeEventListener('click', onClick);
        document.removeEventListener('mousemove', onMouseMove);
      }
    };
  }, []);

  useFrame((state) => {
    if (isComplete || !playerRef.current) return;

    const moveVector = new THREE.Vector3(0, 0, 0);
    if (keys['KeyW'] || keys['ArrowUp']) moveVector.z -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveVector.z += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveVector.x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveVector.x += 1;

    if (keys['Space']) playerRef.current.position.y += VERTICAL_SPEED;
    if (keys['ShiftLeft']) playerRef.current.position.y = Math.max(0.5, playerRef.current.position.y - VERTICAL_SPEED);

    if (moveVector.length() > 0) {
      moveVector.normalize().multiplyScalar(MOVEMENT_SPEED);

      // Collision handling: treat player as a sphere and buildings as AABBs.
      const radius = 0.6;
      const tryMove = (delta: THREE.Vector3) => {
        const nextPos = playerRef.current!.position.clone().add(delta);
        // Check against all campus building AABBs
        for (const b of CAMPUS_BUILDINGS) {
          const half = new THREE.Vector3(b.size[0] / 2, b.size[1] / 2, b.size[2] / 2);
          const center = new THREE.Vector3(...b.position);
          const min = center.clone().sub(half);
          const max = center.clone().add(half);

          // Clamp point on AABB to sphere center
          const clamped = new THREE.Vector3(
            Math.max(min.x, Math.min(max.x, nextPos.x)),
            Math.max(min.y, Math.min(max.y, nextPos.y)),
            Math.max(min.z, Math.min(max.z, nextPos.z))
          );

          const distSq = clamped.distanceToSquared(nextPos);
          if (distSq <= radius * radius) {
            return true; // collision
          }
        }
        return false;
      };

      // Try full movement first
      if (!tryMove(moveVector)) {
        playerRef.current.position.add(moveVector);
        onMove(moveVector.length());
      } else {
        // Try sliding: X only then Z only
        const moveX = new THREE.Vector3(moveVector.x, 0, 0);
        const moveZ = new THREE.Vector3(0, 0, moveVector.z);
        if (!tryMove(moveX)) {
          playerRef.current.position.add(moveX);
          onMove(moveX.length());
        } else if (!tryMove(moveZ)) {
          playerRef.current.position.add(moveZ);
          onMove(moveZ.length());
        }
      }

      const angle = Math.atan2(moveVector.x, moveVector.z);
      playerRef.current.rotation.y = THREE.MathUtils.lerp(playerRef.current.rotation.y, angle, 0.1);
    }

    // Broadcast position for HUD/MiniMap
    if (onPositionUpdate) {
      onPositionUpdate([playerRef.current.position.x, playerRef.current.position.y, playerRef.current.position.z]);
    }

    const readings: RSSIReading[] = ACCESS_POINTS.map(ap => {
      const apPos = new THREE.Vector3(...ap.position);
      const dist = playerRef.current!.position.distanceTo(apPos);
      const rssi = Math.round(-30 - 20 * Math.log10(Math.max(1, dist)) + (Math.random() * 2 - 1));
      return { ssid: ap.ssid, rssi, distance: dist };
    }).sort((a, b) => b.rssi - a.rssi);

    const rawFloor = Math.floor(playerRef.current.position.y / FLOOR_HEIGHT);
    onWifiUpdate(readings, rawFloor, 0.9 + Math.random() * 0.05);

    // Camera behavior: if pointer-locked, use first-person camera (mouse-look), else chase camera
    const elem = gl?.domElement as HTMLElement | undefined;
    const isLocked = elem ? document.pointerLockElement === elem : false;
    if (isLocked) {
      // First-person camera position and rotation
      const targetCamPos = new THREE.Vector3(
        playerRef.current.position.x,
        playerRef.current.position.y + 1.6,
        playerRef.current.position.z
      );
      camera.position.lerp(targetCamPos, 0.18);
      const e = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
      const q = new THREE.Quaternion().setFromEuler(e);
      camera.quaternion.slerp(q, 0.18);
    } else {
      state.camera.position.lerp(
        new THREE.Vector3(
          playerRef.current.position.x,
          playerRef.current.position.y + 15,
          playerRef.current.position.z + 20
        ),
        0.08
      );
      state.camera.lookAt(playerRef.current.position);
    }

    if (targetBuilding) {
      const targetPos = new THREE.Vector3(...targetBuilding.position);
      if (arrowRef.current) arrowRef.current.lookAt(targetPos);
      if (playerRef.current.position.distanceTo(targetPos) < REACH_THRESHOLD) onReached();
    }
  });

  return (
    <>
      <group ref={playerRef} position={PLAYER_START_POS}>
        <PlayerModel />
        {targetBuilding && !isComplete && (
          <group ref={arrowRef} position={[0, 4.5, 0]}>
            {/* Improved 3D Arrow Indicator */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.5, 1.5, 4]} /> {/* Pyramid style */}
              <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 1]}>
              <cylinderGeometry args={[0.2, 0.2, 1]} />
              <meshStandardMaterial color="#ef4444" />
            </mesh>
          </group>
        )}
      </group>

      {targetBuilding && playerRef.current && (
        <NavigationPath
          playerPos={playerRef.current.position.clone()}
          targetPos={new THREE.Vector3(...targetBuilding.position)}
        />
      )}

      {researchMode && ACCESS_POINTS.map(ap => (
        <group key={ap.id} position={ap.position}>
          <Sphere args={[0.3, 16, 16]}>
            <meshBasicMaterial color="#3b82f6" />
          </Sphere>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[4.8, 5, 64]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
          </mesh>
        </group>
      ))}
    </>
  );
};

export default Scene;
