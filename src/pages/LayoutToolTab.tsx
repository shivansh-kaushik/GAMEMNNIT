import React from 'react';

export const LayoutToolTab: React.FC = () => {
    return (
        <div style={{ width: '100vw', height: '100vh', background: '#111', color: '#fff' }}>
            <iframe 
                src="/campuslayout.html" 
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Voxel Campus Layout Tool"
            />
            {/* Overlay hint if they want to go back, though the Tabs component handles navigation */}
        </div>
    );
};
