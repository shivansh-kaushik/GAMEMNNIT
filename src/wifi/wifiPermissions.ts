/**
 * wifiPermissions.ts
 * Requests and tracks browser permissions needed for indoor positioning research.
 * Completely independent — does not modify navigation or AR code.
 */

export interface PermissionStatus {
    location: 'granted' | 'denied' | 'prompt' | 'unavailable';
    motion: 'granted' | 'denied' | 'prompt' | 'unavailable';
}

/** Request Geolocation permission and return its status */
export async function requestLocationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unavailable'> {
    if (!('geolocation' in navigator)) return 'unavailable';

    try {
        // Use the Permissions API to check first
        if ('permissions' in navigator) {
            const perm = await navigator.permissions.query({ name: 'geolocation' });
            if (perm.state !== 'prompt') return perm.state as 'granted' | 'denied';
        }

        // Actually trigger the browser prompt
        return await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                () => resolve('granted'),
                (err) => resolve(err.code === 1 ? 'denied' : 'prompt')
            );
        });
    } catch {
        return 'unavailable';
    }
}

/** Request DeviceMotion/Orientation permission (iOS 13+ requires explicit call) */
export async function requestMotionPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unavailable'> {
    // iOS 13+: DeviceMotionEvent.requestPermission exists
    const DME = (DeviceMotionEvent as any);
    if (typeof DME?.requestPermission === 'function') {
        try {
            const result = await DME.requestPermission();
            return result === 'granted' ? 'granted' : 'denied';
        } catch {
            return 'denied';
        }
    }

    // Android / Desktop: permission not required, assume granted if API exists
    if ('DeviceMotionEvent' in window) return 'granted';
    return 'unavailable';
}

/** Request all permissions and return combined status */
export async function requestAllPermissions(): Promise<PermissionStatus> {
    const [location, motion] = await Promise.all([
        requestLocationPermission(),
        requestMotionPermission()
    ]);
    return { location, motion };
}
