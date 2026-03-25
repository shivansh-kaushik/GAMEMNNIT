/**
 * QRScanOverlay.tsx
 * Dedicated fullscreen QR scanning mode — launched from the AR screen.
 * Runs its own camera feed independently of the WebXR session to ensure
 * 100% reliable BarcodeDetector frame access (avoids the WebXR camera lock issue).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MarkerPayload } from '../ar/MarkerLocalization';

interface QRScanOverlayProps {
    onDetected: (payload: MarkerPayload) => void;
    onCancel: () => void;
}

const SUPPORTED = typeof window !== 'undefined' && 'BarcodeDetector' in window;

export const QRScanOverlay: React.FC<QRScanOverlayProps> = ({ onDetected, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);
    const [status, setStatus] = useState<'starting' | 'scanning' | 'detected' | 'no_support'>('starting');

    const cleanup = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    }, []);

    useEffect(() => {
        if (!SUPPORTED) {
            setStatus('no_support');
            return;
        }

        detectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        }).then(stream => {
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setStatus('scanning');

            // Full camera access, no WebXR interference
            intervalRef.current = setInterval(async () => {
                if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) return;
                try {
                    const codes = await detectorRef.current.detect(videoRef.current);
                    if (codes.length > 0) {
                        const raw = codes[0].rawValue;
                        const parsed = JSON.parse(raw);

                        if (parsed.type !== 'AR_NAV_QR' || parsed.version !== 1 || !parsed.data) return;

                        setStatus('detected');
                        cleanup();
                        setTimeout(() => onDetected(parsed.data as MarkerPayload), 400); // brief blink for UX
                    }
                } catch (_) {}
            }, 400); // Scan 2.5x per second for snappiness
        }).catch(() => {
            setStatus('no_support');
        });

        return cleanup;
    }, [cleanup, onDetected]);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
        }}>
            {/* Viewfinder */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '480px', aspectRatio: '4/3' }}>
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                />
                {/* Corner brackets */}
                {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => (
                    <div key={corner} style={{
                        position: 'absolute',
                        width: '30px', height: '30px',
                        borderColor: status === 'detected' ? '#10b981' : '#ffffff',
                        borderStyle: 'solid',
                        borderWidth: '0',
                        ...(corner === 'top-left' ? { top: 0, left: 0, borderTopWidth: '3px', borderLeftWidth: '3px', borderTopLeftRadius: '8px' } : {}),
                        ...(corner === 'top-right' ? { top: 0, right: 0, borderTopWidth: '3px', borderRightWidth: '3px', borderTopRightRadius: '8px' } : {}),
                        ...(corner === 'bottom-left' ? { bottom: 0, left: 0, borderBottomWidth: '3px', borderLeftWidth: '3px', borderBottomLeftRadius: '8px' } : {}),
                        ...(corner === 'bottom-right' ? { bottom: 0, right: 0, borderBottomWidth: '3px', borderRightWidth: '3px', borderBottomRightRadius: '8px' } : {}),
                        transition: 'border-color 0.3s'
                    }} />
                ))}
            </div>

            {/* Status Text */}
            <div style={{ marginTop: '24px', textAlign: 'center', padding: '0 20px' }}>
                {status === 'starting' && <p style={{ color: '#aaa', fontSize: '14px' }}>Starting camera...</p>}
                {status === 'scanning' && (
                    <>
                        <p style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>Point at a campus QR anchor</p>
                        <p style={{ color: '#888', fontSize: '12px', marginTop: '6px' }}>Hold steady — scanning automatically</p>
                    </>
                )}
                {status === 'detected' && (
                    <p style={{ color: '#10b981', fontSize: '18px', fontWeight: 'bold' }}>✅ Ground Truth Anchor Detected!</p>
                )}
                {status === 'no_support' && (
                    <p style={{ color: '#f87171', fontSize: '14px' }}>
                        ⚠️ QR scanning not supported on this browser.<br />
                        <span style={{ fontSize: '11px', color: '#888' }}>Requires Chrome on Android.</span>
                    </p>
                )}
            </div>

            {/* Cancel */}
            <button
                onClick={() => { cleanup(); onCancel(); }}
                style={{
                    marginTop: '24px',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '10px 28px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    cursor: 'pointer'
                }}
            >
                Cancel
            </button>
        </div>
    );
};
