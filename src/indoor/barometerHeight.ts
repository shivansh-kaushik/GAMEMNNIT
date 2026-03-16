/**
 * barometerHeight.ts
 * Converts barometric pressure to estimated height above sea level,
 * and detects floor changes based on relative altitude shifts.
 */

/**
 * Standard sea-level pressure in hPa.
 * Can be overridden with a calibration value at app startup.
 */
let P0 = 1013.25; // hPa

/** Set the reference pressure (calibrate at a known altitude). */
export function setReferencePressure(hPa: number) {
    P0 = hPa;
}

/**
 * Barometric altitude formula:
 *   h = 44330 × (1 − (P / P0)^(1/5.255))
 */
export function pressureToHeight(pressureHPa: number): number {
    return 44330 * (1 - Math.pow(pressureHPa / P0, 1 / 5.255));
}

const FLOOR_HEIGHT_M = 3.5; // typical floor-to-floor height at MNNIT

/**
 * Estimate floor number from absolute height.
 * Floor 0 = Ground, Floor 1 = 1st, Floor 2 = 2nd.
 * baseHeightM should be set when the user is known to be at ground level.
 */
export function heightToFloor(heightM: number, baseHeightM: number): number {
    const relativeH = heightM - baseHeightM;
    return Math.max(0, Math.round(relativeH / FLOOR_HEIGHT_M));
}

/** Detect whether the height changed by at least one floor (>3 m). */
export function detectFloorChange(prevH: number, newH: number): boolean {
    return Math.abs(newH - prevH) >= 3.0;
}
