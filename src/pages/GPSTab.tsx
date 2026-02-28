import React, { useEffect, useState } from 'react';
import { gpsSensor, GPSData } from '../sensors/gps';

export const GPSTab: React.FC = () => {
    const [data, setData] = useState<GPSData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        gpsSensor.startWatching(
            (update) => setData(update),
            (err) => setError(err.message)
        );
        return () => gpsSensor.stopWatching();
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: 'white', fontFamily: 'monospace' }}>
            <div style={{ background: '#111', padding: '40px', borderRadius: '15px', border: '1px solid #00ff88', width: '400px', boxShadow: '0 0 50px rgba(0,255,136,0.1)' }}>
                <h1 style={{ color: '#00ff88', fontSize: '24px', textAlign: 'center', margin: '0 0 30px 0' }}>📡 LIVE GPS SENSORS</h1>

                {error && (
                    <div style={{ padding: '15px', background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '5px', marginBottom: '20px' }}>
                        ⚠ Error: {error}
                    </div>
                )}

                {data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <SensorRow label="LATITUDE" value={data.latitude.toFixed(6)} />
                        <SensorRow label="LONGITUDE" value={data.longitude.toFixed(6)} />
                        <SensorRow label="ACCURACY" value={`${data.accuracy?.toFixed(1) || '0'} m`} />
                        <SensorRow label="ALTITUDE" value={`${data.altitude?.toFixed(1) || '0'} m`} />
                        <SensorRow label="SPEED" value={`${data.speed?.toFixed(1) || '0'} m/s`} />
                        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#444' }}>
                            LAST SYNC: {new Date(data.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#00ff88' }}>
                        {/* Loading spinner animation would go here */}
                        WAITING FOR SIGNAL...
                    </div>
                )}
            </div>
        </div>
    );
};

const SensorRow = ({ label, value }: { label: string, value: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222', paddingBottom: '5px' }}>
        <span style={{ color: '#666' }}>{label}</span>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>{value}</span>
    </div>
);
