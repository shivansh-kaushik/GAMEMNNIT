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
    return (
        <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            backgroundColor: 'rgba(50, 50, 50, 0.95)',
            border: '4px solid #000',
            padding: '20px',
            color: 'white',
            fontFamily: '"Courier New", Courier, monospace',
            zIndex: 1000,
            pointerEvents: 'auto'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h2 style={{ margin: 0, color: '#ffcc00' }}>CREATIVE INVENTORY</h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                maxHeight: '300px',
                overflowY: 'auto',
                paddingRight: '5px'
            }}>
                {INVENTORY.map(item => (
                    <div
                        key={item.id}
                        onClick={() => onSelect(item)}
                        style={{
                            aspectRatio: '1',
                            backgroundColor: '#333',
                            border: '2px solid #555',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '8px',
                            textAlign: 'center',
                            padding: '4px'
                        }}
                    >
                        <div style={{
                            width: '30px',
                            height: '30px',
                            backgroundColor: item.color,
                            border: '1px solid #777',
                            marginBottom: '4px'
                        }} />
                        {item.name}
                    </div>
                ))}
            </div>
        </div>
    );
};
