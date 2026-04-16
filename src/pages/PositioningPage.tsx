import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Activity, 
  Wifi, 
  Layers, 
  Compass, 
  Navigation2,
  AlertTriangle 
} from 'lucide-react';
import { requestAllPermissions, PermissionStatus } from '../wifi/wifiPermissions';
import { getNetworkInfo, onNetworkChange, NetworkInfoData } from '../wifi/networkInfo';
import { RSSI_FORMULA, APReading, getLatestNativeScan } from '../wifi/rssiTheory';
import { subscribeSensors, SensorSnapshot, startSensors } from '../indoor/sensorManager';
import { pressureToHeight } from '../indoor/barometerHeight';
import { estimateFloor, FloorEstimate, calibrateGroundFloor } from '../indoor/floorDetection';

export const PositioningPage: React.FC = () => {
    const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
    const [networkInfo, setNetworkInfo] = useState<NetworkInfoData>(getNetworkInfo());
    const [sensors, setSensors] = useState<SensorSnapshot | null>(null);
    const [floorEstimate, setFloorEstimate] = useState<FloorEstimate | null>(null);
    const [calibrated, setCalibrated] = useState(false);
    const [nativeScan, setNativeScan] = useState<APReading[]>([]);

    const doPermissions = useCallback(async () => {
        const p = await requestAllPermissions();
        setPermissions(p);
        if (p.location === 'granted') {
            await startSensors();
        }
    }, []);

    useEffect(() => {
        const unsub = subscribeSensors((snap) => {
            setSensors(snap);
            if (!calibrated && (snap.pressure !== null || snap.altitudeGPS !== null)) {
                calibrateGroundFloor(snap.pressure || 1013.25);
                setCalibrated(true);
            }
            const est = estimateFloor(snap.pressure, snap.altitudeGPS);
            setFloorEstimate(est);
        });

        const unsubNet = onNetworkChange(setNetworkInfo);
        const iv = setInterval(() => {
            setNativeScan([...getLatestNativeScan()]);
        }, 3000);

        return () => { unsub(); unsubNet(); clearInterval(iv); };
    }, [calibrated]);

    return (
        <div className="h-full bg-[#030303] text-slate-200 font-sans overflow-y-auto pb-24 scrollbar-none antialiased">
            <div className="max-w-xl mx-auto p-6 flex flex-col gap-6">
                {/* Header */}
                <div className="text-center pt-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Positioning Active</span>
                    </div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Hybrid Localization</h1>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sensor Fusion Engine (v4.0)</p>
                </div>

                {/* Permissions Card */}
                <Card title="Core Permissions" icon={<ShieldCheck size={16} />} accent="emerald">
                    {permissions === null ? (
                        <button 
                          onClick={doPermissions}
                          className="w-full py-4 bg-emerald-500 text-black font-black uppercase tracking-tighter rounded-2xl hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_8px_24px_rgba(16,185,129,0.3)]"
                        >
                            Authorize System
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <StatusRow label="Geospatial (GPS)" status={permissions.location} />
                            <StatusRow label="Motion (IMU)" status={permissions.motion} />
                        </div>
                    )}
                </Card>

                {/* Vertical Localization */}
                <Card title="Vertical Tracking" icon={<Layers size={16} />} accent="blue">
                    {floorEstimate ? (
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Estimated Floor</h4>
                                <div className="text-4xl font-black italic uppercase tracking-tighter text-white">
                                    {floorEstimate.floor === 0 ? 'Ground' : `Floor ${floorEstimate.floor}`}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Confidence</div>
                                <div className={`text-xl font-black italic uppercase tracking-tighter ${
                                    floorEstimate.confidence === 'high' ? 'text-emerald-400' : 'text-orange-400'
                                }`}>
                                    {floorEstimate.confidence}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 py-2">System analyzing vertical data signatures...</p>
                    )}
                </Card>

                {/* Live Telemetry */}
                <Card title="Sensor Telemetry" icon={<Activity size={16} />} accent="slate">
                    <div className="grid grid-cols-2 gap-4">
                        <DataBox label="Pressure" value={sensors?.pressure ? `${sensors.pressure.toFixed(2)} hPa` : '—'} color="text-blue-400" />
                        <DataBox label="Alt (Baro)" value={sensors?.pressure ? `${pressureToHeight(sensors.pressure).toFixed(1)}m` : '—'} color="text-purple-400" />
                        <DataBox label="Compass" value={sensors?.compass ? `${Math.round(sensors.compass)}°` : '—'} color="text-emerald-400" />
                        <DataBox label="GPS Alt" value={sensors?.altitudeGPS ? `${sensors.altitudeGPS.toFixed(1)}m` : '—'} color="text-orange-400" />
                    </div>
                    {sensors?.accelX !== null && (
                         <div className="mt-4 pt-4 border-t border-white/5">
                            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">IMU Linear Accel (X,Y,Z)</h4>
                            <div className="flex justify-between font-mono text-xs text-slate-300">
                                <span>{sensors?.accelX?.toFixed(2)}</span>
                                <span>{sensors?.accelY?.toFixed(2)}</span>
                                <span>{sensors?.accelZ?.toFixed(2)}</span>
                                <span className="text-slate-600">m/s²</span>
                            </div>
                         </div>
                    )}
                </Card>

                {/* Connection Status */}
                <Card title="Infrastructure" icon={<Wifi size={16} />} accent="blue">
                    <div className="flex flex-col gap-3">
                        <StatusRow label="Native Bridge" status={nativeScan.length > 0 ? 'Injecting' : 'No Data'} isError={nativeScan.length === 0} />
                        <StatusRow label="Network Node" status={networkInfo.effectiveType?.toUpperCase() || 'OFFLINE'} />
                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl mt-2 text-center">
                            <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">
                                {networkInfo.connectionType === 'wifi' ? 'Stationary Mesh Optimised' : 'Dynamic Cellular Handover'}
                            </p>
                        </div>
                    </div>
                </Card>

                <div className="p-4 rounded-3xl bg-orange-500/5 border border-orange-500/10">
                    <div className="flex gap-4">
                        <AlertTriangle className="text-orange-500 shrink-0" size={20} />
                        <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
                            <span className="text-orange-400 font-bold">Research Note:</span> Browser security restricts direct WiFi scanning. Use the MNNIT Native Wrapper for raw RSSI fingerprint injection.
                        </p>
                    </div>
                </div>

                <div className="text-center opacity-10 py-10">
                    <p className="text-[10px] font-black italic uppercase tracking-[0.5em] text-white">GAMEMNNIT INFRASTRUCTURE TAB</p>
                </div>
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

const StatusRow = ({ label, status, isError }: any) => (
    <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{label}</span>
        <div className="flex items-center gap-2">
            <span className={`text-xs font-black italic uppercase tracking-tighter ${
                status === 'granted' || status === 'Ready' || status === 'Injecting' ? 'text-emerald-400' : isError ? 'text-slate-600' : 'text-blue-400'
            }`}>
                {status}
            </span>
            <div className={`w-1 h-1 rounded-full ${
                 status === 'granted' || status === 'Injecting' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'
            }`} />
        </div>
    </div>
);

const DataBox = ({ label, value, color }: any) => (
    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{label}</span>
        <span className={`text-sm font-black italic uppercase tracking-tighter ${color}`}>{value}</span>
    </div>
);
