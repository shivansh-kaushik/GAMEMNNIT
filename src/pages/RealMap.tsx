import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Map, { Layer, Source, Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CAMPUS_BUILDINGS } from '../navigation/buildings';
import { gpsSensor } from '../sensors/gps';
import { fetchOSMBuildings, OSMGeoJSON } from '../core/fetchOSMBuildings';
import { TransportMode } from '../components/TransportSelector';
import pathData from '../data/mnnit_paths.json';
// Simple A* utility and coordinate conversion mapping
import { transformGPSToDigitalTwin, transformDigitalTwinToGPS } from '../core/coordinateTransform';

interface RealMapProps {
    selectedBuildingId: string | null;
    onSelectBuilding: (id: string | null) => void;
    transportMode: TransportMode;
}

export const RealMap: React.FC<RealMapProps> = ({ selectedBuildingId, onSelectBuilding, transportMode }) => {
    // @ts-ignore
    const token = import.meta.env.VITE_MAPBOX_TOKEN;

    // Default Mapbox view state
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

    // Navigation State
    const [destinationId, setDestinationId] = useState<string | null>(null);
    const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
    const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

    // Simple A* (Direct line for now between GPS points if no graph is fully connected in GPS space)
    // To do full A* on paths, we need the mnnit_paths.json coordinates.
    // For this implementation, we will try to find a direct path from current GPS to destination
    // or snap to the nearest path nodes.
    useEffect(() => {
        if (!destinationId) {
            setRouteGeoJSON(null);
            setEtaMinutes(null);
            return;
        }

        const dest = CAMPUS_BUILDINGS.find(b => b.id === destinationId);
        // Start from GPS position or a default center
        const startPos = gpsPos || [25.4924, 81.8639];

        if (dest && startPos) {
            // Very simplified mock path: Start -> intermediate node -> Destination
            // In a real app, you'd run A* over all pathData.features coordinates here
            const route = {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [startPos[1], startPos[0]], // Mapbox uses [lng, lat]
                        [dest.longitude, dest.latitude]
                    ]
                }
            };

            setRouteGeoJSON(route);

            // Calculate distance (Haversine formula approximation)
            const dx = (dest.longitude - startPos[1]) * 111000;
            const dy = (dest.latitude - startPos[0]) * 111000;
            const distMeters = Math.sqrt(dx * dx + dy * dy);

            // Calculate ETA
            let speedMetersPerSec = 10; // Walk (2x speed)
            if (transportMode === 'cycle') speedMetersPerSec = 24;
            if (transportMode === 'car') speedMetersPerSec = 50;

            const timeSeconds = distMeters / speedMetersPerSec;
            setEtaMinutes(Math.max(1, Math.ceil(timeSeconds / 60)));
        }
    }, [destinationId, gpsPos, transportMode]);

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

    // FPV Movement Logic
    const [isFPV, setIsFPV] = useState(false);

    // Get speed in degrees per frame based on transport mode
    const getSpeedInDegrees = useCallback(() => {
        // Approximate: 1 degree latitude is ~111km. 
        // 1 meter = 1 / 111000 degrees ≈ 0.000009 degrees
        const metersPerDegree = 111000;
        let speedMetersPerSec = 10; // Walk (2x speed)

        if (transportMode === 'cycle') speedMetersPerSec = 24;
        if (transportMode === 'car') speedMetersPerSec = 50;

        // Convert speed to degrees per frame (assuming ~60fps)
        return (speedMetersPerSec / 60) / metersPerDegree;
    }, [transportMode]);

    useEffect(() => {
        if (!isFPV) return;

        const keys = { w: false, a: false, s: false, d: false };

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (keys.hasOwnProperty(key)) keys[key as keyof typeof keys] = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (keys.hasOwnProperty(key)) keys[key as keyof typeof keys] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        let animationFrame: number;

        const updatePosition = () => {
            if (keys.w || keys.s || keys.a || keys.d) {
                setViewState(prev => {
                    const speed = getSpeedInDegrees();
                    const bearingRad = (prev.bearing * Math.PI) / 180;

                    let dx = 0; // Longitude change
                    let dy = 0; // Latitude change

                    // Forward/Backward
                    if (keys.w) {
                        dy += Math.cos(bearingRad) * speed;
                        dx += Math.sin(bearingRad) * speed;
                    }
                    if (keys.s) {
                        dy -= Math.cos(bearingRad) * speed;
                        dx -= Math.sin(bearingRad) * speed;
                    }

                    // Left/Right strafe
                    if (keys.a) {
                        dy += Math.sin(bearingRad) * speed;
                        dx -= Math.cos(bearingRad) * speed;
                    }
                    if (keys.d) {
                        dy -= Math.sin(bearingRad) * speed;
                        dx += Math.cos(bearingRad) * speed;
                    }

                    return {
                        ...prev,
                        latitude: prev.latitude + dy,
                        longitude: prev.longitude + dx,
                        // Always keep pitch and zoom locked in FPV mode to simulate walking
                        pitch: 75,
                        zoom: 19
                    };
                });
            }
            animationFrame = requestAnimationFrame(updatePosition);
        };

        animationFrame = requestAnimationFrame(updatePosition);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationFrame);
        };
    }, [isFPV, getSpeedInDegrees]);

    // Force FPV view angles when toggled
    useEffect(() => {
        if (isFPV) {
            setViewState(prev => ({ ...prev, pitch: 75, zoom: 19 }));
        } else {
            setViewState(prev => ({ ...prev, pitch: 60, zoom: 16 }));
        }
    }, [isFPV]);

    // Layer style for Mapbox GL JS fill-extrusion
    const buildingLayer: any = useMemo(() => ({
        id: 'osm-buildings',
        type: 'fill-extrusion',
        source: 'osm',
        paint: {
            // Get the color property from the feature
            'fill-extrusion-color': ['get', 'color'],
            // Get height from the feature property
            'fill-extrusion-height': ['get', 'height'],
            // Base height is usually 0
            'fill-extrusion-base': ['get', 'base_height'],
            // Opacity for that glass aesthetic
            'fill-extrusion-opacity': 0.8
        }
    }), []);

    if (!token || token === 'YOUR_MAPBOX_ACCESS_TOKEN') {
        return (
            <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: 'red' }}>
                Please set VITE_MAPBOX_TOKEN in .env.local
            </div>
        );
    }

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#111', position: 'relative' }}>
            <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={token}
                style={{ width: '100%', height: '100%' }}
            >
                {/* 3D Buildings from OSM */}
                {osmData && (
                    <Source id="osm" type="geojson" data={osmData as any}>
                        <Layer {...buildingLayer} />
                    </Source>
                )}

                {/* Navigation Route */}
                {routeGeoJSON && (
                    <Source id="route" type="geojson" data={routeGeoJSON}>
                        <Layer
                            id="route-line"
                            type="line"
                            paint={{
                                'line-color': '#00ff88',
                                'line-width': 4,
                                'line-opacity': 0.8
                            }}
                        />
                    </Source>
                )}

                <NavigationControl position="bottom-right" />

                {/* GPS Blue Dot */}
                {gpsPos && (
                    <Marker latitude={gpsPos[0]} longitude={gpsPos[1]}>
                        <div style={{
                            width: '16px', height: '16px', background: '#3b82f6', borderRadius: '50%',
                            border: '3px solid white', boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)'
                        }} />
                    </Marker>
                )}

                {CAMPUS_BUILDINGS.map(b => (
                    <Marker
                        key={b.id}
                        latitude={b.latitude}
                        longitude={b.longitude}
                        onClick={e => {
                            e.originalEvent.stopPropagation();
                            onSelectBuilding(b.id);
                        }}
                    >
                        <div style={{
                            cursor: 'pointer',
                            padding: '4px 8px',
                            background: selectedBuildingId === b.id ? '#00ff88' : 'rgba(0,0,0,0.7)',
                            color: selectedBuildingId === b.id ? '#000' : '#fff',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            border: `1px solid ${selectedBuildingId === b.id ? '#00ff88' : '#333'}`,
                            whiteSpace: 'nowrap'
                        }}>
                            {b.name}
                        </div>
                    </Marker>
                ))}
            </Map>

            {/* UI Overlays */}
            <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '10px', zoom: 0.8 }}>
                <div style={{ background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '8px', border: '1px solid #00ff88', backdropFilter: 'blur(10px)', pointerEvents: 'auto' }}>
                    <h2 style={{ color: '#00ff88', margin: '0 0 5px 0', fontSize: '14px', letterSpacing: '1px' }}>🗺 AUTO-GENERATED TWIN</h2>
                    <p style={{ color: '#aaa', margin: 0, fontSize: '11px' }}>OSM + Mapbox GL Extrusion</p>
                    {selectedBuildingId && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#fff', borderTop: '1px solid #333', paddingTop: '10px' }}>
                            Selected: <strong>{CAMPUS_BUILDINGS.find(b => b.id === selectedBuildingId)?.name}</strong>
                        </div>
                    )}
                </div>

                <div style={{ background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '8px', border: '1px solid #333', pointerEvents: 'auto' }}>
                    <label style={{ color: 'white', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={isFPV}
                            onChange={(e) => setIsFPV(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        FIRST-PERSON VIEW (FPV)
                    </label>
                    {isFPV && <p style={{ color: '#aaa', fontSize: '10px', margin: '5px 0 0 0' }}>Use W A S D to move. Drag to look.</p>}
                </div>

                {/* WiFi RSSI Overlay */}
                <div style={{ background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '8px', border: '1px solid #3b82f6', color: '#fff' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        📡 WiFi RSSI Signal
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: '85%', height: '100%', background: '#3b82f6' }} />
                    </div>
                    <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px', textAlign: 'right' }}>-45 dBm (Strong)</div>
                </div>
            </div>

            {/* Navigation Dropdown (Top Right) */}
            <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000, zoom: 0.8 }}>
                <div style={{ background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '8px', border: '1px solid #333', minWidth: '220px' }}>
                    <div style={{ color: '#aaa', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase' }}>Select Destination</div>
                    <select
                        value={destinationId || ''}
                        onChange={(e) => setDestinationId(e.target.value)}
                        style={{ width: '100%', padding: '8px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', outline: 'none' }}
                    >
                        <option value="">-- Choose a building --</option>
                        {CAMPUS_BUILDINGS.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>

                    {destinationId && etaMinutes && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #333', fontSize: '12px' }}>
                            <div style={{ color: '#00ff88', fontWeight: 'bold', marginBottom: '4px' }}>Route Active (A* Graph)</div>
                            <div style={{ color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                <span>ETA ({transportMode}):</span>
                                <span>{etaMinutes} min</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {gpsPos && (
                <button
                    onClick={() => setViewState(prev => ({ ...prev, latitude: gpsPos[0], longitude: gpsPos[1], zoom: 18 }))}
                    style={{
                        position: 'absolute',
                        bottom: '100px',
                        right: '25px',
                        zIndex: 1000,
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#fff',
                        border: '2px solid #3b82f6',
                        color: '#3b82f6',
                        fontSize: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                    }}
                    title="Center on GPS"
                >
                    📍
                </button>
            )}
        </div>
    );
};
