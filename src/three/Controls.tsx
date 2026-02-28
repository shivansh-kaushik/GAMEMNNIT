import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls as PointerLockControlsImpl } from '@react-three/drei';
import * as THREE from 'three';

const MOVE_SPEED = 5;
const JUMP_FORCE = 5;
const GRAVITY = -15;
const PLAYER_HEIGHT = 1.7;
const VERTICAL_SPEED = 6;

interface ControlsProps {
    isAdmin?: boolean;
    onPlaceBlock?: (position: [number, number, number]) => void;
    mobileInput?: { forward: number; turn: number; jump: boolean; down: boolean; lookDx: number; lookDy: number };
    onPositionUpdate?: (position: [number, number, number]) => void;
    onLookConsumed?: () => void;
    overridePosition?: [number, number, number] | null;
    selectedBlock?: { color: string; type: 'B' | 'R' };
}

export const Controls: React.FC<ControlsProps> = ({
    isAdmin = false,
    onPlaceBlock,
    mobileInput,
    onPositionUpdate,
    onLookConsumed,
    overridePosition = null,
    selectedBlock
}) => {
    const { camera, scene, raycaster } = useThree();
    const velocity = useRef(new THREE.Vector3());
    const moveDirection = useRef({ forward: false, backward: false, left: false, right: false, up: false, down: false });
    const canJump = useRef(false);
    const [isTouch, setIsTouch] = useState(false);
    const lastEmitTime = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'KeyW': moveDirection.current.forward = true; break;
                case 'KeyS': moveDirection.current.backward = true; break;
                case 'KeyA': moveDirection.current.left = true; break;
                case 'KeyD': moveDirection.current.right = true; break;
                case 'Space': moveDirection.current.up = true; break;
                case 'ControlLeft': case 'ControlRight': moveDirection.current.down = true; break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'KeyW': moveDirection.current.forward = false; break;
                case 'KeyS': moveDirection.current.backward = false; break;
                case 'KeyA': moveDirection.current.left = false; break;
                case 'KeyD': moveDirection.current.right = false; break;
                case 'Space': moveDirection.current.up = false; break;
                case 'ControlLeft': case 'ControlRight': moveDirection.current.down = false; break;
            }
        };

        const handleClick = () => {
            if (!isAdmin || !onPlaceBlock) return;
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
            if (intersects.length > 0) {
                const hit = intersects[0];
                const normal = hit.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
                if (hit.object instanceof THREE.Mesh) normal.applyQuaternion(hit.object.quaternion);
                const placePos = hit.point.clone().add(normal.multiplyScalar(0.5));
                onPlaceBlock([Math.floor(placePos.x), Math.floor(placePos.y), Math.floor(placePos.z)]);
            }
        };

        const detectTouch = () => {
            setIsTouch(true);
            window.removeEventListener('touchstart', detectTouch);
        };

        const handleBlur = () => {
            moveDirection.current = { forward: false, backward: false, left: false, right: false, up: false, down: false };
        };

        const handleLockChange = () => {
            if (!document.pointerLockElement) {
                handleBlur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('click', handleClick);
        window.addEventListener('touchstart', detectTouch);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('pointerlockchange', handleLockChange);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('click', handleClick);
            window.removeEventListener('touchstart', detectTouch);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('pointerlockchange', handleLockChange);
        };
    }, [isAdmin, onPlaceBlock, camera, raycaster, scene]);

    const [ghostPos, setGhostPos] = useState<[number, number, number] | null>(null);
    const ghostMeshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        let { forward, backward, left, right, up, down } = moveDirection.current;

        if (mobileInput) {
            // Virtual Joystick mapping
            if (mobileInput.forward > 0.1) forward = true;
            if (mobileInput.forward < -0.1) backward = true;
            if (mobileInput.turn > 0.1) right = true;
            if (mobileInput.turn < -0.1) left = true;
            if (mobileInput.jump) up = true;
            if (mobileInput.down) down = true;

            // Touch-to-look mapping (World/Map rotation)
            if (mobileInput.lookDx !== 0 || mobileInput.lookDy !== 0) {
                const sensitivity = 0.003; // Slightly increased sensitivity
                camera.rotation.order = 'YXZ';
                camera.rotation.y -= mobileInput.lookDx * sensitivity;
                camera.rotation.x -= mobileInput.lookDy * sensitivity;
                camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, camera.rotation.x));

                if (onLookConsumed) onLookConsumed();
            }
        }

        // Raycasting for Ghost Block Preview
        if (isAdmin) {
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
            if (intersects.length > 0) {
                const hit = intersects[0];
                const normal = hit.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
                if (hit.object instanceof THREE.Mesh) normal.applyQuaternion(hit.object.quaternion);
                const placePos = hit.point.clone().add(normal.multiplyScalar(0.5));
                setGhostPos([Math.floor(placePos.x), Math.floor(placePos.y), Math.floor(placePos.z)]);
            } else {
                setGhostPos(null);
            }
        }

        const direction = new THREE.Vector3();
        const frontVector = new THREE.Vector3(0, 0, Number(backward) - Number(forward));
        const sideVector = new THREE.Vector3(Number(left) - Number(right), 0, 0);
        direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(MOVE_SPEED).applyQuaternion(camera.quaternion);
        direction.y = 0; // ignore vertical from look direction

        camera.position.x += direction.x * delta;
        camera.position.z += direction.z * delta;

        // Vertical free-fly
        if (up) camera.position.y += VERTICAL_SPEED * delta;
        if (down) camera.position.y -= VERTICAL_SPEED * delta;

        // Floor clamp so player doesn't fall below ground
        if (camera.position.y < PLAYER_HEIGHT) {
            camera.position.y = PLAYER_HEIGHT;
        }

        if (overridePosition) {
            camera.position.set(overridePosition[0], overridePosition[1] + PLAYER_HEIGHT, overridePosition[2]);
        }

        // Emit position update every 200ms
        const now = state.clock.getElapsedTime();
        if (onPositionUpdate && now - lastEmitTime.current > 0.2) {
            onPositionUpdate([camera.position.x, camera.position.y, camera.position.z]);
            lastEmitTime.current = now;
        }
    });

    return (
        <>
            {!isTouch && <PointerLockControlsImpl />}
            {isAdmin && ghostPos && selectedBlock && (
                <mesh position={[ghostPos[0] + 0.5, ghostPos[1] + 0.5, ghostPos[2] + 0.5]}>
                    <boxGeometry args={[1.01, 1.01, 1.01]} />
                    <meshStandardMaterial
                        color={selectedBlock.color}
                        transparent
                        opacity={0.4}
                        emissive={selectedBlock.color}
                        emissiveIntensity={0.5}
                    />
                </mesh>
            )}
        </>
    );
};
