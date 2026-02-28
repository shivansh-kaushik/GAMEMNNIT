import React from 'react';

interface TabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const TABS = [
    { id: 'voxel', label: '🧱 VOXEL CAMPUS', icon: '🏰' },
    { id: 'map', label: '🗺 REAL MAP', icon: '🌍' },
    { id: 'nav', label: '📍 NAVIGATION', icon: '🧭' },
    { id: 'gps', label: '📡 GPS', icon: '📍' },
    { id: 'wifi', label: '📶 WIFI RSSI', icon: '📡' },
];

export const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange }) => {
    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            background: 'rgba(0,0,0,0.85)',
            padding: '10px 20px',
            borderRadius: '50px',
            border: '1px solid rgba(0,255,136,0.3)',
            backdropFilter: 'blur(10px)',
            zIndex: 1000,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    style={{
                        padding: '8px 16px',
                        background: activeTab === tab.id ? 'rgba(0,255,136,0.2)' : 'transparent',
                        border: 'none',
                        color: activeTab === tab.id ? '#00ff88' : '#aaa',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>
    );
};
