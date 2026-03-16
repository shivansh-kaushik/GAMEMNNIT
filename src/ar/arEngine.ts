/**
 * arEngine.ts — Core WebXR session management for AR Navigation
 * Handles device camera, XR session lifecycle, and sensor subscriptions.
 */

export interface ARSensors {
    gpsLat: number;
    gpsLon: number;
    compassBearing: number; // degrees, 0=North
    pitch: number;          // degrees, tilt of device
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

/** Sample AR sensors from browser APIs */
export async function readSensors(): Promise<ARSensors> {
    return new Promise((resolve) => {
        let lat = 25.4920, lon = 81.8670;
        let bearing = 0;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                lat = pos.coords.latitude;
                lon = pos.coords.longitude;
            });
        }

        // DeviceOrientationEvent gives compass heading
        const orientHandler = (e: DeviceOrientationEvent) => {
            // webkitCompassHeading on iOS, alpha on Android (needs conversion)
            bearing = (e as any).webkitCompassHeading ?? (360 - (e.alpha ?? 0));
            window.removeEventListener('deviceorientation', orientHandler);
            resolve({ gpsLat: lat, gpsLon: lon, compassBearing: bearing, pitch: e.beta ?? 0 });
        };
        window.addEventListener('deviceorientation', orientHandler);

        // Fallback timeout
        setTimeout(() => resolve({ gpsLat: lat, gpsLon: lon, compassBearing: 0, pitch: 0 }), 2000);
    });
}
