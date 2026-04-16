import React from 'react';

interface TabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const TABS = [
    { id: 'voxel', label: 'Voxel', icon: '🧱' },
    { id: 'map', label: 'Map', icon: '🗺️' },
    { id: 'gps', label: 'GPS', icon: '📍' },
    { id: 'wifi', label: 'WiFi', icon: '📶' },
    { id: 'ar', label: 'AR', icon: '📷' },
    { id: 'thesis', label: 'Thesis', icon: '📜' },
    { id: 'layout', label: 'Layout', icon: '📐' }
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
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: isMobile ? '4px' : '8px',
            background: 'var(--color-surface)',
            padding: '6px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'var(--blur-card)',
            zIndex: 3000,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
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
                        padding: isMobile ? '10px' : '10px 20px',
                        background: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                        border: 'none',
                        color: activeTab === tab.id ? '#fff' : 'var(--color-muted)',
                        borderRadius: 'var(--radius-pill)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        whiteSpace: 'nowrap',
                        borderBottom: activeTab === tab.id ? '2px solid var(--color-success)' : '2px solid transparent'
                    }}
                    title={tab.label}
                >
                    <span style={{ fontSize: '18px' }}>{tab.icon}</span>
                    {!isMobile && <span>{tab.label}</span>}
                </button>
            ))}
        </div>
    );
};
