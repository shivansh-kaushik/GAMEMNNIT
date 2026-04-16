import React, { useEffect, useState } from 'react';
import { gpsSensor, GPSData } from '../sensors/gps';
import { MetricsDashboard } from '../components/ui/MetricsDashboard';

interface GPSTabProps {
    astarLatency?: number;
    crossTrackError?: number;
    gpsAccuracy?: number;
    coneAngle?: number;
}

export const GPSTab: React.FC<GPSTabProps> = ({ 
    astarLatency = 12.5, 
    crossTrackError = 0.45, 
    gpsAccuracy = 3.2, 
    coneAngle = 24.5 
}) => {
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
        <div className="h-full bg-[#0a0a0a] flex items-center justify-center p-6 pb-24">
            <div className="w-full max-w-lg">
                <h1 className="text-blue-500 font-black italic uppercase tracking-tighter text-3xl mb-8 text-center">
                    System Diagnostics
                </h1>
                
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-xl mb-6 text-sm font-bold text-center">
                        ⚠ Sensor Error: {error}
                    </div>
                )}

                <MetricsDashboard 
                    aStarLatencyMs={astarLatency}
                    gpsAccuracyMeters={data?.accuracy || gpsAccuracy}
                    confidenceConeAngle={coneAngle}
                    crossTrackError={crossTrackError}
                    dslsCorrectionMeters={0.15}
                    pathDeviation={0.2}
                    distanceToTarget={140}
                />

                {data && (
                    <div className="mt-8 text-center text-[10px] text-white/20 font-bold tracking-widest uppercase">
                        Telemetric Stream: {data.latitude.toFixed(5)}, {data.longitude.toFixed(5)} | {new Date(data.timestamp).toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
};
