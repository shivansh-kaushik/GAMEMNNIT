export interface GPSData {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    speed: number | null;
    timestamp: number;
}

export class GPSSensor {
    private watchId: number | null = null;

    startWatching(onUpdate: (data: GPSData) => void, onError: (error: GeolocationPositionError) => void) {
        if (!navigator.geolocation) {
            console.error("Geolocation not supported");
            return;
        }

        this.watchId = navigator.geolocation.watchPosition(
            (pos) => {
                onUpdate({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    altitude: pos.coords.altitude,
                    speed: pos.coords.speed,
                    timestamp: pos.timestamp
                });
            },
            onError,
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }

    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }
}

export const gpsSensor = new GPSSensor();
