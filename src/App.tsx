import React, { useState, Suspense, lazy } from 'react';
import { BottomNav, TabId } from './components/ui/BottomNav';
import { RouteStep } from './components/ui/RouteCard';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load components for performance
const VoxelCampus = lazy(() => import('./pages/VoxelCampus').then(m => ({ default: m.VoxelCampus })));
const RealMap = lazy(() => import('./pages/RealMap').then(m => ({ default: m.RealMap })));
const LayoutToolTab = lazy(() => import('./pages/LayoutToolTab').then(m => ({ default: m.LayoutToolTab })));
const GPSTab = lazy(() => import('./pages/GPSTab').then(m => ({ default: m.GPSTab })));
const PositioningPage = lazy(() => import('./pages/PositioningPage').then(m => ({ default: m.PositioningPage })));
const ARPage = lazy(() => import('./pages/ARPage').then(m => ({ default: m.ARPage })));
const ThesisTab = lazy(() => import('./pages/ThesisTab').then(m => ({ default: m.ThesisTab })));

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('voxel');
    const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
    const [transportMode, setTransportMode] = useState<'walk' | 'cycle' | 'car'>('walk');

    // Shared "Single Source of Truth" Navigation State
    const [activePath, setActivePath] = useState<string[]>([]);
    const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
    const [destinationId, setDestinationId] = useState<string | null>(null);

    // Callback stability for child component lifecycle
    const handleDestinationUpdate = React.useCallback((id: string | null) => {
        setDestinationId(id);
        if (!id) {
            setActivePath([]);
            setRouteSteps([]);
        }
    }, [setDestinationId, setActivePath, setRouteSteps]);

    const handleArStop = React.useCallback(() => {
        setDestinationId(null);
        setActivePath([]);
        setRouteSteps([]);
    }, [setDestinationId, setActivePath, setRouteSteps]);

    const renderTab = () => {
        switch (activeTab) {
            case 'voxel': return (
                <ErrorBoundary fallbackTitle="Campus Voxel Error">
                    <VoxelCampus 
                        selectedBuildingId={selectedBuildingId} 
                        onSelectBuilding={setSelectedBuildingId} 
                        transportMode={transportMode} 
                        onTransportModeChange={setTransportMode} 
                    />
                </ErrorBoundary>
            );
            case 'map': return (
                <ErrorBoundary fallbackTitle="Map Engine Error">
                    <RealMap 
                        selectedBuildingId={selectedBuildingId} 
                        onSelectBuilding={setSelectedBuildingId} 
                        transportMode={transportMode}
                        sharedPath={activePath}
                        onPathUpdate={setActivePath}
                        sharedSteps={routeSteps}
                        onStepsUpdate={setRouteSteps}
                        sharedDestinationId={destinationId}
                        onDestinationUpdate={handleDestinationUpdate}
                        onStartAR={() => setActiveTab('ar')}
                    />
                </ErrorBoundary>
            );
            case 'metrics': return (
                <GPSTab 
                    astarLatency={12.5} 
                    crossTrackError={0.45}
                    gpsAccuracy={3.2}
                    coneAngle={24.5}
                />
            );
            case 'graph': return <PositioningPage />;
            case 'ar': return (
                <ErrorBoundary fallbackTitle="AR Engine Error">
                    <ARPage 
                        sharedPath={activePath} 
                        sharedDestinationId={destinationId}
                        onArStop={handleArStop}
                        onDestinationChange={setDestinationId}
                    />
                </ErrorBoundary>
            );
            case 'thesis': return <ThesisTab />;
            case 'layout': return <LayoutToolTab />;
            default: return (
                <VoxelCampus 
                    selectedBuildingId={selectedBuildingId} 
                    onSelectBuilding={setSelectedBuildingId} 
                    transportMode={transportMode} 
                    onTransportModeChange={setTransportMode} 
                />
            );
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-[#030303] overflow-hidden">
            <main className="flex-1 relative overflow-hidden">
                <Suspense fallback={
                    <div className="h-full w-full flex items-center justify-center bg-[#030303]">
                        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                }>
                    <div key={activeTab} className="h-full w-full animate-fade-in shadow-inner">
                        {renderTab()}
                    </div>
                </Suspense>
            </main>

            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
};

export default App;
