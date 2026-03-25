/**
 * wifiFingerprint.ts
 * Stores pre-collected RSSI fingerprints per floor and computes the
 * Euclidean distance between a live scan and each stored fingerprint.
 * Also handles native mobile RSSI data injection (Android WebView).
 */

export interface APReading {
    ssid: string;
    rssi: number;
}

export interface FloorFingerprint {
    floor: number;
    label: string;
    readings: APReading[];
}

/** Pre-collected fingerprints for the Academic Building */
export const FLOOR_FINGERPRINTS: FloorFingerprint[] = [
    {
        floor: 0, label: 'Ground Floor',
        readings: [
            { ssid: 'MNNIT_AP_1', rssi: -35 },
            { ssid: 'MNNIT_AP_2', rssi: -62 },
            { ssid: 'MNNIT_AP_3', rssi: -75 }
        ]
    },
    {
        floor: 1, label: '1st Floor',
        readings: [
            { ssid: 'MNNIT_AP_1', rssi: -50 },
            { ssid: 'MNNIT_AP_2', rssi: -40 },
            { ssid: 'MNNIT_AP_3', rssi: -68 }
        ]
    },
    {
        floor: 2, label: '2nd Floor',
        readings: [
            { ssid: 'MNNIT_AP_1', rssi: -70 },
            { ssid: 'MNNIT_AP_2', rssi: -55 },
            { ssid: 'MNNIT_AP_3', rssi: -42 }
        ]
    }
];

/**
 * Compare a live RSSI scan against all stored fingerprints.
 * Returns the floor number with the lowest Euclidean distance (best match).
 */
export function matchFloorByFingerprint(liveScan: APReading[]): number | null {
    if (liveScan.length === 0) return null;

    let bestFloor = 0;
    let bestDist = Infinity;

    for (const fp of FLOOR_FINGERPRINTS) {
        let sumSq = 0;
        let count = 0;

        for (const ref of fp.readings) {
            const live = liveScan.find(r => r.ssid === ref.ssid);
            if (live) {
                const d = live.rssi - ref.rssi;
                sumSq += d * d;
                count++;
            }
        }

        if (count === 0) continue;
        const dist = Math.sqrt(sumSq / count);

        if (dist < bestDist) {
            bestDist = dist;
            bestFloor = fp.floor;
        }
    }

    return bestFloor;
}

/**
 * Mobile wrapper bridge — native apps inject RSSI data via this global function.
 * Android code: window.__injectRSSI([{ssid, rssi}, ...])
 */
let _latestNativeScan: APReading[] = [];
(window as any).__injectRSSI = (data: APReading[]) => {
    _latestNativeScan = data;
};

export function getLatestNativeScan(): APReading[] {
    return _latestNativeScan;
}

/** Check if a native scan is available (injected via Android) */
export function hasNativeScan(): boolean {
    return _latestNativeScan.length > 0;
}
