export interface Point {
    x: number;
    z: number;
}

export interface WiFiAP extends Point {
    ssid: string;
    txPower: number; // RSSI at 1 meter
}

/**
 * Estimates distance from RSSI using the Log-Distance Path Loss Model.
 * d = 10 ^ ((TxPower - RSSI) / (10 * n))
 */
export function rssiToDistance(rssi: number, txPower: number = -45, n: number = 2.4): number {
    return Math.pow(10, (txPower - rssi) / (10 * n));
}

/**
 * Estimates position using Weighted Centroid Localization (WCL).
 * Better than simple trilateration for irregular indoor signals.
 */
export function estimateWiFiPosition(signals: { rssi: number, ap: WiFiAP }[]): Point | null {
    if (signals.length === 0) return null;

    let totalWeight = 0;
    let weightedX = 0;
    let weightedZ = 0;

    signals.forEach(({ rssi, ap }) => {
        // Weight is inversely proportional to distance (squared for better accuracy)
        const weight = 1 / Math.pow(Math.abs(rssi), 2);
        weightedX += ap.x * weight;
        weightedZ += ap.z * weight;
        totalWeight += weight;
    });

    return {
        x: weightedX / totalWeight,
        z: weightedZ / totalWeight
    };
}

/**
 * Fuses GPS and WiFi positions using a weighted average based on confidence/accuracy.
 */
export function fusePositions(
    gps: Point & { accuracy: number },
    wifi: Point & { accuracy: number }
): Point {
    // Lower accuracy value (error in meters) means higher weight
    const wGps = 1 / Math.max(0.1, gps.accuracy);
    const wWifi = 1 / Math.max(0.1, wifi.accuracy);

    return {
        x: (gps.x * wGps + wifi.x * wWifi) / (wGps + wWifi),
        z: (gps.z * wGps + wifi.z * wWifi) / (wGps + wWifi)
    };
}
