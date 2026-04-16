import React from 'react';
import { useCameraUnderstanding } from './useCameraUnderstanding';

interface CameraHintOverlayProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    arActive: boolean;
    confidence: string; // The confidence level from useNavigationConfidence
}

export const CameraHintOverlay: React.FC<CameraHintOverlayProps> = ({ videoRef, arActive, confidence }) => {
    // Only run the model if AR is active and confidence is low
    // We pass `active` to the hook. If false, it completely bypasses parsing.
    const isGPSUncertain = confidence === 'Slightly Off' || confidence === 'Recalculating';
    const active = arActive && isGPSUncertain;

    const { hint, isReady } = useCameraUnderstanding(videoRef, active, 2000);

    // If completely confident in GPS or not active, we do not show any camera hints
    if (!active || !hint) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '20%',
            right: '16px',
            background: 'rgba(20, 20, 25, 0.85)',
            border: '1px solid rgba(139, 92, 246, 0.5)',
            borderRadius: '12px',
            padding: '10px 14px',
            color: '#fff',
            zIndex: 15,
            maxWidth: '180px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
        }}>
            <div style={{
                color: '#c4b5fd',
                fontSize: '10px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                <span style={{
                    width: '6px',
                    height: '6px',
                    background: '#8b5cf6',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                }}></span>
                Vision Assistant
            </div>
            <div style={{
                fontSize: '13px',
                fontWeight: '500',
                lineHeight: '1.3'
            }}>
                {hint}
            </div>
        </div>
    );
};
