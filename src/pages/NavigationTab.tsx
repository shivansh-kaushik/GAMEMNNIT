import React, { useState } from 'react';
import { CAMPUS_BUILDINGS } from '../navigation/buildings';

interface NavigationTabProps {
    selectedBuildingId: string | null;
    onSelectBuilding: (id: string | null) => void;
    setActiveTab: (tab: string) => void;
}

export const NavigationTab: React.FC<NavigationTabProps> = ({ selectedBuildingId, onSelectBuilding, setActiveTab }) => {
    const [origin, setOrigin] = useState('My Location');

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0a0a0a', padding: '60px 20px' }}>
            <div style={{ width: '100%', maxWidth: '600px', background: '#111', borderRadius: '20px', border: '1px solid #00ff88', overflow: 'hidden', boxShadow: '0 0 40px rgba(0,255,136,0.05)' }}>
                <div style={{ padding: '30px', borderBottom: '1px solid #222' }}>
                    <h1 style={{ color: '#00ff88', margin: '0 0 20px 0', fontSize: '20px' }}>🧭 SMART NAVIGATOR</h1>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>STARTING POINT</label>
                            <input
                                value={origin}
                                readOnly
                                style={{ width: '100%', background: '#050505', border: '1px solid #333', padding: '12px', color: '#fff', borderRadius: '8px', fontSize: '14px' }}
                            />
                        </div>

                        <div style={{ textAlign: 'center', color: '#00ff88', fontSize: '20px' }}>↓</div>

                        <div>
                            <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>DESTINATION</label>
                            <select
                                value={selectedBuildingId || ''}
                                onChange={(e) => onSelectBuilding(e.target.value)}
                                style={{ width: '100%', background: '#050505', border: '1px solid #333', padding: '12px', color: '#fff', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                            >
                                <option value="">Select a building...</option>
                                {CAMPUS_BUILDINGS.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '30px', background: 'rgba(0,0,0,0.2)' }}>
                    {selectedBuildingId ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#aaa', fontSize: '14px' }}>ESTIMATED TIME:</span>
                                <span style={{ color: '#00ff88', fontSize: '18px', fontWeight: 'bold' }}>3 mins</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#aaa', fontSize: '14px' }}>DISTANCE:</span>
                                <span style={{ color: '#fff', fontSize: '18px' }}>240 meters</span>
                            </div>
                            <button
                                onClick={() => setActiveTab('voxel')}
                                style={{ background: '#00ff88', color: '#000', border: 'none', padding: '15px', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                                START NAVIGATION
                            </button>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#444', fontSize: '14px', padding: '20px' }}>
                            Please select a destination to calculate path.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
