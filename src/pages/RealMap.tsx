import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Map, { Layer, Source, Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CAMPUS_BUILDINGS } from '../navigation/buildings';
import { gpsSensor } from '../sensors/gps';
import { fetchOSMBuildings, OSMGeoJSON } from '../core/fetchOSMBuildings';
import { TransportMode } from '../components/TransportSelector';
import pathData from '../data/mnnit_paths.json';

// Production UI Components
import { MapSearchBar } from '../components/ui/MapSearchBar';
import { RouteCard, RouteStep } from '../components/ui/RouteCard';

// Core Navigation
import { aStar } from '../navigation/astar';
import { buildGraphFromGeoJSON } from '../navigation/graphGenerator';
import { findNearestGraphNode } from '../navigation/nodeMatcher';
import { latLngToVoxel } from '../core/GISUtils';

interface RealMapProps {
    selectedBuildingId: string | null;
    onSelectBuilding: (id: string | null) => void;
    transportMode: TransportMode;
    // Shared State Props
    sharedPath: string[];
    onPathUpdate: (path: string[]) => void;
    sharedSteps: RouteStep[];
    onStepsUpdate: (steps: RouteStep[]) => void;
    sharedDestinationId: string | null;
    onDestinationUpdate: (id: string | null) => void;
    onStartAR: () => void;
    isActive?: boolean;
}

