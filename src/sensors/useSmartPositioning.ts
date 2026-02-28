import { useState, useEffect, useRef } from 'react';
import { useGPSTracking } from './GPSTracker';
import { estimateWiFiPosition, fusePositions, Point } from './PositionFusion';
import { CAMPUS_WIFI_APS } from '../data/wifiAPs';

export type PositioningMode = 'simulator' | 'gps' | 'wifi' | 'fusion';

export function useSmartPositioning(mode: PositioningMode, isMobile: boolean) {
    const { position: gpsPos, accuracy: gpsAccuracy } = useGPSTracking(mode === 'gps' || mode === 'fusion');

    const [finalPos, setFinalPos] = useState<[number, number, number] | null>(null);
    const [positionError, setPositionError] = useState<number | null>(null);

    // Simulate WiFi RSSI readings relative to the user's "true" simulator pos or last known
    const truePosRef = useRef<[number, number, number]>([0, 0, 0]);

    // This is for the simulator to feed its position so we can generate fake RSSI
    const updateSimulatorPos = (pos: [number, number, number]) => {
        truePosRef.current = pos;
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const calculatePosition = () => {
            if (mode === 'simulator') {
                setFinalPos(null); // Controls.tsx handles it
                setPositionError(0);
                return;
            }

            // Generate fake WiFi signals based on true pos with some noise
            const wifiSignals = CAMPUS_WIFI_APS.map(ap => {
                const dist = Math.sqrt(Math.pow(truePosRef.current[0] - ap.x, 2) + Math.pow(truePosRef.current[2] - ap.z, 2));
                // Add noise to distance
                const noisyDist = Math.max(0.1, dist + (Math.random() - 0.5) * 5);
                // Reverse formula: RSSI = TxPower - 10 * n * log10(d)
                const rssi = ap.txPower - 10 * 2.4 * Math.log10(noisyDist);
                return { rssi, ap };
            });

            const wifiEst = estimateWiFiPosition(wifiSignals);

            // Assume WiFi accuracy is typically around 5m indoor
            const WIFI_ACCURACY = 5.0;

            let currentGps: Point | null = null;
            if (gpsPos) {
                currentGps = { x: gpsPos[0], z: gpsPos[2] };
            } else if (!isMobile) {
                // Mock GPS for desktop development based on simulator
                currentGps = {
                    x: truePosRef.current[0] + (Math.random() - 0.5) * 8,
                    z: truePosRef.current[2] + (Math.random() - 0.5) * 8
                };
            }

            const gpsAccuracyVal = gpsAccuracy || 8.0; // Default 8m for GPS

            if (mode === 'wifi' && wifiEst) {
                setFinalPos([wifiEst.x, truePosRef.current[1], wifiEst.z]);
                setPositionError(WIFI_ACCURACY);
            }
            else if (mode === 'gps' && currentGps) {
                setFinalPos([currentGps.x, truePosRef.current[1], currentGps.z]);
                setPositionError(gpsAccuracyVal);
            }
            else if (mode === 'fusion' && wifiEst && currentGps) {
                const fused = fusePositions(
                    { ...currentGps, accuracy: gpsAccuracyVal },
                    { ...wifiEst, accuracy: WIFI_ACCURACY }
                );
                setFinalPos([fused.x, truePosRef.current[1], fused.z]);

                // Fusion error is smaller than the smallest error
                const fusionError = 1 / ((1 / gpsAccuracyVal) + (1 / WIFI_ACCURACY));
                setPositionError(fusionError);
            }
        };

        // Update at 2Hz
        interval = setInterval(calculatePosition, 500);
        return () => clearInterval(interval);

    }, [mode, gpsPos, gpsAccuracy, isMobile]);

    return { finalPos, positionError, updateSimulatorPos };
}
