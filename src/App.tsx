import React, { useState, Suspense, lazy } from 'react';
import { Tabs } from './components/Tabs';

// Lazy load pages for performance
const VoxelCampus = lazy(() => import('./pages/VoxelCampus').then(m => ({ default: m.VoxelCampus })));
const RealMap = lazy(() => import('./pages/RealMap').then(m => ({ default: m.RealMap })));
const GPSTab = lazy(() => import('./pages/GPSTab').then(m => ({ default: m.GPSTab })));
const WifiTab = lazy(() => import('./pages/WifiTab').then(m => ({ default: m.WifiTab })));
const ARPage = lazy(() => import('./pages/ARPage').then(m => ({ default: m.ARPage })));
const ThesisTab = lazy(() => import('./pages/ThesisTab').then(m => ({ default: m.ThesisTab })));
const LayoutToolTab = lazy(() => import('./pages/LayoutToolTab').then(m => ({ default: m.LayoutToolTab })));

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState('voxel');
    const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
    const [transportMode, setTransportMode] = useState<'walk' | 'cycle' | 'car'>('walk');

    const renderTab = () => {
        switch (activeTab) {
            case 'voxel': return <VoxelCampus selectedBuildingId={selectedBuildingId} onSelectBuilding={setSelectedBuildingId} transportMode={transportMode} onTransportModeChange={setTransportMode} />;
            case 'map': return <RealMap selectedBuildingId={selectedBuildingId} onSelectBuilding={setSelectedBuildingId} transportMode={transportMode} />;
            case 'gps': return <GPSTab />;
            case 'wifi': return <WifiTab />;
            case 'ar': return <ARPage />;
            case 'thesis': return <ThesisTab />;
            case 'layout': return <LayoutToolTab />;
            default: return <VoxelCampus selectedBuildingId={selectedBuildingId} onSelectBuilding={setSelectedBuildingId} transportMode={transportMode} onTransportModeChange={setTransportMode} />;
        }
    };

    return (
        <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, background: '#000', overflow: 'hidden' }}>
            <Suspense fallback={
                <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#00ff88', fontFamily: 'monospace' }}>
                    INITIALIZING DIGITAL TWIN...
                </div>
            }>
                {renderTab()}
            </Suspense>
            <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
};

export default App;
