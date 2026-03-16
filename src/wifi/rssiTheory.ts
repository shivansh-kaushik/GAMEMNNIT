/**
 * rssiTheory.ts
 * Provides RSSI indoor positioning theory data and calculation utilities.
 * All data is static / educational — no network calls.
 */

/** RSSI path-loss distance estimation */
export function estimateDistance(rssi: number, rssiAt1m = -40, n = 2.5): number {
    // d = 10 ^ ((A - RSSI) / (10 * n))
    return Math.pow(10, (rssiAt1m - rssi) / (10 * n));
}

/** WiFi fingerprint for each floor of the Academic Building */
export interface FloorFingerprint {
    floor: number;
    label: string;
    fingerprint: { ap: string; rssi: number }[];
}

export const ACADEMIC_FLOOR_FINGERPRINTS: FloorFingerprint[] = [
    {
        floor: 0, label: 'Ground Floor',
        fingerprint: [
            { ap: 'MNNIT-AP-1', rssi: -35 },
            { ap: 'MNNIT-AP-2', rssi: -62 },
            { ap: 'MNNIT-AP-3', rssi: -75 }
        ]
    },
    {
        floor: 1, label: '1st Floor',
        fingerprint: [
            { ap: 'MNNIT-AP-1', rssi: -50 },
            { ap: 'MNNIT-AP-2', rssi: -40 },
            { ap: 'MNNIT-AP-3', rssi: -68 }
        ]
    },
    {
        floor: 2, label: '2nd Floor',
        fingerprint: [
            { ap: 'MNNIT-AP-1', rssi: -70 },
            { ap: 'MNNIT-AP-2', rssi: -55 },
            { ap: 'MNNIT-AP-3', rssi: -42 }
        ]
    }
];

/** RSSI ranging formula display parts */
export const RSSI_FORMULA = {
    rssiEq: 'RSSI = -(10 × n × log₁₀(d)) + A',
    distEq: 'd = 10 ^ ((A - RSSI) / (10 × n))',
    variables: [
        { sym: 'RSSI', desc: 'Received Signal Strength (dBm)' },
        { sym: 'n', desc: 'Path-loss exponent (2–4 depending on environment)' },
        { sym: 'd', desc: 'Distance from access point (metres)' },
        { sym: 'A', desc: 'RSSI at 1 metre reference distance (dBm)' }
    ]
};

/** Check if browser WiFi scanning is available (always false in browsers) */
export function isBrowserWifiScanAvailable(): boolean {
    // The Web API does NOT expose WiFi scanning for security reasons.
    return false;
}
