import React from 'react';

export type TransportMode = 'walk' | 'cycle' | 'car';

interface TransportSelectorProps {
    mode: TransportMode;
    onModeChange: (mode: TransportMode) => void;
}

export const TransportSelector: React.FC<TransportSelectorProps> = ({ mode, onModeChange }) => {
    const isMobile = window.innerWidth < 640;

    return (
        <div style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            background: 'rgba(0,0,0,0.8)',
            padding: '10px',
            borderRadius: '12px',
            border: '1px solid rgba(255,136,0,0.3)',
            backdropFilter: 'blur(10px)'
        }}>
            <label style={{ fontSize: '9px', color: '#ff8800', letterSpacing: '1px', fontWeight: 'bold' }}>TRANSPORT MODE</label>
            <div style={{ display: 'flex', gap: '5px' }}>
                <button
                    onClick={() => onModeChange('walk')}
                    style={{
                        flex: 1, padding: isMobile ? '6px' : '8px', borderRadius: '6px',
                        background: mode === 'walk' ? 'rgba(255,136,0,0.2)' : 'transparent',
                        color: mode === 'walk' ? '#ff8800' : '#888',
                        border: `1px solid ${mode === 'walk' ? '#ff8800' : '#333'}`,
                        cursor: 'pointer', fontSize: isMobile ? '16px' : '12px',
                        fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                    }}
                    title="Walk (Pedestrian)"
                >
                    🚶 {!isMobile && 'Walk'}
                </button>
                <button
                    onClick={() => onModeChange('cycle')}
                    style={{
                        flex: 1, padding: isMobile ? '6px' : '8px', borderRadius: '6px',
                        background: mode === 'cycle' ? 'rgba(0,255,136,0.2)' : 'transparent',
                        color: mode === 'cycle' ? '#00ff88' : '#888',
                        border: `1px solid ${mode === 'cycle' ? '#00ff88' : '#333'}`,
                        cursor: 'pointer', fontSize: isMobile ? '16px' : '12px',
                        fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                    }}
                    title="Cycle"
                >
                    🚴 {!isMobile && 'Cycle'}
                </button>
                <button
                    onClick={() => onModeChange('car')}
                    style={{
                        flex: 1, padding: isMobile ? '6px' : '8px', borderRadius: '6px',
                        background: mode === 'car' ? 'rgba(59,130,246,0.2)' : 'transparent',
                        color: mode === 'car' ? '#3b82f6' : '#888',
                        border: `1px solid ${mode === 'car' ? '#3b82f6' : '#333'}`,
                        cursor: 'pointer', fontSize: isMobile ? '16px' : '12px',
                        fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                    }}
                    title="Car (Driving)"
                >
                    🚗 {!isMobile && 'Car'}
                </button>
            </div>
        </div>
    );
};
