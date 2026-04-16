import React, { useState, Suspense, lazy } from 'react';
import { BottomNav, TabId } from './components/ui/BottomNav';
import { RouteStep } from './components/ui/RouteCard';

// Lazy load pages for performance
const VoxelCampus = lazy(() => import('./pages/VoxelCampus').then(m => ({ default: m.VoxelCampus })));
const RealMap = lazy(() => import('./pages/RealMap').then(m => ({ default: m.RealMap })));
const GPSTab = lazy(() => import('./pages/GPSTab').then(m => ({ default: m.GPSTab })));
const WifiTab = lazy(() => import('./pages/WifiTab').then(m => ({ default: m.WifiTab }))); // Repurposed for Graph
const ARPage = lazy(() => import('./pages/ARPage').then(m => ({ default: m.ARPage })));
const ThesisTab = lazy(() => import('./pages/ThesisTab').then(m => ({ default: m.ThesisTab })));
const LayoutToolTab = lazy(() => import('./pages/LayoutToolTab').then(m => ({ default: m.LayoutToolTab })));

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('voxel');
    const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
    const [transportMode, setTransportMode] = useState<'walk' | 'cycle' | 'car'>('walk');

    // Shared Navigation State
    const [activePath, setActivePath] = useState<string[]>([]);
    const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
    const [destinationId, setDestinationId] = useState<string | null>(null);

    const renderTab = () => {
        switch (activeTab) {
            case 'voxel': return <VoxelCampus selectedBuildingId={selectedBuildingId} onSelectBuilding={setSelectedBuildingId} transportMode={transportMode} onTransportModeChange={setTransportMode} />;
            case 'map': return (
                <RealMap 
                    selectedBuildingId={selectedBuildingId} 
                    onSelectBuilding={setSelectedBuildingId} 
                    transportMode={transportMode}
                    sharedPath={activePath}
                    onPathUpdate={setActivePath}
                    sharedSteps={routeSteps}
                    onStepsUpdate={setRouteSteps}
                    sharedDestinationId={destinationId}
                    onDestinationUpdate={(id) => {
                        setDestinationId(id);
                        if (!id) {
                            setActivePath([]);
                            setRouteSteps([]);
                        }
                    }}
                    onStartAR={() => setActiveTab('ar')}
                />
            );
            case 'metrics': return (
                <GPSTab 
                    astarLatency={12.5} // Mock or real values from navigation engine
                    crossTrackError={0.45}
                    gpsAccuracy={3.2}
                    coneAngle={24.5}
                />
            );
            case 'graph': return <LayoutToolTab />;
            case 'ar': return (
                <ARPage 
                    sharedPath={activePath} 
                    sharedDestinationId={destinationId}
                    onArStop={() => {
                        setDestinationId(null);
                        setActivePath([]);
                        setRouteSteps([]);
                    }}
                    onDestinationChange={setDestinationId}
                />
            );
            case 'thesis': return <ThesisTab />;
            default: return <VoxelCampus selectedBuildingId={selectedBuildingId} onSelectBuilding={setSelectedBuildingId} transportMode={transportMode} onTransportModeChange={setTransportMode} />;
        }
    };

    return (
        <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, position: 'relative' }}>
                <Suspense fallback={
                    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#3b82f6', fontFamily: 'monospace' }}>
                        INITIALIZING SYSTEM...
                    </div>
                }>
                    {renderTab()}
                </Suspense>
            </div>
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} darkMode={true} />
        </div>
    );
};

export default App;
