import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

interface MapboxGroundProps {
    center: { lat: number, lng: number };
    zoom: number;
    size: number; // Size in world units (meters)
}

/**
 * Renders a satellite image from Mapbox as the ground texture.
 * Requires VITE_MAPBOX_TOKEN in .env.local
 */
export const MapboxGround: React.FC<MapboxGroundProps> = ({ center, zoom, size }) => {
    // @ts-ignore - ImportMeta might not be recognized by some TS configs but works in Vite
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    const isPlaceholder = !token || token === 'YOUR_MAPBOX_ACCESS_TOKEN';

    // Fallback URL if token is missing
    const textureUrl = useMemo(() => {
        if (isPlaceholder) return null;
        return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${center.lng},${center.lat},${zoom},0,0/1024x1024?access_token=${token}`;
    }, [center, zoom, token, isPlaceholder]);

    // If no token or it's a placeholder, return a solid ground
    if (isPlaceholder) {
        return (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[25, -0.05, 25]} receiveShadow>
                <planeGeometry args={[size, size]} />
                <meshStandardMaterial color="#2d402d" />
            </mesh>
        );
    }

    return <MapboxTextureContent textureUrl={textureUrl!} size={size} />;
};

const MapboxTextureContent: React.FC<{ textureUrl: string, size: number }> = ({ textureUrl, size }) => {
    const texture = useTexture(textureUrl);

    useMemo(() => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;
    }, [texture]);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[25, -0.05, 25]} receiveShadow>
            <planeGeometry args={[size, size]} />
            <meshStandardMaterial map={texture} />
        </mesh>
    );
};
