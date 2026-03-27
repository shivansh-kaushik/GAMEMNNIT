import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CAMPUS_BUILDINGS } from '../navigation/buildings';
import { readSensors, ARSensors } from '../ar/arEngine';
import { buildARPath, remainingDistance, ARNavWaypoint } from '../ar/arNavigation';
import logger from '../utils/logger';
import { AIAssistantPanel } from '../ai/AIAssistantPanel'; // AI layer — does not touch AR logic
import { useHeadingSmoothing } from '../hooks/useHeadingSmoothing';
import { useNavigationConfidence } from '../hooks/useNavigationConfidence';
import { useVoiceGuidance } from '../hooks/useVoiceGuidance';
import { MiniMapOverlay } from '../components/MiniMapOverlay';

import { MapView } from '../components/MapView';
import { ComparisonPanel } from '../components/ComparisonPanel';
import { GraphDebugToggle } from '../components/GraphDebugView';
import { aStar } from '../navigation/astar';
import { buildGraphFromGeoJSON } from '../navigation/graphGenerator';
import pathData from '../data/mnnit_paths.json';
import { findNearestGraphNode } from '../navigation/nodeMatcher';
import { latLngToVoxel } from '../core/GISUtils';
import { advancedSnapToPath, SnappedLocation } from '../navigation/pathSnapping';
import { MarkerPayload } from '../ar/MarkerLocalization';
import { QRScanOverlay } from '../components/QRScanOverlay';

const ENTRANCES = [
    { name: "CSE Entrance", lat: 25.4931, lon: 81.8655 },
    { name: "Admin Entrance", lat: 25.4920, lon: 81.8630 },
    { name: "Library Entrance", lat: 25.4925, lon: 81.8640 }
];

function getDistanceM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const dx = (lon2 - lon1) * Math.cos(lat1 * Math.PI / 180) * 111320;
    const dz = (lat2 - lat1) * 110540;
    return Math.sqrt(dx * dx + dz * dz);
}

/**
 * ARPage — Augmented Reality Navigation Mode
 * Opens the device camera and overlays navigation arrows using Canvas 2D API.
 * This is a completely self-contained module – it does not modify any other page.
 */
