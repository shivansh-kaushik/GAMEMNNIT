import React, { useEffect, useState, useMemo } from 'react';
import { getWiFiSignals, WiFiSignal, isMobileEnvironment, predictFloor } from '../sensors/wifi';

export const WifiTab: React.FC = () => {
    const [signals, setSignals] = useState<WiFiSignal[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    const [scanning, setScanning] = useState(true);

    const predictedFloor = useMemo(() => predictFloor(signals), [signals]);

    useEffect(() => {
        setIsMobile(isMobileEnvironment());
        const scan = async () => {
            setScanning(true);
            const data = await getWiFiSignals();
            setSignals(data);
            setScanning(false);
        };
        scan();
        const interval = setInterval(scan, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: 'white', fontFamily: 'monospace' }}>
            <div style={{ background: '#111', padding: '40px', borderRadius: '15px', border: '1px solid #00ff88', width: '500px', boxShadow: '0 0 50px rgba(0,255,136,0.1)' }}>
                <h1 style={{ color: '#00ff88', fontSize: '20px', textAlign: 'center', margin: '0 0 5px 0' }}>📶 WIFI RSSI SCANNER</h1>
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#666', marginBottom: '20px' }}>
                    {isMobile ? '📱 MOBILE ENVIRONMENT DETECTED' : '💻 BROWSER EMULATION MODE'}
                </div>

                <div style={{ background: 'rgba(0,255,136,0.1)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(0,255,136,0.5)', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '10px', color: '#00ff88', opacity: 0.7 }}>PREDICTED LOCATION</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>FLOOR {predictedFloor}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: '#666' }}>CONFIDENCE</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00ff88' }}>
                            {signals.length > 0 ? (signals[0].rssi > -60 ? 'HIGH' : 'MEDIUM') : '...'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                    {scanning && signals.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#00ff88', padding: '20px' }}>INITIALIZING SCAN...</div>
                    ) : (
                        signals.sort((a, b) => b.rssi - a.rssi).map((s, idx) => (
                            <WifiRow key={idx} signal={s} />
                        ))
                    )}
                </div>

                <div style={{ marginTop: '25px', textAlign: 'center' }}>
                    <div style={{ width: '100%', height: '2px', background: '#222', borderRadius: '1px', overflow: 'hidden' }}>
                        <div style={{
                            width: scanning ? '100%' : '0%',
                            height: '100%',
                            background: '#00ff88',
                            transition: scanning ? 'width 5s linear' : 'none',
                            boxShadow: '0 0 10px #00ff88'
                        }} />
                    </div>
                    <div style={{ fontSize: '9px', color: '#444', marginTop: '8px' }}>AUTO-REFRESH EVERY 5 SECONDS</div>
                </div>
            </div>
        </div>
    );
};

const WifiRow = ({ signal }: { signal: WiFiSignal }) => {
    const strengthColor = signal.rssi > -60 ? '#00ff88' : signal.rssi > -80 ? '#ffcc00' : '#ff4444';
    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{signal.ssid}</span>
                    <span style={{ fontSize: '9px', background: '#333', padding: '1px 4px', borderRadius: '3px', color: '#aaa' }}>F{signal.floor}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '10px' }}>
                        {[1, 2, 3, 4].map(bar => (
                            <div key={bar} style={{
                                width: '4px',
                                height: `${bar * 25}%`,
                                background: bar <= (signal.rssi > -50 ? 4 : signal.rssi > -70 ? 3 : signal.rssi > -85 ? 2 : 1) ? strengthColor : '#333',
                                borderRadius: '1px'
                            }} />
                        ))}
                    </div>
                    <span style={{ fontSize: '10px', color: '#666' }}>{signal.strength}</span>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ color: strengthColor, fontWeight: 'bold' }}>{signal.rssi} dBm</div>
                <div style={{ fontSize: '8px', color: '#444' }}>{signal.floor === 0 ? 'Ground' : signal.floor === 1 ? '1st Floor' : '2nd Floor'}</div>
            </div>
        </div>
    );
};