export const RealMap: React.FC<RealMapProps> = ({ 
    selectedBuildingId, 
    onSelectBuilding, 
    transportMode,
    sharedPath,
    onPathUpdate,
    sharedSteps,
    onStepsUpdate,
    sharedDestinationId,
    onDestinationUpdate,
    onStartAR,
    isActive = false
}) => {
    // @ts-ignore
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    const graph = useMemo(() => buildGraphFromGeoJSON(pathData), []);

    const [viewState, setViewState] = useState({
        latitude: 25.4924,
        longitude: 81.8639,
        zoom: 16,
        pitch: 60,
        bearing: 0
    });

    const [gpsPos, setGpsPos] = useState<[number, number] | null>(null);
    const [osmData, setOsmData] = useState<OSMGeoJSON | null>(null);

    useEffect(() => {
        gpsSensor.startWatching(
            (data) => setGpsPos([data.latitude, data.longitude]),
            (err) => console.error(err)
        );
        return () => gpsSensor.stopWatching();
    }, []);

    useEffect(() => {
        fetchOSMBuildings().then(data => {
            if (data) setOsmData(data);
        });
    }, []);

    // A* Navigation Engine Integration
    useEffect(() => {
        if (!sharedDestinationId || !gpsPos) return;

        const startVoxel = latLngToVoxel(gpsPos[0], gpsPos[1]);
        const startNode = findNearestGraphNode(startVoxel[0], startVoxel[2], graph.nodes);
        const destB = CAMPUS_BUILDINGS.find(b => b.id === sharedDestinationId);

        if (startNode && destB) {
            const destVoxel = latLngToVoxel(destB.latitude, destB.longitude);
            const destNode = findNearestGraphNode(destVoxel[0], destVoxel[2], graph.nodes);
            
            if (destNode) {
                const path = aStar(startNode, destNode, graph.nodes, graph.edges);
                onPathUpdate(path);

                // Convert Path Nodes to RouteSteps
                const steps: RouteStep[] = path.map((nodeId, idx) => {
                    const node = graph.nodes[nodeId];
                    return {
                        id: nodeId,
                        instruction: idx === 0 ? "Start journey" : idx === path.length - 1 ? `Arrive at ${destB.name}` : `Continue toward node ${nodeId}`,
                        distance: 10 // Placeholder for simplistic distance logic
                    };
                });
                onStepsUpdate(steps);
            }
        }
    }, [sharedDestinationId, gpsPos, graph, onPathUpdate, onStepsUpdate]);

    // Construct GeoJSON for Mapbox from path node IDs
    const routeGeoJSON = useMemo(() => {
        if (sharedPath.length < 2) return null;
        return {
            type: 'Feature' as const,
            properties: {}, // Required by some GeoJSON types
            geometry: {
                type: 'LineString' as const,
                coordinates: sharedPath.map(id => [graph.nodes[id].lng, graph.nodes[id].lat])
            }
        };
    }, [sharedPath, graph]);

    useEffect(() => {
        if (selectedBuildingId) {
            const b = CAMPUS_BUILDINGS.find(b => b.id === selectedBuildingId);
            if (b) {
                setViewState(prev => ({
                    ...prev,
                    latitude: b.latitude,
                    longitude: b.longitude,
                    zoom: 18,
                    pitch: 60
                }));
            }
        }
    }, [selectedBuildingId]);

    const buildingLayer: any = useMemo(() => ({
        id: 'osm-buildings',
        type: 'fill-extrusion',
        source: 'osm',
        paint: {
            'fill-extrusion-color': ['get', 'color'],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'base_height'],
            'fill-extrusion-opacity': 0.8
        }
    }), []);

    if (!token || token === 'YOUR_MAPBOX_ACCESS_TOKEN') {
        return (
            <div style={{ width: '100vw', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: 'red' }}>
                Please set VITE_MAPBOX_TOKEN in .env.local
            </div>
        );
    }

    return (
        <div style={{ width: '100vw', height: '100%', background: '#111', position: 'relative' }}>
            <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={token}
                style={{ width: '100%', height: '100%' }}
            >
                {osmData && (
                    <Source id="osm" type="geojson" data={osmData as any}>
                        <Layer {...buildingLayer} />
                    </Source>
                )}

                {routeGeoJSON && (
                    <Source id="route" type="geojson" data={routeGeoJSON}>
                        <Layer
                            id="route-line"
                            type="line"
                            paint={{
                                'line-color': '#3b82f6',
                                'line-width': 6,
                                'line-opacity': 0.9,
                                'line-blur': 2
                            }}
                        />
                    </Source>
                )}

                <NavigationControl position="bottom-right" />

                {gpsPos && (
                    <Marker latitude={gpsPos[0]} longitude={gpsPos[1]}>
                        <div className="w-5 h-5 bg-blue-500 rounded-full border-4 border-white shadow-lg shadow-blue-500/50" />
                    </Marker>
                )}

                {CAMPUS_BUILDINGS.map(b => (
                    <Marker
                        key={b.id}
                        latitude={b.latitude}
                        longitude={b.longitude}
                        onClick={e => {
                            e.originalEvent.stopPropagation();
                            onDestinationUpdate(b.id);
                        }}
                    >
                        <div style={{
                            padding: '4px 8px',
                            background: sharedDestinationId === b.id ? '#3b82f6' : 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            border: `1px solid ${sharedDestinationId === b.id ? '#3b82f6' : '#444'}`,
                            whiteSpace: 'nowrap',
                            backdropFilter: 'blur(5px)'
                        }}>
                            {b.name}
                        </div>
                    </Marker>
                ))}
            </Map>

            {/* Production UI Integration */}
            <MapSearchBar 
                onDestinationSelect={onDestinationUpdate} 
                buildings={CAMPUS_BUILDINGS} 
            />

            {sharedDestinationId && sharedSteps.length > 0 && (
                <RouteCard 
                    destination={CAMPUS_BUILDINGS.find(b => b.id === sharedDestinationId)}
                    steps={sharedSteps}
                    onStartAR={onStartAR}
                />
            )}

            {/* FPV & Legacy WiFi Overlays (Minimalized) */}
            <div style={{ position: 'absolute', top: '100px', left: '20px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 {/* Existing RSSI panel remains if needed, but standard is MapSearchBar */}
            </div>

            {gpsPos && (
                <button
                    onClick={() => setViewState(prev => ({ ...prev, latitude: gpsPos[0], longitude: gpsPos[1], zoom: 18 }))}
                    style={{
                        position: 'absolute', bottom: '120px', right: '16px', zIndex: 10,
                        width: '44px', height: '44px', borderRadius: '50%', background: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                    }}
                >
                    📍
                </button>
            )}
        </div>
    );
};