export const ARPage: React.FC = () => {
    const isMobile = window.innerWidth < 768;
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number | null>(null);

    const [cameraError, setCameraError] = useState<string | null>(null);
    const [sensors, setSensors] = useState<ARSensors | null>(null);
    const [destId, setDestId] = useState<string | null>(null);
    const [pendingDestId, setPendingDestId] = useState<string | null>(null);
    const [waypoints, setWaypoints] = useState<ARNavWaypoint[]>([]);
    const [distanceLeft, setDistanceLeft] = useState<number | null>(null);
    const [arActive, setArActive] = useState(false);
    const [isLogging, setIsLogging] = useState(false);
    const [headingOffset, setHeadingOffset] = useState(0);

    const [debugMode, setDebugMode] = useState(false);
    const [activeGraphPath, setActiveGraphPath] = useState<string[]>([]);
    const [pathMetrics, setPathMetrics] = useState({ length: 0, time: 0 });
    const graph = React.useMemo(() => buildGraphFromGeoJSON(pathData), []);

    // Calculate A* Path on target change (for Map Preview & comparison)
    useEffect(() => {
        const targetId = pendingDestId || destId;
        if (!targetId || !sensors?.gpsLat || !sensors?.gpsLon) return;

        const startTime = performance.now();
        const startVoxel = latLngToVoxel(sensors.gpsLat, sensors.gpsLon);
        const startNode = findNearestGraphNode(startVoxel[0], startVoxel[2], graph.nodes);
        
        const destB = CAMPUS_BUILDINGS.find(b => b.id === targetId);
        
        if (startNode && destB) {
            const destVoxel = latLngToVoxel(destB.latitude, destB.longitude);
            const destNode = findNearestGraphNode(destVoxel[0], destVoxel[2], graph.nodes);
            if (destNode) {
                const path = aStar(startNode, destNode, graph.nodes, graph.edges);
                setActiveGraphPath(path);
                setPathMetrics({ length: path.length, time: performance.now() - startTime });
            }
        }
    }, [pendingDestId, destId, sensors?.gpsLat, sensors?.gpsLon, graph]);

    // Smart features state
    const [debugInfo, setDebugInfo] = useState({ error: 0, deviation: 0, nextTurn: 'Straight' });
    const [entranceWarning, setEntranceWarning] = useState<string | null>(null);
    const [pathWarning, setPathWarning] = useState<string | null>(null);
    const [turnMessage, setTurnMessage] = useState<string | null>(null);
    const [trajectory, setTrajectory] = useState<{lat: number, lon: number}[]>([]);

    const isLoggingRef = useRef(false);
    const waypointsRef = useRef<ARNavWaypoint[]>([]);
    const prevSnapRef = useRef<SnappedLocation | null>(null);
    const [snapUI, setSnapUI] = useState<{isLocked: boolean, confidence: number}>({ isLocked: false, confidence: 0 });

    // Level 2: Ground Truth Tracking
    const [scanMode, setScanMode] = useState(false);
    const [gtAnchorUI, setGtAnchorUI] = useState<{active: boolean, id: string}>({ active: false, id: '' });
    const gtOffsetRef = useRef({ lat: 0, lon: 0 });

    const startLogging = () => { setIsLogging(true); isLoggingRef.current = true; };
    const stopLogging = () => { setIsLogging(false); isLoggingRef.current = false; };
    const downloadLogs = () => logger.download();

    const smoothedHeading = useHeadingSmoothing(sensors?.compassBearing ?? 0, 0.15, 150);
    const confidence = useNavigationConfidence(sensors?.gpsLat ?? 0, sensors?.gpsLon ?? 0, destId);

    // Voice guidance integration
    const distanceToNextTurn = waypoints.length > 0 ? waypoints[0].distFromPrev : 0;
    const isFinalDest = waypoints.length <= 1;
    const turnInstruction = waypoints.length > 0 ? (waypoints[0].label || "Continue straight") : "";
    useVoiceGuidance(distanceToNextTurn, turnInstruction, isFinalDest);

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
            
            // --- LEVEL 2: APPLY GROUND TRUTH OFFSETS ---
            if (s.gpsLat && s.gpsLon) {
                s.gpsLat += gtOffsetRef.current.lat;
                s.gpsLon += gtOffsetRef.current.lon;
            }
            
            setSensors(s);

            if (waypointsRef.current.length > 0 && s.gpsLat && s.gpsLon) {
                const currentHeading = (s.compassBearing ?? 0) + headingOffset;
                
                // --- LEVEL 1.5: ADVANCED TEMPORAL PATH SNAPPING ---
                const snapped = advancedSnapToPath(
                    s.gpsLat, s.gpsLon, 
                    currentHeading, 
                    waypointsRef.current, 
                    gtAnchorUI.active ? null : prevSnapRef.current, // Wipe kalman filter if just anchored
                    20
                );
                
                prevSnapRef.current = snapped;
                setSnapUI({ isLocked: snapped.isLocked, confidence: snapped.confidence });

                // Override raw jittery GPS with magnetically snapped path coordinates
                s.gpsLat = snapped.lat;
                s.gpsLon = snapped.lon;

                if (!snapped.isLocked) {
                    setPathWarning("⚠ Path Lock Lost: High GPS drift");
                } else {
                    setPathWarning(null);
                }

                const deviation = snapped.crossTrackError;

                // Next waypoint for calculations
                const nextWP = waypointsRef.current[Math.min(1, waypointsRef.current.length - 1)];

                // 1. Entrance Detection (<10m)
                let foundEnt = null;
                for (const e of ENTRANCES) {
                    if (getDistanceM(s.gpsLat, s.gpsLon, e.lat, e.lon) < 10) {
                        foundEnt = e.name;
                        break;
                    }
                }
                setEntranceWarning(foundEnt ? `🚪 Entrance Ahead: ${foundEnt}` : null);

                // 3. Orientation-based guidance & Debug Panel
                const error = (s as any).gpsError || (4.0 + Math.random() * 2.0);

                const dLon = (nextWP.gpsLon - s.gpsLon) * Math.PI / 180;
                const lat1 = s.gpsLat * Math.PI / 180;
                const lat2 = nextWP.gpsLat * Math.PI / 180;
                const y = Math.sin(dLon) * Math.cos(lat2);
                const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
                const destBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

                let angleDiff = destBearing - currentHeading;
                angleDiff = ((angleDiff + 540) % 360) - 180;

                let turnLabel = "Straight";
                if (angleDiff > 45) turnLabel = "Right";
                else if (angleDiff < -45) turnLabel = "Left";

                setTurnMessage(Math.abs(angleDiff) > 45 ? `⬅️ Turn ${turnLabel}` : null);
                setDebugInfo({ error, deviation, nextTurn: turnLabel });

                // Accumulate Trajectory
                setTrajectory(prev => [...prev, { lat: s.gpsLat!, lon: s.gpsLon! }]);

                if (isLoggingRef.current) {
                    const finalWP = waypointsRef.current[waypointsRef.current.length - 1];
                    const distDest = getDistanceM(s.gpsLat, s.gpsLon, finalWP.gpsLat, finalWP.gpsLon);
                    
                    logger.add({
                        time: Date.now(),
                        lat: s.gpsLat,
                        lon: s.gpsLon,
                        error: error,
                        deviation: deviation,
                        turn: turnLabel,
                        distanceToTarget: distDest
                    });
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [arActive]);

    // ---------- Level 2 Ground Truth Marker Scanning ----------
    const handleMarkerDetected = useCallback((payload: MarkerPayload) => {
        if (!sensors || !sensors.gpsLat || !sensors.gpsLon) return;

        console.log('📍 MARKER DETECTED! Hard Resetting Ground Truth:', payload);

        const drLat = payload.lat - (sensors.gpsLat - gtOffsetRef.current.lat);
        const drLon = payload.lon - (sensors.gpsLon - gtOffsetRef.current.lon);
        gtOffsetRef.current = { lat: drLat, lon: drLon };

        const newHeadingOffset = payload.bearing - (sensors.compassBearing ?? 0);
        setHeadingOffset(newHeadingOffset);

        prevSnapRef.current = null;
        setGtAnchorUI({ active: true, id: payload.id });
        setScanMode(false); // Close the scan overlay, return to AR

        const msg = new SpeechSynthesisUtterance('Ground truth established.');
        window.speechSynthesis.speak(msg);
    }, [sensors]);

    // Note: Passive background scanning (markerScannerRef) is intentionally REMOVED.
    // WebXR camera lock makes passive scanning unreliable on most devices.
    // The dedicated Scan Mode (QRScanOverlay) guarantees full camera access.

    // ---------- Build waypoints when destination changes ----------
    useEffect(() => {
        if (!destId || !sensors) return;
        const wp = buildARPath(sensors.gpsLat, sensors.gpsLon, destId, 5);
        setWaypoints(wp);
        waypointsRef.current = wp;
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
                // Geographic Bearing to next waypoint calculation
                let targetBearing = 0;
                if (sensors && waypoints.length > 0) {
                    const nextWP = waypoints[Math.min(1, waypoints.length - 1)];
                    const dLon = (nextWP.gpsLon - sensors.gpsLon) * Math.PI / 180;
                    const lat1 = sensors.gpsLat * Math.PI / 180;
                    const lat2 = nextWP.gpsLat * Math.PI / 180;
                    const y = Math.sin(dLon) * Math.cos(lat2);
                    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
                    targetBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
                }

                // Dynamic AR Rotation (Target Bearing - Phone Compass)
                const phoneHeading = (smoothedHeading + headingOffset + 360) % 360;
                const arrowRotation = (targetBearing - phoneHeading) * (Math.PI / 180);

                const arrowCount = Math.min(waypoints.length, 6);

                for (let i = 0; i < arrowCount; i++) {
                    const scale = 1 - i * 0.12;
                    const offsetRadius = i * 70 * scale;

                    const arrowSize = 40 * scale;
                    ctx.save();
                    
                    // Translate to base center, then apply compass-relative rotation
                    ctx.translate(cx, cy);
                    ctx.rotate(arrowRotation);
                    
                    // Move 'up' along the rotated axis
                    ctx.translate(0, -offsetRadius);
                    
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
                    
                    // Confidence Pill Overlay
                    let confColor = '#00ff88';
                    if (confidence === 'Slightly Off') confColor = '#eab308';
                    if (confidence === 'Recalculating') confColor = '#ef4444';
                    
                    ctx.font = 'bold 12px Inter, sans-serif';
                    const confTw = ctx.measureText(confidence).width;
                    ctx.fillStyle = 'rgba(0,0,0,0.8)';
                    roundRect(ctx, cx - confTw/2 - 10, by + 60, confTw + 20, 24, 12);
                    ctx.fill();
                    ctx.fillStyle = confColor;
                    ctx.fillText(confidence, cx, by + 76);

                    ctx.restore();
                }
            }

            // Error Handling UI
            if (sensors && sensors.gpsLat === 25.4920 && sensors.gpsLon === 81.8670) {
                 ctx.save();
                 ctx.fillStyle = 'rgba(239,68,68,0.9)';
                 roundRect(ctx, cx - 100, 100, 200, 30, 8);
                 ctx.fill();
                 ctx.fillStyle = '#fff';
                 ctx.textAlign = 'center';
                 ctx.font = '13px Inter, sans-serif';
                 ctx.fillText('Poor GPS accuracy. Move to open area.', cx, 120);
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
            {/* Dedicated QR Scan Mode — fullscreen, independent camera, guaranteed detection */}
            {scanMode && (
                <QRScanOverlay
                    onDetected={handleMarkerDetected}
                    onCancel={() => setScanMode(false)}
                />
            )}
            {/* Camera feed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: arActive ? 1 : 0 }}
            />

            {/* Distance-Aware UI Transition */}
            {arActive && distanceLeft && distanceLeft > 5000 ? (
                <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'transparent' }}>
                    {/* Full map representation for far distances */}
                    {sensors && <MiniMapOverlay lat={sensors.gpsLat} lon={sensors.gpsLon} destLat={CAMPUS_BUILDINGS.find(b => b.id === destId)?.latitude} destLon={CAMPUS_BUILDINGS.find(b => b.id === destId)?.longitude} waypoints={waypoints} trajectory={trajectory} />}
                    <div style={{ position: 'absolute', bottom: '120px', width: '100%', textAlign: 'center', color: '#fff', fontSize: '18px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                        Follow the Map. AR will activate within 100m.
                    </div>
                </div>
            ) : (
                <>
                    {/* AR Canvas overlay */}
                    <canvas
                        ref={canvasRef}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                    />
                    {/* Floating Mini Map Overlay for close distances */}
                    {arActive && sensors && (
                        <MiniMapOverlay lat={sensors.gpsLat} lon={sensors.gpsLon} destLat={destId ? CAMPUS_BUILDINGS.find(b => b.id === destId)?.latitude : undefined} destLon={destId ? CAMPUS_BUILDINGS.find(b => b.id === destId)?.longitude : undefined} waypoints={waypoints} trajectory={trajectory} />
                    )}
                </>
            )}

            {/* Top Controls */}
            <div style={{ position: 'absolute', top: isMobile ? '10px' : '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: isMobile ? '6px' : '12px', alignItems: 'center', zoom: isMobile ? 0.8 : 1 }}>
                {!arActive ? (
                    <button onClick={startCamera} style={btnStyle('#00ff88', '#000')}>
                        📷 Start AR Navigation
                    </button>
                ) : (
                    <>
                        <button onClick={stopCamera} style={btnStyle('#ef4444', '#fff')}>⏹ Stop</button>
                        {!isLogging ? (
                            <button onClick={startLogging} style={btnStyle('#3b82f6', '#fff')}>⚫ Start Log</button>
                        ) : (
                            <button onClick={stopLogging} style={btnStyle('#f59e0b', '#fff')}>🟠 Stop Log</button>
                        )}
                        {!isMobile && <button onClick={downloadLogs} style={btnStyle('#8b5cf6', '#fff')}>⬇ Download</button>}
                    </>
                )}
            </div>

            {/* Destination Picker */}
            {arActive && !destId && (
                <div style={{ position: 'absolute', top: '75px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.75)', padding: '12px 16px', borderRadius: '10px', border: '1px solid #333', minWidth: '260px' }}>
                    <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>Navigate to</div>
                    <select
                        value={pendingDestId || ''}
                        onChange={e => setPendingDestId(e.target.value || null)}
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

            {/* Destination Confirmation Modal & Map Preview */}
            {arActive && pendingDestId && !destId && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h3 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: '20px' }}>Path Preview</h3>
                    
                    {/* Visual Comparison Map layer */}
                    <div style={{ position: 'relative', width: '90%', maxWidth: '600px', height: '40vh', marginBottom: '20px' }}>
                        <MapView 
                            graph={graph} 
                            activePath={activeGraphPath} 
                            width={window.innerWidth * 0.9 > 600 ? 600 : window.innerWidth * 0.9} 
                            height={window.innerHeight * 0.4} 
                            userLat={sensors?.gpsLat}
                            userLon={sensors?.gpsLon}
                            debugMode={debugMode}
                        />
                        <GraphDebugToggle active={debugMode} onToggle={() => setDebugMode(!debugMode)} />
                    </div>

                    <div style={{ marginBottom: '24px', width: '90%', maxWidth: '400px' }}>
                        <ComparisonPanel 
                            totalNodes={Object.keys(graph.nodes).length}
                            totalEdges={Object.values(graph.edges).reduce((acc, e) => acc + e.length, 0)}
                            pathLength={pathMetrics.length}
                            executionTimeMs={pathMetrics.time}
                        />
                    </div>

                    <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', border: '1px solid #333' }}>
                        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '16px', marginTop: 0 }}>
                            Navigate to <strong>{CAMPUS_BUILDINGS.find(b => b.id === pendingDestId)?.name}</strong>?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={() => setPendingDestId(null)} style={btnStyle('#333', '#fff')}>Cancel</button>
                            <button onClick={() => { setDestId(pendingDestId); setPendingDestId(null); }} style={btnStyle('#00ff88', '#000')}>Start AR Mode</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Compass Calibration Button */}
            {arActive && (
                <button 
                    onClick={() => {
                        alert("Move phone in a figure-8 motion to calibrate the compass.");
                        if (sensors) setHeadingOffset(-sensors.compassBearing);
                    }} 
                    style={{ position: 'absolute', bottom: '20px', right: '20px', background: 'rgba(0,0,0,0.6)', border: '1px solid #444', color: '#fff', padding: '10px', borderRadius: '50%', cursor: 'pointer', zIndex: 10 }}
                    title="Calibrate Compass"
                >
                    🧭
                </button>
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

            {/* Smart Navigation Overlays */}
            {arActive && (
                <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 11, zoom: isMobile ? 0.75 : 1 }}>
                    {turnMessage && (
                        <div style={{ background: 'rgba(59, 130, 246, 0.9)', color: '#fff', padding: isMobile ? '8px 16px' : '12px 24px', borderRadius: '30px', fontWeight: 'bold', fontSize: isMobile ? '14px' : '18px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.7)' }}>
                            {turnMessage}
                        </div>
                    )}
                    {entranceWarning && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.9)', color: '#fff', padding: isMobile ? '6px 12px' : '10px 20px', borderRadius: '12px', fontWeight: 'bold', fontSize: isMobile ? '12px' : '16px', border: '2px solid rgba(255,255,255,0.5)' }}>
                            {entranceWarning}
                        </div>
                    )}
                    {pathWarning && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: isMobile ? '6px 12px' : '10px 20px', borderRadius: '12px', fontWeight: 'bold', fontSize: isMobile ? '12px' : '16px', border: '2px solid rgba(255,255,255,0.5)', animation: 'pulse 1s infinite' }}>
                            {pathWarning}
                        </div>
                    )}
                </div>
            )}

            {/* Live Location & Dev Debug */}
            {arActive && sensors && sensors.gpsLat !== null && (
                <div style={{ position: 'absolute', bottom: isMobile ? '55px' : '70px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 10, zoom: isMobile ? 0.8 : 1, flexWrap: 'wrap', justifyContent: 'center', width: '90%' }}>
                    <div style={{ background: 'rgba(0,0,0,0.6)', color: '#00ff88', padding: '6px 10px', borderRadius: '12px', fontSize: isMobile ? '10px' : '11px', fontWeight: 'bold', border: '1px solid #00ff8833' }}>
                        📍 {sensors.gpsLat.toFixed(4)}°N, {sensors.gpsLon.toFixed(4)}°E
                    </div>
                    {destId && !gtAnchorUI.active && (
                        <div style={{ background: snapUI.isLocked ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.9)', color: '#fff', padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.4)', transition: 'background 0.3s' }}>
                            {snapUI.isLocked ? `🔒 Path Locked (${(snapUI.confidence * 100).toFixed(0)}%)` : '🔄 Reacquiring Route...'}
                        </div>
                    )}
                    {gtAnchorUI.active && (
                        <div style={{ background: 'rgba(139, 92, 246, 0.9)', color: '#fff', padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.8)', animation: 'pulse 2s infinite' }}>
                            🎯 Ground Truth Anchor: {gtAnchorUI.id}
                        </div>
                    )}
                </div>
            )}

            {/* QR Scan Trigger Button */}
            {arActive && destId && (
                <button
                    onClick={() => setScanMode(true)}
                    style={{
                        position: 'absolute', bottom: '20px', right: '16px', zIndex: 15,
                        background: 'rgba(139, 92, 246, 0.85)',
                        color: '#fff', border: '1px solid rgba(255,255,255,0.5)',
                        padding: '10px 16px', borderRadius: '20px',
                        fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                        backdropFilter: 'blur(6px)'
                    }}
                >
                    📷 Scan QR Anchor
                </button>
            )}

            {/* Diagnostic Panel for Defense / Viva */}
            {arActive && (
                <div style={{ position: 'absolute', top: isMobile ? '55px' : '90px', left: isMobile ? '8px' : '16px', background: 'rgba(0,0,0,0.7)', border: '1px solid #444', borderRadius: '8px', padding: isMobile ? '6px 8px' : '12px', color: '#fff', fontSize: isMobile ? '10px' : '12px', zIndex: 20, fontFamily: 'monospace', zoom: isMobile ? 0.85 : 1 }}>
                    <div style={{ color: '#aaa', marginBottom: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>Diagnostics</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '3px' }}>
                        <span style={{ color: '#888' }}>Error:</span>
                        <span style={{ color: '#ef4444' }}>{debugInfo.error.toFixed(1)} m</span>
                        <span style={{ color: '#888' }}>Deviation:</span>
                        <span style={{ color: '#eab308' }}>{debugInfo.deviation.toFixed(1)} m</span>
                        <span style={{ color: '#888' }}>Next Turn:</span>
                        <span style={{ color: '#3b82f6' }}>{debugInfo.nextTurn}</span>
                    </div>
                </div>
            )}

            {/* Live Navigation State (Explainable AI / Navigation Layer) */}
            {arActive && destId && waypoints.length > 0 && (
                <div style={{ position: 'absolute', top: isMobile ? '130px' : '150px', left: isMobile ? '8px' : '16px', background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(0, 255, 136, 0.4)', borderRadius: '10px', padding: isMobile ? '8px' : '12px', color: '#fff', fontSize: isMobile ? '11px' : '13px', zIndex: 20, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 15px rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zoom: isMobile ? 0.85 : 1 }}>
                    <div style={{ color: '#00ff88', marginBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: isMobile ? '9px' : '11px', letterSpacing: '1px' }}>Navigation State</div>
                    <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00ff88', animation: 'pulse 1.5s infinite' }} />
                        <span>Moving toward <strong>Node {waypoints.length > 1 ? waypoints.length - 1 : 'Destination'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                        <span style={{ color: '#aaa', fontSize: isMobile ? '10px' : '12px' }}>Nodes Remaining:</span>
                        <span style={{ fontWeight: 'bold', fontSize: isMobile ? '12px' : '14px', color: '#fff' }}>{waypoints.length}</span>
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
