import React, { useState } from 'react';

/**
 * A specialized Minecraft-style Creative Inventory.
 */
export interface InventoryItem {
    id: string;
    name: string;
    type: 'B' | 'R';
    color: string;
}

const INVENTORY: InventoryItem[] = [
    { id: 'b1', name: 'Gray Block', type: 'B', color: '#888888' },
    { id: 'b2', name: 'Red Brick', type: 'B', color: '#774444' },
    { id: 'b3', name: 'Wood Planks', type: 'B', color: '#664422' },
    { id: 'b4', name: 'Blue Glass', type: 'B', color: '#444477' },
    { id: 'b5', name: 'Green Moss', type: 'B', color: '#447744' },
    { id: 'b6', name: 'White Stone', type: 'B', color: '#dddddd' },
    { id: 'r1', name: 'Asphalt Road', type: 'R', color: '#222222' },
];

interface InventoryProps {
    onSelect: (item: InventoryItem) => void;
    onClose: () => void;
}

export const Inventory: React.FC<InventoryProps> = ({ onSelect, onClose }) => {
    const isMobile = window.innerWidth < 640;

    return (
        <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: isMobile ? '90vw' : '400px',
            backgroundColor: 'rgba(30, 30, 30, 0.98)',
            border: '2px solid #00ff88',
            borderRadius: '12px',
            padding: isMobile ? '15px' : '20px',
            color: 'white',
            fontFamily: 'monospace',
            zIndex: 4000,
            pointerEvents: 'auto',
            boxShadow: '0 0 30px rgba(0,0,0,0.8), 0 0 10px rgba(0,255,136,0.2)',
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: '#00ff88', fontSize: isMobile ? '16px' : '20px', letterSpacing: '1px' }}>BLOCKS</h2>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255,50,50,0.2)',
                        border: '1px solid #ff4444',
                        color: '#ff4444',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >✕</button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(70px, 1fr))' : 'repeat(3, 1fr)',
                gap: '12px',
                maxHeight: isMobile ? '60vh' : '400px',
                overflowY: 'auto',
                paddingRight: '5px'
            }}>
                {INVENTORY.map(item => (
                    <div
                        key={item.id}
                        onClick={() => onSelect(item)}
                        style={{
                            aspectRatio: '1',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '10px',
                            textAlign: 'center',
                            padding: '8px',
                            transition: 'all 0.2s ease',
                            outline: 'none'
                        }}
                    >
                        <div style={{
                            width: isMobile ? '35px' : '40px',
                            height: isMobile ? '35px' : '40px',
                            backgroundColor: item.color,
                            border: '2px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            marginBottom: '6px',
                            boxShadow: `0 4px 10px ${item.color}44`
                        }} />
                        <span style={{ color: '#ccc', fontWeight: '500' }}>{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
