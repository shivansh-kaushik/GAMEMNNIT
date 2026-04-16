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
                <div className="text-center pt-4">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">System Diagnostics</h1>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <StatCard label="GPS Accuracy" value={`${gpsAccuracy.toFixed(1)}m`} sub="Vertical Gate" icon={<Activity size={16}/>} accent="emerald" />
                    <StatCard label="A* Latency" value={`${astarLatency.toFixed(1)}ms`} sub="Planning Engine" icon={<Zap size={16}/>} accent="blue" />
                    <StatCard label="Cross-Track" value={`${crossTrackError.toFixed(2)}m`} sub="Path Deviation" icon={<BarChart3 size={16}/>} accent="blue" />
                    <StatCard label="Confidence" value={`${coneAngle.toFixed(1)}°`} sub="Heading Lock" icon={<Gauge size={16}/>} accent="emerald" />
                </div>

                <Card title="Infrastructure Connectivity" icon={<Wifi size={16} />} accent="blue">
                    <div className="flex flex-col gap-3">
                        <StatusRow label="Appwrite Cloud" status="Connected" />
                        <StatusRow label="Geospatial DB" status="403 Restricted" isError />
                        <StatusRow label="Vector Engine" status="Ready" />
                    </div>
                        </p>
                    </div>
                </div>

                {data && (
                    <div className="mt-8 text-center text-[10px] text-white/10 font-bold tracking-[0.2em] uppercase italic">
                        Telemetric Stream // {data.latitude.toFixed(5)}, {data.longitude.toFixed(5)} // {new Date(data.timestamp).toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
};

const StatusRow = ({ label, status, isError = false }: { label: string, status: string, isError?: boolean }) => (
    <div className="flex justify-between items-center text-[11px]">
        <span className="text-slate-400 font-medium">{label}</span>
        <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isError ? 'bg-red-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
            <span className={isError ? 'text-red-400 font-bold' : 'text-slate-200 font-semibold'}>{status}</span>
        </div>
    </div>
);
