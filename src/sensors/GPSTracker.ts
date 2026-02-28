import { useState, useEffect } from 'react';
import { latLngToVoxel } from '../core/GISUtils';

/**
 * Custom hook to track real-world GPS position and convert to Voxel world coords.
 */
export function useGPSTracking(enabled: boolean) {
    const [position, setPosition] = useState<[number, number, number] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [accuracy, setAccuracy] = useState<number | null>(null);

    useEffect(() => {
        if (!enabled || !("geolocation" in navigator)) {
            setPosition(null);
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                const voxelPos = latLngToVoxel(latitude, longitude);

                setPosition(voxelPos);
                setAccuracy(accuracy);
                setError(null);

                console.log(`GPS Update: Lat ${latitude}, Lng ${longitude} -> Voxel ${voxelPos}`);
            },
            (err) => {
                setError(err.message);
                console.error("Geolocation Error:", err);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [enabled]);

    return { position, error, accuracy };
}
