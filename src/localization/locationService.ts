import { CAMPUS_WIFI_APS } from '../data/wifiAPs';
import { transformGPSToDigitalTwin, transformDigitalTwinToGPS } from '../core/coordinateTransform';

export interface LocationData {
    lat: number;
    lon: number;
    accuracy: number;
    timestamp?: number;
}

export interface WifiRSSI {
    ssid: string;
    rssi: number;
}

export type LocationCallback = (location: LocationData) => void;

class LocationService {
    private watchId: number | null = null;
    private callbacks: LocationCallback[] = [];
    private lastGPS: LocationData | null = null;
    private currentWifi: WifiRSSI[] = [];
    private updateInterval: any = null;

    start(onUpdate: LocationCallback) {
        this.callbacks.push(onUpdate);

        if (this.callbacks.length === 1) {
            if ("geolocation" in navigator) {
                this.watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        this.lastGPS = {
                            lat: position.coords.latitude,
                            lon: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            timestamp: position.timestamp
                        };
                    },
                    (error) => {
                        console.error("GPS Error:", error);
                    },
                    {
                        enableHighAccuracy: true,
                        maximumAge: 2000,
                        timeout: 5000
                    }
                );
            }

            // Location updates should occur every 2 seconds.
            this.updateInterval = setInterval(() => {
                this.emitFusedLocation();
            }, 2000);
        }
    }

    stop(onUpdate: LocationCallback) {
        this.callbacks = this.callbacks.filter(cb => cb !== onUpdate);
        if (this.callbacks.length === 0) {
            if (this.watchId !== null && "geolocation" in navigator) {
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
        if (!this.lastGPS) return;

        let finalLat = this.lastGPS.lat;
        let finalLon = this.lastGPS.lon;

        // Wifi trilateration / weighted average fusion
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

                // Simple Weighted average to fuse GPS & WiFi
                finalLat = finalLat * 0.7 + wifiGPS.lat * 0.3;
                finalLon = finalLon * 0.7 + wifiGPS.lon * 0.3;
            }
        }

        const location: LocationData = {
            lat: finalLat,
            lon: finalLon,
            accuracy: this.lastGPS.accuracy,
            timestamp: Date.now()
        };

        this.callbacks.forEach(cb => cb(location));
    }
}

export const locationService = new LocationService();
