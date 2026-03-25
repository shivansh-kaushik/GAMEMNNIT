import React, { useEffect, useState, useCallback, useRef } from 'react';
import { requestAllPermissions, PermissionStatus } from '../wifi/wifiPermissions';
import { getNetworkInfo, onNetworkChange, NetworkInfoData } from '../wifi/networkInfo';
import { RSSI_FORMULA, isBrowserWifiScanAvailable, estimateDistance } from '../wifi/rssiTheory';
import { startSensors, subscribeSensors, SensorSnapshot } from '../indoor/sensorManager';
import { pressureToHeight } from '../indoor/barometerHeight';
import { FLOOR_FINGERPRINTS, getLatestNativeScan, hasNativeScan, APReading } from '../indoor/wifiFingerprint';
import { estimateFloor, FloorEstimate, calibrateGroundFloor } from '../indoor/floorDetection';

const GRN = '#00ff88';
const BLU = '#38bdf8';
const YLW = '#fbbf24';
const RED = '#ef4444';
const PRP = '#a78bfa';
const CARD_BG = '#0e0e0e';

export const WifiTab: React.FC = () => {
    const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
    const [networkInfo, setNetworkInfo] = useState<NetworkInfoData>(getNetworkInfo());
    const [sensors, setSensors] = useState<SensorSnapshot | null>(null);
    const [floorEstimate, setFloorEstimate] = useState<FloorEstimate | null>(null);
    const [calibrated, setCalibrated] = useState(false);
    const [nativeScan, setNativeScan] = useState<APReading[]>([]);
    const prevPressureRef = useRef<number | null>(null);

    // ── Permissions ───────────────────────────────────────────────────────
    const doPermissions = useCallback(async () => {
        const p = await requestAllPermissions();
        setPermissions(p);
        if (p.location === 'granted') {
            await startSensors();
        }
    }, []);

    // ── Sensor subscription ───────────────────────────────────────────────
    useEffect(() => {
        const unsub = subscribeSensors((snap) => {
            setSensors(snap);

            // Auto-calibrate once we have GPS altitude and no baro
            if (!calibrated && snap.altitudeGPS !== null && snap.pressure === null) {
                calibrateGroundFloor(1013.25); // sea-level reference
                setCalibrated(true);
            }
            if (!calibrated && snap.pressure !== null) {
                calibrateGroundFloor(snap.pressure);
                setCalibrated(true);
            }

            const est = estimateFloor(snap.pressure, snap.altitudeGPS);
            setFloorEstimate(est);
        });

        const unsubNet = onNetworkChange(setNetworkInfo);

        // Poll native scan every 3s
        const iv = setInterval(() => {
            setNativeScan([...getLatestNativeScan()]);
        }, 3000);

        return () => { unsub(); unsubNet(); clearInterval(iv); };
    }, [calibrated]);

    const confidenceColor = (c?: string) =>
        c === 'high' ? GRN : c === 'medium' ? YLW : RED;

    return (
        <div style={{
            width: '100vw', height: '100vh', overflowY: 'auto',
            background: '#050505', color: '#fff',
            fontFamily: 'Inter, system-ui, monospace',
            padding: '20px 16px 80px', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
        }}>
            {/* Header */}
            <h1 style={{ color: GRN, fontSize: '20px', margin: 0, textAlign: 'center' }}>
                📶 Hybrid Indoor Positioning
            </h1>
            <p style={{ color: '#555', fontSize: '11px', margin: 0 }}>
                GPS · Barometer · WiFi Fingerprinting · Sensor Fusion
            </p>

            {/* Permissions */}
            <Card title="🔐 Permissions" accent={GRN}>
                {permissions === null ? (
                    <button onClick={doPermissions} style={btn(GRN)}>
                        Request All Permissions
                    </button>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <PermRow label="Location (GPS)" status={permissions.location} />
                        <PermRow label="Motion & Orientation" status={permissions.motion} />
                    </div>
                )}
            </Card>

            {/* Live Floor Estimate */}
            <Card title="🏢 Detected Floor" accent={PRP}>
                {floorEstimate ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff' }}>
                                {floorEstimate.floor === 0 ? 'Ground' : `Floor ${floorEstimate.floor}`}
                            </div>
                            <Tag label={`Method: ${floorEstimate.method}`} color={BLU} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#555' }}>Confidence</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: confidenceColor(floorEstimate.confidence) }}>
                                {floorEstimate.confidence.toUpperCase()}
                            </div>
                        </div>
                    </div>
                ) : (
                    <Notice color={YLW}>Grant permissions to start floor detection.</Notice>
                )}
            </Card>

            {/* Live Sensor Readings */}
            <Card title="📡 Live Sensor Data" accent={BLU}>
                {sensors ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <SensorRow label="GPS" value={sensors.lat !== null ? `${sensors.lat?.toFixed(5)}°N, ${sensors.lon?.toFixed(5)}°E` : 'Waiting…'} color={GRN} />
                        <SensorRow label="GPS Altitude" value={sensors.altitudeGPS !== null ? `${sensors.altitudeGPS.toFixed(1)} m` : 'N/A'} />
                        <SensorRow label="Pressure (Baro)" value={sensors.pressure !== null ? `${sensors.pressure.toFixed(2)} hPa` : 'Not available'} color={sensors.pressure ? BLU : '#444'} />
                        {sensors.pressure !== null && (
                            <SensorRow label="Barometric Height" value={`${pressureToHeight(sensors.pressure).toFixed(1)} m`} color={PRP} />
                        )}
                        <SensorRow label="Accelerometer X/Y/Z"
                            value={sensors.accelX !== null ? `${sensors.accelX?.toFixed(2)}, ${sensors.accelY?.toFixed(2)}, ${sensors.accelZ?.toFixed(2)} m/s²` : 'Waiting…'} />
                        <SensorRow label="Gyroscope α/β/γ"
                            value={sensors.gyroAlpha !== null ? `${sensors.gyroAlpha?.toFixed(1)}, ${sensors.gyroBeta?.toFixed(1)}, ${sensors.gyroGamma?.toFixed(1)} °/s` : 'Waiting…'} />
                        <SensorRow label="Compass" value={sensors.compass !== null ? `${Math.round(sensors.compass)}°` : 'Waiting…'} color={YLW} />
                        <div style={{ fontSize: '10px', color: '#2a2a2a', marginTop: '4px', borderTop: '1px solid #111', paddingTop: '4px' }}>
                            Barometer: {sensors.barometerAvailable ? <span style={{ color: GRN }}>✔ Available</span> : <span style={{ color: '#555' }}>✖ Not in this browser</span>}
                        </div>
                    </div>
                ) : (
                    <Notice color={YLW}>Grant permissions first to read sensors.</Notice>
                )}
            </Card>

            {/* Network Info */}
            <Card title="🌐 Network Information" accent={BLU}>
                {networkInfo.available ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <tbody>
                            <InfoRow label="Type" value={networkInfo.connectionType} />
                            <InfoRow label="Effective Type" value={networkInfo.effectiveType} color={GRN} />
                            <InfoRow label="Downlink" value={networkInfo.downlink !== null ? `${networkInfo.downlink} Mbps` : '—'} />
                            <InfoRow label="RTT" value={networkInfo.rtt !== null ? `${networkInfo.rtt} ms` : '—'} />
                        </tbody>
                    </table>
                ) : (
                    <Notice color={YLW}>Network Information API not available in this browser.</Notice>
                )}
            </Card>

            {/* WiFi Scanning Status */}
            <Card title="📡 WiFi RSSI Scanning" accent={RED}>
                <Notice color={RED}>
                    Browser security restrictions prevent websites from scanning nearby WiFi networks.
                    Real WiFi RSSI scanning requires a <strong>native Android app</strong> with CHANGE_WIFI_STATE and ACCESS_FINE_LOCATION permissions.
                </Notice>

                {/* Native mobile injection bridge */}
                {nativeScan.length > 0 ? (
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: GRN, marginBottom: '6px' }}>✔ Native scan received</div>
                        {nativeScan.map((ap, i) => (
                            <APRow key={i} ap={ap} />
                        ))}
                    </div>
                ) : (
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#555' }}>
                        Native app data can be injected via:
                        <code style={{ display: 'block', background: '#111', padding: '6px 8px', borderRadius: '4px', margin: '4px 0', color: BLU, fontSize: '11px' }}>
                            {`window.__injectRSSI([{ssid:"AP1",rssi:-45}])`}
                        </code>
                    </div>
                )}
            </Card>

            {/* WiFi Fingerprinting */}
            <Card title="🗺 Floor Fingerprints (Academic Building)" accent={GRN}>
                <p style={{ fontSize: '11px', color: '#777', margin: '0 0 10px' }}>
                    Each floor has a unique RSSI signature. The system compares live scans using Euclidean distance to estimate floor.
                </p>
                {FLOOR_FINGERPRINTS.map(fp => (
                    <div key={fp.floor} style={{ marginBottom: '12px', background: '#111', borderRadius: '8px', padding: '10px', border: '1px solid #1a1a1a' }}>
                        <div style={{ color: GRN, fontWeight: 'bold', fontSize: '12px', marginBottom: '6px' }}>{fp.label}</div>
                        {fp.readings.map(r => (
                            <div key={r.ssid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '2px 0' }}>
                                <span style={{ color: '#888' }}>{r.ssid}</span>
                                <span style={{ color: r.rssi > -55 ? GRN : r.rssi > -70 ? YLW : RED }}>{r.rssi} dBm</span>
                            </div>
                        ))}
                    </div>
                ))}
            </Card>

            {/* RSSI Theory */}
            <Card title="📐 RSSI Distance Formula" accent={BLU}>
                <FormulaBox formula={RSSI_FORMULA.rssiEq} label="Signal model" />
                <FormulaBox formula={RSSI_FORMULA.distEq} label="Distance estimate" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                    {RSSI_FORMULA.variables.map(v => (
                        <div key={v.sym} style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
                            <span style={{ color: BLU, minWidth: '36px', fontWeight: 'bold' }}>{v.sym}</span>
                            <span style={{ color: '#888' }}>{v.desc}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Future note */}
            <Card title="🚀 Roadmap" accent={YLW}>
                <Notice color={YLW}>
                    Real-time WiFi RSSI scanning will be enabled in the <strong>mobile app</strong> using native Android WifiManager. Barometer floor detection works on <strong>Android Chrome</strong> with Generic Sensor API.
                </Notice>
            </Card>
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────
const Card: React.FC<{ title: string; accent: string; children: React.ReactNode }> = ({ title, accent, children }) => (
    <div style={{ width: '100%', maxWidth: '560px', background: CARD_BG, borderRadius: '14px', border: `1px solid ${accent}33`, padding: '18px', boxShadow: `0 0 18px ${accent}0d` }}>
        <div style={{ color: accent, fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '12px' }}>{title}</div>
        {children}
    </div>
);

const PermRow: React.FC<{ label: string; status: string }> = ({ label, status }) => {
    const color = status === 'granted' ? GRN : status === 'denied' ? RED : YLW;
    const icon = status === 'granted' ? '✔' : status === 'denied' ? '✖' : '?';
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid #111' }}>
            <span style={{ color: '#bbb' }}>{label}</span>
            <span style={{ color }}>{icon} {status}</span>
        </div>
    );
};

const SensorRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = '#888' }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', borderBottom: '1px solid #0a0a0a' }}>
        <span style={{ color: '#666' }}>{label}</span>
        <span style={{ color }}>{value}</span>
    </div>
);

const InfoRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = '#fff' }) => (
    <tr>
        <td style={{ padding: '4px 0', color: '#666', fontSize: '12px' }}>{label}</td>
        <td style={{ padding: '4px 0', color, textAlign: 'right', fontWeight: 'bold' }}>{value}</td>
    </tr>
);

const Notice: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
    <div style={{ background: `${color}10`, border: `1px solid ${color}33`, borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#ccc', lineHeight: 1.6 }}>
        {children}
    </div>
);

const FormulaBox: React.FC<{ formula: string; label: string }> = ({ formula, label }) => (
    <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>{label}</div>
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '8px 10px', fontFamily: 'monospace', fontSize: '12px', color: BLU }}>{formula}</div>
    </div>
);

const APRow: React.FC<{ ap: APReading }> = ({ ap }) => {
    const color = ap.rssi > -55 ? GRN : ap.rssi > -70 ? YLW : RED;
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #111' }}>
            <span style={{ color: '#999' }}>{ap.ssid}</span>
            <span style={{ color }}>📶 {ap.rssi} dBm</span>
        </div>
    );
};

const Tag: React.FC<{ label: string; color: string }> = ({ label, color }) => (
    <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: '4px', fontSize: '10px', padding: '1px 6px' }}>{label}</span>
);

const btn = (color: string): React.CSSProperties => ({
    width: '100%', padding: '10px', background: color, color: '#000',
    border: 'none', borderRadius: '25px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer'
});
