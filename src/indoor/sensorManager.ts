/**
 * sensorManager.ts
 * Reads all available device sensors and exposes a unified subscription interface.
 * Does NOT affect AR navigation, A* engine, or Mapbox rendering.
 */

export interface SensorSnapshot {
    // GPS
    lat: number | null;
    lon: number | null;
    altitudeGPS: number | null;

    // Accelerometer (m/s²)
    accelX: number | null;
    accelY: number | null;
    accelZ: number | null;

    // Gyroscope (rad/s) — from DeviceMotionEvent rotationRate
    gyroAlpha: number | null;
    gyroBeta: number | null;
    gyroGamma: number | null;

    // Magnetometer / Compass (degrees)
    compass: number | null;

    // Barometer (hPa) — Generic Sensor API
    pressure: number | null;
    barometerAvailable: boolean;
}

export type SensorCallback = (snap: SensorSnapshot) => void;

let _snap: SensorSnapshot = {
    lat: null, lon: null, altitudeGPS: null,
    accelX: null, accelY: null, accelZ: null,
    gyroAlpha: null, gyroBeta: null, gyroGamma: null,
    compass: null, pressure: null, barometerAvailable: false
};

const _listeners: Set<SensorCallback> = new Set();
let _started = false;

function _notify() {
    _listeners.forEach(fn => fn({ ..._snap }));
}

/** Start all available sensors. Safe to call multiple times. */
export async function startSensors(): Promise<void> {
    if (_started) return;
    _started = true;

    // 1. GPS
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            _snap.lat = pos.coords.latitude;
            _snap.lon = pos.coords.longitude;
            _snap.altitudeGPS = pos.coords.altitude;
            _notify();
        }, undefined, { enableHighAccuracy: true });
    }

    // 2. Accelerometer + Gyroscope (DeviceMotionEvent)
    window.addEventListener('devicemotion', (e) => {
        const a = e.accelerationIncludingGravity;
        const r = e.rotationRate;
        if (a) {
            _snap.accelX = a.x;
            _snap.accelY = a.y;
            _snap.accelZ = a.z;
        }
        if (r) {
            _snap.gyroAlpha = r.alpha;
            _snap.gyroBeta = r.beta;
            _snap.gyroGamma = r.gamma;
        }
        _notify();
    });

    // 3. Compass/Magnetometer (DeviceOrientationEvent)
    window.addEventListener('deviceorientation', (e: any) => {
        // webkitCompassHeading on iOS, alpha on Android (needs negation)
        _snap.compass = e.webkitCompassHeading ?? (360 - (e.alpha ?? 0));
        _notify();
    });

    // 4. Barometer (Generic Sensor API — Chrome Android)
    try {
        const ABS = (window as any).AbsolutePressureSensor ?? (window as any).PressureSensor;
        if (ABS) {
            const sensor = new ABS({ frequency: 1 });
            sensor.addEventListener('reading', () => {
                _snap.pressure = sensor.pressure;
                _snap.barometerAvailable = true;
                _notify();
            });
            sensor.start();
        }
    } catch {
        // Generic Sensor not available
    }
}

/** Subscribe to sensor updates. Returns an unsubscribe function. */
export function subscribeSensors(fn: SensorCallback): () => void {
    _listeners.add(fn);
    fn({ ..._snap }); // immediately emit current snapshot
    return () => _listeners.delete(fn);
}
