/**
 * floorDetection.ts
 *
 * JavaScript bridge layer for the hybrid floor detection system.
 * 
 * Receives data from Android native layer (FloorDetectionBridge.kt)
 * via window.updateFloor() and exposes it to React via useFloorDetection().
 *
 * This file is a PURELY ADDITIVE module — it does NOT modify any existing
 * navigation, AR, or routing logic.
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────

export type FloorSource = 'barometer' | 'wifi' | 'unknown';

export interface FloorData {
    floor: number;
    source: FloorSource;
    confidence: number; // 0.0 – 1.0
    timestamp: number;
}

export interface FloorCalibration {
    userFloor: number;
    setAt: number;
}

// ─── Session Calibration Store ──────────────────────────────────────

let _calibration: FloorCalibration | null = null;
let _latestFloorData: FloorData = { floor: 0, source: 'unknown', confidence: 0, timestamp: 0 };

/** Listeners registered by useFloorDetection hooks */
const _listeners = new Set<(data: FloorData) => void>();

/** Notify all active hooks */
function _broadcast(data: FloorData) {
    _latestFloorData = data;
    _listeners.forEach(fn => fn(data));
}

// ─── WebView Bridge Registration ─────────────────────────────────────

/**
 * Registers window.updateFloor so Android can call it.
 * Called once at module load. Safe to call multiple times.
 */
export function initFloorBridge() {
    (window as any).updateFloor = (data: { floor: number; source: string; confidence: number }) => {
        const floorData: FloorData = {
            floor: Number(data.floor) || 0,
            source: (data.source as FloorSource) || 'unknown',
            confidence: Number(data.confidence) || 0,
            timestamp: Date.now()
        };
        _broadcast(floorData);
    };

    // Stale signal watchdog: if no update arrives in 5s, mark as unknown
    let watchdogTimer: ReturnType<typeof setTimeout>;
    const resetWatchdog = () => {
        clearTimeout(watchdogTimer);
        watchdogTimer = setTimeout(() => {
            _broadcast({ ..._latestFloorData, source: 'unknown', confidence: 0, timestamp: Date.now() });
        }, 5000);
    };

    const originalUpdateFloor = (window as any).updateFloor;
    (window as any).updateFloor = (data: any) => {
        originalUpdateFloor(data);
        resetWatchdog();
    };
}

// ─── Calibration API ─────────────────────────────────────────────────

/**
 * Store what floor the user says they're on.
 * Also tells the native layer to recalibrate its barometer baseline.
 */
export function calibrateFloor(userFloor: number) {
    _calibration = { userFloor, setAt: Date.now() };
    sessionStorage.setItem('floor_calibration', JSON.stringify(_calibration));

    // Tell native Android layer via JavascriptInterface (if available)
    if ((window as any).AndroidBridge?.calibrateFloor) {
        (window as any).AndroidBridge.calibrateFloor(userFloor);
    }
}

/** Load calibration from session storage (persists across tab refreshes) */
export function loadCalibration(): FloorCalibration | null {
    if (_calibration) return _calibration;
    try {
        const raw = sessionStorage.getItem('floor_calibration');
        if (raw) {
            _calibration = JSON.parse(raw);
            return _calibration;
        }
    } catch { /* ignore */ }
    return null;
}

// ─── React Hook ─────────────────────────────────────────────────────

/**
 * useFloorDetection — React hook that returns live floor data.
 * Returns { floor, source, confidence } and updates whenever native layer pushes.
 * 
 * Returns floor=0, source='unknown' when running in a browser (no native bridge).
 */
export function useFloorDetection() {
    const [data, setData] = useState<FloorData>(_latestFloorData);
    const [isCalibrated, setIsCalibrated] = useState<boolean>(!!loadCalibration());

    useEffect(() => {
        // Initialize bridge on first hook mount
        initFloorBridge();

        // Subscribe to updates
        const listener = (newData: FloorData) => setData(newData);
        _listeners.add(listener);
        return () => { _listeners.delete(listener); };
    }, []);

    const calibrate = useCallback((floor: number) => {
        calibrateFloor(floor);
        setIsCalibrated(true);
    }, []);

    return { ...data, isCalibrated, calibrate };
}
