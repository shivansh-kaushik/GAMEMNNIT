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
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 640);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{
            position: 'absolute',
            bottom: isMobile ? '10px' : '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: isMobile ? '5px' : '10px',
            background: 'rgba(0,0,0,0.85)',
            padding: isMobile ? '8px 12px' : '10px 20px',
            borderRadius: '50px',
            border: '1px solid rgba(0,255,136,0.3)',
            backdropFilter: 'blur(15px)',
            zIndex: 3000,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            width: isMobile ? '95vw' : 'auto',
            justifyContent: 'center',
            overflowX: 'auto',
            scrollbarWidth: 'none'
        }}>
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    style={{
                        padding: isMobile ? '8px' : '8px 16px',
                        background: activeTab === tab.id ? 'rgba(0,255,136,0.2)' : 'transparent',
                        border: 'none',
                        color: activeTab === tab.id ? '#00ff88' : '#aaa',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        fontSize: isMobile ? '14px' : '12px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                        minWidth: isMobile ? '40px' : 'auto'
                    }}
                    title={tab.label}
                >
                    <span style={{ fontSize: isMobile ? '20px' : '16px' }}>{tab.icon}</span>
                    {!isMobile && <span>{tab.label}</span>}
                </button>
            ))}
        </div>
    );
};
