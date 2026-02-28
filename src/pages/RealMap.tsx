import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CAMPUS_BUILDINGS, MNNIT_BOUNDS } from '../navigation/buildings';
import { gpsSensor, GPSData } from '../sensors/gps';

// Fix Leaflet marker icon issues in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RealMapProps {
    selectedBuildingId: string | null;
    onSelectBuilding: (id: string | null) => void;
}

// Component to handle map centering
const MapController = ({ center }: { center: [number, number] | null }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

export const RealMap: React.FC<RealMapProps> = ({ selectedBuildingId, onSelectBuilding }) => {
    const center: [number, number] = [25.4915, 81.866];
    const [gpsPos, setGpsPos] = useState<[number, number] | null>(null);

    useEffect(() => {
        gpsSensor.startWatching(
            (data) => setGpsPos([data.latitude, data.longitude]),
            (err) => console.error(err)
        );
        return () => gpsSensor.stopWatching();
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#111', position: 'relative' }}>
            <MapContainer
                center={center}
                zoom={17}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <MapController center={selectedBuildingId ? [CAMPUS_BUILDINGS.find(b => b.id === selectedBuildingId)?.latitude || center[0], CAMPUS_BUILDINGS.find(b => b.id === selectedBuildingId)?.longitude || center[1]] : null} />

                {/* Campus Boundary */}
                <Polygon
                    positions={[
                        [25.485, 81.855],
                        [25.498, 81.855],
                        [25.498, 81.875],
                        [25.485, 81.875]
                    ]}
                    pathOptions={{ color: '#00ff88', fillOpacity: 0.1, dashArray: '5, 10' }}
                />

                {/* GPS Blue Dot */}
                {gpsPos && (
                    <CircleMarker
                        center={gpsPos}
                        radius={8}
                        pathOptions={{ color: '#ffffff', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
                    >
                        <Popup>Your Current Location</Popup>
                    </CircleMarker>
                )}

                {CAMPUS_BUILDINGS.map(b => (
                    <Marker
                        key={b.id}
                        position={[b.latitude, b.longitude]}
                        eventHandlers={{
                            click: () => onSelectBuilding(b.id)
                        }}
                    >
                        <Popup>
                            <div style={{ textAlign: 'center', minWidth: '120px' }}>
                                <strong style={{ color: selectedBuildingId === b.id ? '#00ff88' : '#333' }}>{b.name}</strong><br />
                                <span style={{ fontSize: '12px', color: '#666' }}>Type: {b.type}</span><br />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectBuilding(b.id);
                                    }}
                                    style={{
                                        marginTop: '10px',
                                        padding: '5px 10px',
                                        background: '#00ff88',
                                        color: '#000',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '10px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {selectedBuildingId === b.id ? 'SELECTED' : 'SELECT BUILDING'}
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000 }}>
                <div style={{ background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '8px', border: '1px solid #00ff88', backdropFilter: 'blur(10px)' }}>
                    <h2 style={{ color: '#00ff88', margin: '0 0 5px 0', fontSize: '14px', letterSpacing: '1px' }}>🗺 GIS DIGITAL TWIN</h2>
                    <p style={{ color: '#aaa', margin: 0, fontSize: '11px' }}>OpenStreetMap Integration (MNNIT Allahabad)</p>
                    {selectedBuildingId && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#fff', borderTop: '1px solid #333', paddingTop: '10px' }}>
                            Selected: <strong>{CAMPUS_BUILDINGS.find(b => b.id === selectedBuildingId)?.name}</strong>
                        </div>
                    )}
                </div>
            </div>

            {gpsPos && (
                <button
                    onClick={() => { }} // Centering handled by state if needed, but CircleMarker is visible
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
