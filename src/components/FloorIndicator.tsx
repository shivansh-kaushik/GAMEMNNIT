/**
 * FloorIndicator.tsx
 *
 * Compact AR overlay component showing current floor, source, and confidence.
 * Shows a calibration modal on first load (asks user to select their floor).
 *
 * PURELY ADDITIVE — import and mount in ARPage; does not touch any other code.
 */

import React, { useState } from 'react';
import { useFloorDetection } from '../sensors/floorDetection';

// ─── Calibration Modal ────────────────────────────────────────────────

interface CalibrationModalProps {
    onCalibrate: (floor: number) => void;
}

const CalibrationModal: React.FC<CalibrationModalProps> = ({ onCalibrate }) => {
    const [selected, setSelected] = useState<number>(0);

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: '#111', border: '1px solid rgba(0,255,136,0.4)',
                borderRadius: '16px', padding: '24px', maxWidth: '320px', width: '90%',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)'
            }}>
                <div style={{ fontSize: '28px', textAlign: 'center', marginBottom: '8px' }}>🏢</div>
                <h3 style={{ color: '#00ff88', textAlign: 'center', margin: '0 0 6px 0', fontSize: '16px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Floor Calibration
                </h3>
                <p style={{ color: '#888', fontSize: '12px', textAlign: 'center', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                    Select your current floor so the barometer can be calibrated for accurate vertical tracking.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
                    {[
                        { label: 'G', name: 'Ground' },
                        { label: '1', name: '1st Floor' },
                        { label: '2', name: '2nd Floor' },
                        { label: '3', name: '3rd Floor' },
                    ].map(({ label, name }, index) => (
                        <button
                            key={index}
                            onClick={() => setSelected(index)}
                            style={{
                                width: '56px', height: '56px',
                                borderRadius: '12px', border: '2px solid',
                                borderColor: selected === index ? '#00ff88' : '#333',
                                background: selected === index ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                                color: selected === index ? '#00ff88' : '#aaa',
                                cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                gap: '2px', transition: 'all 0.15s ease'
                            }}
                        >
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{label}</span>
                            <span style={{ fontSize: '8px', color: '#666' }}>{name}</span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => onCalibrate(selected)}
                    style={{
                        width: '100%', padding: '12px', background: '#00ff88', color: '#000',
                        border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px',
                        cursor: 'pointer', letterSpacing: '0.5px'
                    }}
                >
                    ✓ Confirm &amp; Calibrate
                </button>

                <p style={{ color: '#555', fontSize: '10px', textAlign: 'center', marginTop: '10px', marginBottom: 0 }}>
                    You can skip this — floor tracking will still work using barometric pressure.
                </p>
                <button
                    onClick={() => onCalibrate(-1)} // -1 = skip
                    style={{
                        display: 'block', margin: '6px auto 0', background: 'none',
                        border: 'none', color: '#555', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline'
                    }}
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
};

// ─── Source Style Helpers ─────────────────────────────────────────────

function sourceLabel(source: string): string {
    if (source === 'barometer') return '🌡 Barometer';
    if (source === 'wifi')      return '📶 WiFi';
    return '❓ Unknown';
}

function sourceColor(source: string): string {
    if (source === 'barometer') return '#3b82f6';
    if (source === 'wifi')      return '#00ff88';
    return '#666';
}

function confidenceColor(confidence: number): string {
    if (confidence >= 0.7) return '#00ff88';
    if (confidence >= 0.4) return '#eab308';
    return '#ef4444';
}

// ─── Main FloorIndicator ──────────────────────────────────────────────

interface FloorIndicatorProps {
    /** Pass true to skip the calibration modal (e.g. when AR is not active) */
    skipCalibration?: boolean;
}

export const FloorIndicator: React.FC<FloorIndicatorProps> = ({ skipCalibration = false }) => {
    const { floor, source, confidence, isCalibrated, calibrate } = useFloorDetection();
    const [showModal, setShowModal] = useState<boolean>(!isCalibrated && !skipCalibration);

    const handleCalibrate = (selectedFloor: number) => {
        if (selectedFloor >= 0) calibrate(selectedFloor);
        setShowModal(false);
    };

    const floorLabel = floor === 0 ? 'G' : `${floor}`;

    return (
        <>
            {/* Calibration Modal */}
            {showModal && <CalibrationModal onCalibrate={handleCalibrate} />}

            {/* Floor Indicator Chip */}
            <div
                onClick={() => setShowModal(true)} // Tap to recalibrate
                style={{
                    position: 'absolute',
                    bottom: '70px',
                    right: '16px',
                    zIndex: 3500,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
                title="Tap to recalibrate floor"
            >
                {/* Floor number badge */}
                <div style={{
                    background: 'rgba(0,0,0,0.85)',
                    border: `2px solid ${sourceColor(source)}`,
                    borderRadius: '12px',
                    padding: '8px 12px',
                    backdropFilter: 'blur(10px)',
                    minWidth: '64px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: '#888', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
                        Floor
                    </div>
                    <div style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', lineHeight: 1 }}>
                        {floorLabel}
                    </div>
                    <div style={{ color: sourceColor(source), fontSize: '9px', marginTop: '3px', letterSpacing: '0.5px' }}>
                        {sourceLabel(source)}
                    </div>

                    {/* Confidence bar */}
                    <div style={{ marginTop: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '3px', width: '100%', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.round(confidence * 100)}%`,
                            background: confidenceColor(confidence),
                            borderRadius: '4px',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    <div style={{ color: '#555', fontSize: '8px', marginTop: '2px' }}>
                        {Math.round(confidence * 100)}% conf.
                    </div>
                </div>
            </div>
        </>
    );
};
