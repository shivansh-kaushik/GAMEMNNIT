import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CAMPUS_BUILDINGS } from '../navigation/buildings';
import { readSensors, ARSensors } from '../ar/arEngine';
import { buildARPath, remainingDistance, ARNavWaypoint } from '../ar/arNavigation';
import { AIAssistantPanel } from '../ai/AIAssistantPanel'; // AI layer — does not touch AR logic

/**
 * ARPage — Augmented Reality Navigation Mode
 * Opens the device camera and overlays navigation arrows using Canvas 2D API.
 * This is a completely self-contained module – it does not modify any other page.
 */
export const ARPage: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number | null>(null);

    const [cameraError, setCameraError] = useState<string | null>(null);
    const [sensors, setSensors] = useState<ARSensors | null>(null);
    const [destId, setDestId] = useState<string | null>(null);
    const [waypoints, setWaypoints] = useState<ARNavWaypoint[]>([]);
    const [distanceLeft, setDistanceLeft] = useState<number | null>(null);
    const [arActive, setArActive] = useState(false);

    // ---------- Camera ----------
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setArActive(true);
            setCameraError(null);
        } catch (e: any) {
            setCameraError('Camera access denied. Please allow camera permission and try again.');
        }
    }, []);

    const stopCamera = useCallback(() => {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        stream?.getTracks().forEach(t => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        if (animRef.current) cancelAnimationFrame(animRef.current);
        setArActive(false);
    }, []);

    // ---------- Sensor polling ----------
    useEffect(() => {
        if (!arActive) return;
        const interval = setInterval(async () => {
            const s = await readSensors();
            setSensors(s);
        }, 1000);
        return () => clearInterval(interval);
    }, [arActive]);

    // ---------- Build waypoints when destination changes ----------
    useEffect(() => {
        if (!destId || !sensors) return;
        const wp = buildARPath(sensors.gpsLat, sensors.gpsLon, destId, 5);
        setWaypoints(wp);
        setDistanceLeft(remainingDistance(sensors.gpsLat, sensors.gpsLon, destId));
    }, [destId, sensors?.gpsLat, sensors?.gpsLon]);

    // ---------- Canvas AR overlay ----------
    useEffect(() => {
        if (!arActive || !canvasRef.current || !videoRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;

        const draw = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const cx = canvas.width / 2;
            const cy = canvas.height * 0.65;

            if (waypoints.length > 0) {
                // Draw navigation arrows along the path
                const bearing = sensors?.compassBearing ?? 0;
                const arrowCount = Math.min(waypoints.length, 6);

                for (let i = 0; i < arrowCount; i++) {
                    const wp = waypoints[i];
                    const scale = 1 - i * 0.12;
                    const yOffset = -i * 70 * scale;

                    // Arrow body
                    const arrowSize = 40 * scale;
                    ctx.save();
                    ctx.translate(cx, cy + yOffset);
                    ctx.globalAlpha = Math.max(0.3, 1 - i * 0.15);

                    // Glow effect
                    ctx.shadowColor = '#00ff88';
                    ctx.shadowBlur = 15;

                    // Arrow shape
                    ctx.fillStyle = i === 0 ? '#00ff88' : '#00cc66';
                    ctx.beginPath();
                    ctx.moveTo(0, -arrowSize);
                    ctx.lineTo(arrowSize * 0.6, arrowSize * 0.4);
                    ctx.lineTo(arrowSize * 0.25, arrowSize * 0.4);
                    ctx.lineTo(arrowSize * 0.25, arrowSize);
                    ctx.lineTo(-arrowSize * 0.25, arrowSize);
                    ctx.lineTo(-arrowSize * 0.25, arrowSize * 0.4);
                    ctx.lineTo(-arrowSize * 0.6, arrowSize * 0.4);
                    ctx.closePath();
                    ctx.fill();

                    ctx.restore();
                }
            }

            // Destination label
            if (destId && distanceLeft !== null) {
                const dest = CAMPUS_BUILDINGS.find(b => b.id === destId);
                if (dest) {
                    ctx.save();
                    // Badge background
                    const text = dest.name;
                    ctx.font = 'bold 18px Inter, sans-serif';
                    const tw = ctx.measureText(text).width;
                    const bw = tw + 30, bh = 56, bx = cx - bw / 2, by = 30;

                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    roundRect(ctx, bx, by, bw, bh, 8);
                    ctx.fill();

                    ctx.strokeStyle = '#00ff88';
                    ctx.lineWidth = 1.5;
                    roundRect(ctx, bx, by, bw, bh, 8);
                    ctx.stroke();

                    ctx.fillStyle = '#00ff88';
                    ctx.textAlign = 'center';
                    ctx.fillText(text, cx, by + 24);

                    ctx.fillStyle = '#aaa';
                    ctx.font = '13px Inter, sans-serif';
                    ctx.fillText(`${Math.round(distanceLeft)} m away`, cx, by + 44);
                    ctx.restore();
                }
            }

            // Compass bearing indicator
            if (sensors) {
                ctx.save();
                ctx.font = '12px monospace';
                ctx.fillStyle = '#aaa';
                ctx.textAlign = 'left';
                ctx.fillText(`🧭 ${Math.round(sensors.compassBearing)}°  📍 ${sensors.gpsLat.toFixed(5)}, ${sensors.gpsLon.toFixed(5)}`, 16, canvas.height - 16);
                ctx.restore();
            }

            animRef.current = requestAnimationFrame(draw);
        };

        animRef.current = requestAnimationFrame(draw);
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [arActive, waypoints, sensors, destId, distanceLeft]);

    // ---------- UI ----------
    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
            {/* Camera feed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: arActive ? 1 : 0 }}
            />

            {/* AR Canvas overlay */}
            <canvas
                ref={canvasRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            />

            {/* Top Controls */}
            <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '12px', alignItems: 'center' }}>
                {!arActive ? (
                    <button onClick={startCamera} style={btnStyle('#00ff88', '#000')}>
                        📷 Start AR Navigation
                    </button>
                ) : (
                    <button onClick={stopCamera} style={btnStyle('#ef4444', '#fff')}>
                        ⏹ Stop AR
                    </button>
                )}
            </div>

            {/* Destination Picker */}
            {arActive && (
                <div style={{ position: 'absolute', top: '75px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.75)', padding: '12px 16px', borderRadius: '10px', border: '1px solid #333', minWidth: '260px' }}>
                    <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>Navigate to</div>
                    <select
                        value={destId || ''}
                        onChange={e => setDestId(e.target.value || null)}
                        style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '6px', padding: '8px', fontSize: '13px', cursor: 'pointer' }}
                    >
                        <option value=''>— Select Destination —</option>
                        {CAMPUS_BUILDINGS.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.name}{b.isIndoor ? ` (Floor ${b.floor ?? 0})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Camera error */}
            {cameraError && (
                <div style={{ position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(239,68,68,0.9)', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontSize: '13px', maxWidth: '90%', textAlign: 'center' }}>
                    ⚠ {cameraError}
                </div>
            )}

            {/* Idle placeholder */}
            {!arActive && !cameraError && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '64px' }}>📷</div>
                    <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>AR Navigation Mode</div>
                    <div style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', maxWidth: '300px' }}>
                        Press "Start AR Navigation" to open your camera and overlay turn-by-turn AR directions.
                    </div>
                    <div style={{ color: '#555', fontSize: '11px', marginTop: '8px' }}>
                        Uses GPS · Compass · Gyroscope · A* Pathfinding · 🤖 AI Voice Assistant
                    </div>
                </div>
            )}

            {/* ─── AI ASSISTANT PANEL (purely additive overlay) ─────────────────────
                Wired to setDestId so the AI can update the navigation destination.
                sensors + waypoints passed so voice guidance loop can read live state.
                All existing AR logic above remains completely unchanged.            */}
            <AIAssistantPanel
                onNavigate={(id) => setDestId(id)}
                arActive={arActive}
                sensors={sensors}
                waypoints={waypoints}
            />
        </div>
    );
};

const btnStyle = (bg: string, color: string): React.CSSProperties => ({
    padding: '10px 22px', background: bg, color, border: 'none', borderRadius: '25px',
    fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: `0 0 12px ${bg}66`
});

/** Helper to draw rounded rectangles on canvas */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
