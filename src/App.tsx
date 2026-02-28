import React, { useState, Suspense, lazy } from 'react';
import { Tabs } from './components/Tabs';

// Lazy load pages for performance
const VoxelCampus = lazy(() => import('./pages/VoxelCampus').then(m => ({ default: m.VoxelCampus })));
const RealMap = lazy(() => import('./pages/RealMap').then(m => ({ default: m.RealMap })));
const NavigationTab = lazy(() => import('./pages/NavigationTab').then(m => ({ default: m.NavigationTab })));
const GPSTab = lazy(() => import('./pages/GPSTab').then(m => ({ default: m.GPSTab })));
const WifiTab = lazy(() => import('./pages/WifiTab').then(m => ({ default: m.WifiTab })));

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState('voxel');
    const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

    const renderTab = () => {
        switch (activeTab) {
            case 'voxel': return <VoxelCampus selectedBuildingId={selectedBuildingId} onSelectBuilding={setSelectedBuildingId} />;
            case 'map': return <RealMap selectedBuildingId={selectedBuildingId} onSelectBuilding={setSelectedBuildingId} />;
            case 'nav': return <NavigationTab selectedBuildingId={selectedBuildingId} onSelectBuilding={setSelectedBuildingId} setActiveTab={setActiveTab} />;
            case 'gps': return <GPSTab />;
            case 'wifi': return <WifiTab />;
            default: return <VoxelCampus selectedBuildingId={selectedBuildingId} onSelectBuilding={setSelectedBuildingId} />;
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
