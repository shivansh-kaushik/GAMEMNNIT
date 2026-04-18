import { CAMPUS_WIFI_APS } from '../data/wifiAPs';
import { transformGPSToDigitalTwin, transformDigitalTwinToGPS } from '../core/coordinateTransform';
import { KalmanGPS, KalmanState } from '../sensors/KalmanGPS';

export interface LocationData {
    lat: number;
    lon: number;
    accuracy: number;
    timestamp?: number;
    /** Kalman-estimated speed in m/s (0 when stationary) */
    speed?: number;
    /** GPS-derived movement bearing 0–360°, or -1 when stationary */
    gpsBearing?: number;
    /** Filter's own uncertainty estimate in metres */
    estimatedAccuracy?: number;
}

export interface WifiRSSI {
    ssid: string;
    rssi: number;
}

export type LocationCallback = (location: LocationData) => void;

class LocationService {
    private watchId: number | null = null;
    private callbacks: LocationCallback[] = [];
    private lastKalmanState: KalmanState | null = null;
    private lastRawAccuracy: number = 999;
    private currentWifi: WifiRSSI[] = [];
    private updateInterval: any = null;
    private kalman = new KalmanGPS();

    start(onUpdate: LocationCallback) {
        this.callbacks.push(onUpdate);

        if (this.callbacks.length === 1) {
            if ('geolocation' in navigator) {
                this.watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude, accuracy } = position.coords;

                        // Pass raw GPS through Kalman filter
                        const state = this.kalman.update(
                            latitude,
                            longitude,
                            accuracy,
                            position.timestamp
                        );

                        this.lastKalmanState = state;
                        this.lastRawAccuracy = accuracy;
                    },
                    (error) => {
                        console.error('[LocationService] GPS Error:', error);
                    },
                    {
                        enableHighAccuracy: true,
                        maximumAge: 0,   // Kalman handles smoothing — let raw updates flow
                        timeout: 10000,
                    }
                );
            }

            // Fused location updates every 2 seconds
            this.updateInterval = setInterval(() => {
                this.emitFusedLocation();
            }, 2000);
        }
    }

    stop(onUpdate: LocationCallback) {
        this.callbacks = this.callbacks.filter(cb => cb !== onUpdate);
        if (this.callbacks.length === 0) {
            if (this.watchId !== null && 'geolocation' in navigator) {
                navigator.geolocation.clearWatch(this.watchId);
                this.watchId = null;
            }
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        }
    }

    updateWifi(rssiList: WifiRSSI[]) {
        this.currentWifi = rssiList;
    }

    private emitFusedLocation() {
        if (!this.lastKalmanState) return;

        let finalLat = this.lastKalmanState.lat;
        let finalLon = this.lastKalmanState.lon;

        // WiFi trilateration / weighted average fusion on top of Kalman output
        if (this.currentWifi && this.currentWifi.length > 0) {
            const n = 2.0;
            let sumWeight = 0;
            let sumX = 0;
            let sumZ = 0;
            let validAPs = 0;

            this.currentWifi.forEach(reading => {
                const ap = CAMPUS_WIFI_APS.find(a => a.ssid === reading.ssid);
                if (ap) {
                    const distance = Math.pow(10, (ap.txPower - reading.rssi) / (10 * n));
                    const weight = 1 / (distance * distance + 0.1);
                    sumX += ap.x * weight;
                    sumZ += ap.z * weight;
                    sumWeight += weight;
                    validAPs++;
                }
            });

            if (validAPs > 0) {
                const wifiX = sumX / sumWeight;
                const wifiZ = sumZ / sumWeight;
                const wifiGPS = transformDigitalTwinToGPS(wifiX, wifiZ);

                // Weight GPS more heavily than WiFi (70/30)
                finalLat = finalLat * 0.7 + wifiGPS.lat * 0.3;
                finalLon = finalLon * 0.7 + wifiGPS.lon * 0.3;
            }
        }

        const location: LocationData = {
            lat: finalLat,
            lon: finalLon,
            accuracy: this.lastRawAccuracy,
            timestamp: Date.now(),
            speed: this.lastKalmanState.speed,
            gpsBearing: this.lastKalmanState.gpsBearing,
            estimatedAccuracy: this.lastKalmanState.estimatedAccuracy,
        };

        this.callbacks.forEach(cb => cb(location));
    }
}

export const locationService = new LocationService();
