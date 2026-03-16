/**
 * floorDetection.ts
 * Hybrid floor detector: combines barometer height + WiFi fingerprint.
 * Barometer detects the height change event; WiFi fingerprint confirms the floor.
 */

import { pressureToHeight, heightToFloor, detectFloorChange, setReferencePressure } from './barometerHeight';
import { matchFloorByFingerprint, getLatestNativeScan, APReading } from './wifiFingerprint';

export interface FloorEstimate {
    floor: number;
    method: 'barometer+wifi' | 'barometer' | 'wifi' | 'gps' | 'unknown';
    confidence: 'high' | 'medium' | 'low';
    heightM: number | null;
    pressureHPa: number | null;
}

let _baseHeight: number | null = null; // calibrated at ground floor

/**
 * Calibrate the ground floor reference.
 * Call this when the user is known to be on the ground floor / outdoors.
 */
export function calibrateGroundFloor(pressureHPa: number) {
    const h = pressureToHeight(pressureHPa);
    _baseHeight = h;
    setReferencePressure(pressureHPa);
}

/**
 * Main entry-point: estimate current floor from all available data.
 * @param pressureHPa  Current barometer reading (null if unavailable)
 * @param gpsAlt       GPS altitude in metres (null if unavailable)
 */
export function estimateFloor(
    pressureHPa: number | null,
    gpsAlt: number | null
): FloorEstimate {
    const nativeScan = getLatestNativeScan();
    let heightM: number | null = null;
    let baroFloor: number | null = null;
    let wifiFloor: number | null = null;

    // ── Barometer path ──────────────────────────────────────────────────
    if (pressureHPa !== null && _baseHeight !== null) {
        heightM = pressureToHeight(pressureHPa);
        baroFloor = heightToFloor(heightM, _baseHeight);
    } else if (gpsAlt !== null && _baseHeight !== null) {
        heightM = gpsAlt;
        baroFloor = heightToFloor(gpsAlt, _baseHeight);
    }

    // ── WiFi fingerprint path ───────────────────────────────────────────
    if (nativeScan.length > 0) {
        wifiFloor = matchFloorByFingerprint(nativeScan);
    }

    // ── Fusion ──────────────────────────────────────────────────────────
    if (baroFloor !== null && wifiFloor !== null) {
        // Both agree → high confidence
        const floor = baroFloor === wifiFloor ? baroFloor : wifiFloor; // WiFi wins on disagreement
        return {
            floor,
            method: 'barometer+wifi',
            confidence: baroFloor === wifiFloor ? 'high' : 'medium',
            heightM, pressureHPa
        };
    }

    if (baroFloor !== null) {
        return { floor: baroFloor, method: 'barometer', confidence: 'medium', heightM, pressureHPa };
    }

    if (wifiFloor !== null) {
        return { floor: wifiFloor, method: 'wifi', confidence: 'medium', heightM, pressureHPa };
    }

    if (gpsAlt !== null) {
        // Very rough — GPS altitude is noisy
        const f = Math.max(0, Math.round((gpsAlt - ((_baseHeight ?? gpsAlt))) / 3.5));
        return { floor: f, method: 'gps', confidence: 'low', heightM: gpsAlt, pressureHPa: null };
    }

    return { floor: 0, method: 'unknown', confidence: 'low', heightM: null, pressureHPa: null };
}
