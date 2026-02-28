import React from 'react';
import { BuildingData } from '../../types';

interface MinimapProps {
    userPos: [number, number, number];
    buildings: BuildingData[];
    destination?: string | null;
    size?: number;
}

export const Minimap: React.FC<MinimapProps> = ({
    userPos,
    buildings,
    destination,
    size = 150
}) => {
    // Map bounds (approximate based on SceneManager GRID_SIZE/offset)
    const worldSize = 80;
    const offset = worldSize / 2;

    // Scale factor to fit 80 world units into minimap 'size' px
    const scale = size / worldSize;

    return (
        <div style={{
            width: size,
            height: size,
            background: 'rgba(15, 23, 42, 0.8)',
            border: '2px solid rgba(0, 255, 136, 0.5)',
            borderRadius: '8px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
        }}>
            {/* Grid */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px)',
                backgroundSize: '10px 10px'
            }} />

            {/* Buildings */}
            {buildings.map(b => (
                <div key={b.id} style={{
                    position: 'absolute',
                    left: (b.position[0] + offset) * scale,
                    top: (b.position[2] + offset) * scale,
                    width: b.size[0] * scale,
                    height: b.size[2] * scale,
                    background: b.name === destination ? 'rgba(0, 255, 136, 0.6)' : 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '2px'
                }} />
            ))}

            {/* User Pointer */}
            <div style={{
                position: 'absolute',
                left: (userPos[0] + offset) * scale - 4,
                top: (userPos[2] + offset) * scale - 4,
                width: 8,
                height: 8,
                background: '#ffcc00',
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 0 10px #ffcc00'
            }} />
        </div>
    );
};
