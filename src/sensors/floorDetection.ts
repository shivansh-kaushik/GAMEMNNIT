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

// ─── Stabilization State ─────────────────────────────────────────────

const MAX_SAMPLES = 5;
let _floorHistory: number[] = [];
let _wifiStabilitySamples: number[] = [];
const WIFI_STABILITY_THRESHOLD = 3; 
const HYSTERESIS_SLACK = 0.35; 

let _lastStableFloor = 0;

/**
 * _stabilize — Applies moving average, hysteresis, and WiFi gating.
 */
function _stabilize(raw: FloorData): FloorData {
    // 1. Barometer Stabilization (Primary)
    if (raw.source === 'barometer') {
        _floorHistory.push(raw.floor);
        if (_floorHistory.length > MAX_SAMPLES) _floorHistory.shift();
        const avg = _floorHistory.reduce((a, b) => a + b, 0) / _floorHistory.length;
        
        // Hysteresis: Only change the rounded floor if the average crosses a large threshold
        const diff = avg - _lastStableFloor;
        if (Math.abs(diff) > (0.5 + HYSTERESIS_SLACK)) {
            _lastStableFloor = Math.round(avg);
        }
        
        return { ...raw, floor: _lastStableFloor, timestamp: Date.now() };
    }

    // 2. WiFi Stabilization (Correction)
    if (raw.source === 'wifi' && raw.confidence > 0.4) {
        _wifiStabilitySamples.push(raw.floor);
        if (_wifiStabilitySamples.length > WIFI_STABILITY_THRESHOLD) _wifiStabilitySamples.shift();
        
        const isStable = _wifiStabilitySamples.length === WIFI_STABILITY_THRESHOLD && 
                         _wifiStabilitySamples.every(f => f === _wifiStabilitySamples[0]);
        
        if (isStable) {
            _lastStableFloor = _wifiStabilitySamples[0];
            // Clear barometer history to snap to the new known floor
            _floorHistory = [_lastStableFloor]; 
            return { ...raw, floor: _lastStableFloor, timestamp: Date.now() };
        }
    }

    // Default: return current stable floor if unknown or unstable
    return { ...raw, floor: _lastStableFloor, timestamp: Date.now() };
}

/** Notify all active hooks with stabilized data */
function _broadcast(raw: FloorData) {
    const stabilized = _stabilize(raw);
    _latestFloorData = stabilized;
    _listeners.forEach(fn => fn(stabilized));
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

    // Reset stabilization state to the calibrated floor
    _lastStableFloor = userFloor;
    _floorHistory = [userFloor];
    _wifiStabilitySamples = [userFloor];

    // Broadcast update immediately to update UI
    const calibratedData: FloorData = {
        floor: userFloor,
        source: 'barometer', // Calibration is primarily for barometer tracking
        confidence: 1.0,
        timestamp: Date.now()
    };
    _latestFloorData = calibratedData;
    _listeners.forEach(fn => fn(calibratedData));

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
