import React, { useEffect, useState } from 'react';
import { gpsSensor, GPSData } from '../sensors/gps';
import { MetricsDashboard } from '../components/ui/MetricsDashboard';
import { 
  Activity, 
  Wifi, 
  Zap, 
  Gauge, 
  BarChart3,
  Play
} from 'lucide-react';
import { benchmarkNavigation } from '../benchmarks/AStarStressTest';

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
    const [benchmarkResults, setBenchmarkResults] = useState<any>(null);
    const [isBenchmarking, setIsBenchmarking] = useState(false);

    useEffect(() => {
        gpsSensor.startWatching(
            (update) => setData(update),
            (err) => setError(err.message)
        );
        return () => gpsSensor.stopWatching();
    }, []);

    const runBenchmark = () => {
        setIsBenchmarking(true);
        setTimeout(() => {
            const results = benchmarkNavigation(250);
            setBenchmarkResults(results);
            setIsBenchmarking(false);
        }, 800);
    };

    return (
        <div className="h-full bg-[#030303] text-slate-200 font-sans overflow-y-auto pb-24 scrollbar-none antialiased">
            <div className="max-w-xl mx-auto p-6 flex flex-col gap-6">
                
                {/* Header */}
                <div className="text-center pt-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Live Telemetry</span>
                    </div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">System Diagnostics</h1>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Production Node: MNNIT-NAV-01</p>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-xl text-xs font-bold text-center">
                        ⚠ Sensor Error: {error}
                    </div>
                )}

                {/* Accuracy Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <StatCard label="GPS Accuracy" value={`${(data?.accuracy || gpsAccuracy).toFixed(1)}m`} sub="Vertical Gate" icon={<Activity size={16}/>} accent="emerald" />
                    <StatCard label="A* Latency" value={`${astarLatency.toFixed(1)}ms`} sub="Planning Engine" icon={<Zap size={16}/>} accent="blue" />
                    <StatCard label="Cross-Track" value={`${crossTrackError.toFixed(2)}m`} sub="Path Deviation" icon={<BarChart3 size={16}/>} accent="blue" />
                    <StatCard label="Confidence" value={`${coneAngle.toFixed(1)}°`} sub="Heading Lock" icon={<Gauge size={16}/>} accent="emerald" />
                </div>

                {/* Infrastructure Connectivity */}
                <Card title="Infrastructure Connectivity" icon={<Wifi size={16} />} accent="blue">
                    <div className="flex flex-col gap-3">
                        <StatusRow label="Appwrite Cloud" status="Connected" />
                        <StatusRow label="Geospatial DB" status="403 Restricted" isError />
                        <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl mt-2">
                            <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest text-center">
                                Action Required: Add GAMEMNNIT.VERCEL.APP to Authorized Platforms
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Performance Stress Test */}
                <Card title="A* Engine Performance" icon={<Zap size={16} />} accent="emerald">
                    {!benchmarkResults && !isBenchmarking ? (
                         <div className="flex flex-col items-center gap-4 py-4">
                             <p className="text-xs text-slate-500 text-center px-6 leading-relaxed">
                                Run a localized stress test suite to measure real-time pathfinding efficiency on this device's hardware.
                             </p>
                             <button 
                               onClick={runBenchmark}
                               className="px-8 py-3 bg-emerald-500 text-black font-black uppercase tracking-tighter rounded-2xl flex items-center gap-2 hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_8px_24px_rgba(16,185,129,0.3)]"
                             >
                                <Play size={16} fill="currentColor" /> Run Performance Suite
                             </button>
                         </div>
                    ) : isBenchmarking ? (
                         <div className="flex flex-col items-center gap-4 py-10">
                            <div className="flex gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Executing 250 Queries...</span>
                         </div>
                    ) : (
                        <div className="flex flex-col gap-4 animate-fade-in">
                            <div className="grid grid-cols-2 gap-3">
                                <MetricBox label="Mean (avg)" value={`${benchmarkResults.meanMs}ms`} />
                                <MetricBox label="P99 (peak)" value={`${benchmarkResults.p99Ms}ms`} />
                                <MetricBox label="Std Dev" value={`${benchmarkResults.stdDevMs}ms`} />
                                <MetricBox label="Max" value={`${benchmarkResults.maxMs}ms`} />
                            </div>
                            <button 
                               onClick={runBenchmark}
                               className="w-full py-2 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all"
                             >
                                Re-run Benchmark
                             </button>
                        </div>
                    )}
                </Card>

                {data && (
                    <div className="mt-8 text-center text-[10px] text-white/10 font-bold tracking-[0.2em] uppercase italic">
                        Telemetric Stream // {data.latitude.toFixed(5)}, {data.longitude.toFixed(5)} // {new Date().toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
};

const Card = ({ title, icon, accent, children }: any) => (
    <div className={`p-6 rounded-[32px] bg-slate-900/40 backdrop-blur-3xl border border-white/5 shadow-2xl overflow-hidden relative`}>
        <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-xl border border-white/5 ${accent === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {icon}
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</h3>
        </div>
        {children}
    </div>
);

const StatCard = ({ label, value, sub, icon, accent }: any) => (
    <div className="p-5 rounded-[28px] bg-slate-900/40 backdrop-blur-3xl border border-white/5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-lg ${accent === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {icon}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{sub}</span>
        </div>
        <div className="text-2xl font-black italic uppercase tracking-tighter text-white mb-1 leading-none">{value}</div>
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{label}</div>
    </div>
);

const StatusRow = ({ label, status, isError }: any) => (
    <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{label}</span>
        <div className="flex items-center gap-2">
            <span className={`text-xs font-black italic uppercase tracking-tighter ${
                status === 'Connected' ? 'text-emerald-400' : isError ? 'text-slate-600' : 'text-blue-400'
            }`}>
                {status}
            </span>
            <div className={`w-1 h-1 rounded-full ${
                 status === 'Connected' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'
            }`} />
        </div>
    </div>
);

const MetricBox = ({ label, value }: any) => (
    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col gap-1 text-center">
        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-black italic uppercase tracking-tighter text-emerald-400">{value}</span>
    </div>
);
