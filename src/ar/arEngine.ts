/**
 * arEngine.ts — Sensor hub for AR Navigation
 *
 * Maintains a singleton Kalman filter that is continuously fed by a
 * background watchPosition and DeviceMotion listener. readSensors()
 * returns the current Kalman state synchronously — no per-call GPS
 * round-trip, so the 2-second GPS timeout is eliminated.
 *
 * ARSensors is extended with Kalman-derived fields that are now
 * physically grounded (speed, gpsBearing, covMaxEigenvalue).
 */
import { KalmanGPS, KalmanState } from '../sensors/KalmanGPS';

export interface ARSensors {
    // ── Core positioning ──────────────────────────────────────────────────────
    /** Kalman-filtered latitude (degrees) */
    gpsLat: number;
    /** Kalman-filtered longitude (degrees) */
    gpsLon: number;
    /** Raw GPS horizontal accuracy from device (metres) */
    gpsAccuracy: number;
    /** Compass bearing, degrees, 0=North (from DeviceOrientation) */
    compassBearing: number;
    /** Device pitch / tilt (degrees) */
    pitch: number;

    // ── Kalman-derived fields ─────────────────────────────────────────────────
    /** Kalman-estimated speed in m/s (0 when stationary) */
    kalmanSpeed: number;
    /**
     * GPS movement bearing derived from Kalman velocity vector, 0–360°.
     * Returns -1 when stationary (speed < 0.3 m/s) — consumers should
     * fall back to compassBearing in that case.
     */
    kalmanGPSBearing: number;
    /**
     * Kalman filter's own position uncertainty estimate in metres.
     * Computed as √(λ_max(P_pos)) — more stable than raw gpsAccuracy.
     */
    estimatedAccuracy: number;
    /**
     * λ_max of the 2×2 position covariance block in m².
     * Use this directly for the PhD confidence cone formula:
     *   cone_spread = k · √covMaxEigenvalue   (k = 0.1 for AR scale)
     */
    covMaxEigenvalue: number;
    /**
     * GPS error value used for logging and display (metres).
     * Backed by real gpsAccuracy — no synthetic Math.random().
     */
    gpsError: number;
}

export interface ARWorldPoint {
    x: number;
    z: number;
    label?: string;
}

/** Convert GPS [lat, lon] to AR world-space [x, z] relative to an origin */
export function gpsToARWorld(lat: number, lon: number, originLat: number, originLon: number): ARWorldPoint {
    const x = (lon - originLon) * Math.cos((originLat * Math.PI) / 180) * 111320;
    const z = (lat - originLat) * 110540;
    return { x, z };
}

// ── Singleton sensor state ─────────────────────────────────────────────────────
const _kalman = new KalmanGPS();
let _compassBearing = 0;
let _pitch = 0;
let _gpsAccuracy = 50;
let _kalmanState: KalmanState | null = null;
let _engineStarted = false;

/**
 * Start the background sensor engine.
 * Safe to call multiple times — initializes only once.
 * Called automatically on first readSensors() call.
 */
export function startSensorEngine(): void {
    if (_engineStarted) return;
    _engineStarted = true;

    // 1. Continuous GPS → Kalman filter
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                _gpsAccuracy = accuracy;
                _kalmanState = _kalman.update(latitude, longitude, accuracy, pos.timestamp);
            },
            (err) => {
                console.warn('[arEngine] GPS error:', err.message);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
    }

    // 2. Compass + pitch (DeviceOrientation)
    const orientHandler = (e: DeviceOrientationEvent) => {
        _compassBearing = (e as any).webkitCompassHeading ?? (360 - (e.alpha ?? 0));
        _pitch = e.beta ?? 0;
    };
    window.addEventListener('deviceorientation', orientHandler);

    // 3. IMU → Kalman prediction step (world-frame ENU projection)
    window.addEventListener('devicemotion', (e: DeviceMotionEvent) => {
        const a = e.acceleration; // without gravity
        if (!a || a.x == null || a.y == null) return;

        // Rotate device-frame [accelX, accelY] to world-frame ENU using compass heading
        // Phone held upright (portrait): Y = forward, X = right, Z = out of screen
        // ENU convention: E = rightward, N = forward (map-North)
        //   aE ≈  accelX·cos(ψ) + accelY·sin(ψ)   … simplified 2D rotation
        //   aN ≈ -accelX·sin(ψ) + accelY·cos(ψ)
        const ψ = _compassBearing * Math.PI / 180;
        const accelX = a.x ?? 0;
        const accelY = a.y ?? 0;
        const aE =  accelX * Math.cos(ψ) + accelY * Math.sin(ψ);
        const aN = -accelX * Math.sin(ψ) + accelY * Math.cos(ψ);

        _kalman.updateIMU(aE, aN, Date.now());
    });
}

/**
 * Read the current sensor state. Returns immediately using the latest
 * Kalman-filtered position — no async GPS round-trip.
 *
 * Falls back to MNNIT campus centre if no GPS fix has been received yet.
 */
export async function readSensors(): Promise<ARSensors> {
    startSensorEngine();

    const state = _kalmanState;
    const lat  = state?.lat  ?? 25.4920;
    const lon  = state?.lon  ?? 81.8670;
    const covMax       = state ? _kalman.covarianceMaxEigenvalue() : 2500; // 50²m fallback
    const estAccuracy  = Math.sqrt(Math.max(0, covMax));

    return {
        gpsLat: lat,
        gpsLon: lon,
        gpsAccuracy: _gpsAccuracy,
        compassBearing: _compassBearing,
        pitch: _pitch,
        kalmanSpeed:       state?.speed      ?? 0,
        kalmanGPSBearing:  state?.gpsBearing ?? -1,
        estimatedAccuracy: estAccuracy,
        covMaxEigenvalue:  covMax,
        gpsError:          _gpsAccuracy,  // real sensor value, no Math.random()
    };
}
