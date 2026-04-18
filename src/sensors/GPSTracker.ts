import { useState, useEffect, useRef } from 'react';
import { latLngToVoxel } from '../core/GISUtils';
import { KalmanGPS, KalmanState } from './KalmanGPS';

/**
 * Custom hook to track real-world GPS position, convert to Voxel world coords,
 * and expose Kalman-derived navigation fields.
 *
 * Pipeline:
 *   watchPosition (raw GPS, ~1 Hz)
 *       ↓
 *   KalmanGPS.update()  — ENU-space filter, GPS measurement step
 *
 *   devicemotion (IMU, ~60 Hz)
 *       ↓
 *   KalmanGPS.updateIMU() — prediction step between GPS fixes
 *
 * External interface is unchanged: position is Voxel coords.
 * New exports: speed, gpsBearing, estimatedAccuracy, covMaxEigenvalue.
 */
export function useGPSTracking(enabled: boolean) {
    const [position, setPosition] = useState<[number, number, number] | null>(null);
    const [rawPosition, setRawPosition] = useState<[number, number, number] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [speed, setSpeed] = useState<number>(0);
    const [gpsBearing, setGpsBearing] = useState<number>(-1);
    const [estimatedAccuracy, setEstimatedAccuracy] = useState<number | null>(null);
    const [covMaxEigenvalue, setCovMaxEigenvalue] = useState<number>(2500); // 50² m² initial
    const [filteredLatLon, setFilteredLatLon] = useState<{ lat: number; lon: number } | null>(null);

    const kalmanRef     = useRef<KalmanGPS>(new KalmanGPS());
    const compassRef    = useRef<number>(0);  // updated by DeviceOrientation for IMU rotation

    useEffect(() => {
        if (!enabled || !('geolocation' in navigator)) {
            setPosition(null);
            return;
        }

        const kalman = kalmanRef.current;

        // ── DeviceMotion → IMU injection ────────────────────────────────────
        const motionHandler = (e: DeviceMotionEvent) => {
            const a = e.acceleration; // without gravity
            if (!a || a.x == null || a.y == null) return;

            const ψ = compassRef.current * Math.PI / 180;
            const aE =  (a.x ?? 0) * Math.cos(ψ) + (a.y ?? 0) * Math.sin(ψ);
            const aN = -(a.x ?? 0) * Math.sin(ψ) + (a.y ?? 0) * Math.cos(ψ);
            kalman.updateIMU(aE, aN, Date.now());
        };

        const orientHandler = (e: DeviceOrientationEvent) => {
            compassRef.current = (e as any).webkitCompassHeading ?? (360 - (e.alpha ?? 0));
        };

        window.addEventListener('devicemotion', motionHandler);
        window.addEventListener('deviceorientation', orientHandler);

        // ── GPS → Kalman update ─────────────────────────────────────────────
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, accuracy: rawAccuracy } = pos.coords;

                const state: KalmanState = kalman.update(latitude, longitude, rawAccuracy, pos.timestamp);
                const covMax = kalman.covarianceMaxEigenvalue();

                const filteredVoxel = latLngToVoxel(state.lat, state.lon);
                const rawVoxel      = latLngToVoxel(latitude, longitude);

                setPosition(filteredVoxel);
                setRawPosition(rawVoxel);
                setAccuracy(rawAccuracy);
                setSpeed(state.speed);
                setGpsBearing(state.gpsBearing);
                setEstimatedAccuracy(state.estimatedAccuracy);
                setCovMaxEigenvalue(covMax);
                setFilteredLatLon({ lat: state.lat, lon: state.lon });
                setError(null);

                console.log(
                    `[GPS/Kalman] raw=(${latitude.toFixed(6)},${longitude.toFixed(6)}) acc=${rawAccuracy.toFixed(1)}m` +
                    ` | filt=(${state.lat.toFixed(6)},${state.lon.toFixed(6)}) σ=${state.estimatedAccuracy.toFixed(1)}m` +
                    ` | λ_max=${covMax.toFixed(2)}m² spd=${state.speed.toFixed(2)}m/s brg=${state.gpsBearing.toFixed(0)}°`
                );
            },
            (err) => {
                setError(err.message);
                console.error('[GPS] Error:', err);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
            window.removeEventListener('devicemotion', motionHandler);
            window.removeEventListener('deviceorientation', orientHandler);
        };
    }, [enabled]);

    return {
        /** Kalman-filtered position in Voxel coordinates */
        position,
        /** Raw GPS position in Voxel coordinates (for comparison / logging) */
        rawPosition,
        error,
        /** Raw GPS accuracy from device in metres */
        accuracy,
        /** Kalman-estimated speed in m/s */
        speed,
        /** GPS movement bearing 0–360°. Returns -1 when stationary */
        gpsBearing,
        /** √(λ_max(P_pos)) — filter's uncertainty estimate in metres */
        estimatedAccuracy,
        /**
         * λ_max(P_pos) in m² — for PhD confidence cone:
         *   spread = k · √covMaxEigenvalue   (k ≈ 0.1)
         */
        covMaxEigenvalue,
        /** Filtered lat/lon for navigation calculations */
        filteredLatLon,
    };
}
