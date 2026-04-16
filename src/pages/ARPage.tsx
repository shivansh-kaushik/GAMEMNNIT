import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CAMPUS_BUILDINGS } from '../navigation/buildings';
import { readSensors, ARSensors, gpsToARWorld } from '../ar/arEngine';
import { buildARPath, remainingDistance, ARNavWaypoint } from '../ar/arNavigation';
import logger from '../utils/logger';
import { AIAssistantPanel } from '../ai/AIAssistantPanel'; // AI layer — does not touch AR logic
import { useHeadingSmoothing } from '../hooks/useHeadingSmoothing';
import { useNavigationConfidence } from '../hooks/useNavigationConfidence';
import { MiniMapOverlay } from '../components/MiniMapOverlay';
import { FloorIndicator } from '../components/FloorIndicator';
import { calibrateFloor, useFloorDetection } from '../sensors/floorDetection';
import { CameraHintOverlay } from '../ai/CameraHintOverlay';
import { ARHud } from '../components/ui/ARHud';
import { ARInstructionCard } from '../components/ui/ARInstructionCard';


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
interface ARPageProps {
    sharedPath: string[];
    sharedDestinationId: string | null;
    onArStop: () => void;
    onDestinationChange: (id: string | null) => void;
    isActive?: boolean;
}

export const ARPage: React.FC<ARPageProps> = ({ 
    sharedPath, 
    sharedDestinationId, 
    onArStop,
    onDestinationChange,
    isActive = false
}) => {
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

    const destIdRef = useRef<string | null>(null);
    const pathDestRef = useRef<string | null>(null);

    useEffect(() => { destIdRef.current = destId; }, [destId]);

    // 0. Sync Shared Destination (State Persistence)
    useEffect(() => {
        if (sharedDestinationId) {
            setDestId(sharedDestinationId);
        }
    }, [sharedDestinationId]);

    // 1. Consume Shared Path (Planning -> Execution)
    useEffect(() => {
        if (!sensors || !sensors.gpsLat || !sensors.gpsLon) return;

        let activePath = sharedPath;
        
        // If QuickSelect was used, Map didn't generate a path. We generate fallback here:
        if (activePath.length === 0 && destId) {
            const destB = CAMPUS_BUILDINGS.find(b => b.id === destId);
            if (destB) {
                const [sx, sy, sz] = latLngToVoxel(sensors.gpsLat, sensors.gpsLon);
                const [dx, dy, dz] = latLngToVoxel(destB.latitude, destB.longitude);
                const sNode = findNearestGraphNode(sx, sz, graph.nodes);
                const dNode = findNearestGraphNode(dx, dz, graph.nodes);
                if (sNode && dNode) {
                    activePath = aStar(sNode, dNode, graph.nodes, graph.edges);
                }
            }
        }

        if (activePath.length === 0) return;

        // Convert Node IDs to AR Waypoints (Map -> AR coordinate space transformation)
        const pathWaypoints: ARNavWaypoint[] = activePath.map((id, i) => {
            const node = graph.nodes[id];
            if (!node) return null;
            return {
                ...gpsToARWorld(node.lat, node.lng, sensors.gpsLat!, sensors.gpsLon!),
                gpsLat: node.lat,
                gpsLon: node.lng,
                distFromPrev: 0,
                totalDist: 0,
                label: i === activePath.length - 1 ? "Target" : undefined
            };
        }).filter(wp => wp !== null) as ARNavWaypoint[];

        setWaypoints(pathWaypoints);
        waypointsRef.current = pathWaypoints;
    }, [sharedPath, destId, sensors?.gpsLat, sensors?.gpsLon, graph]);

    const startLogging = () => { setIsLogging(true); isLoggingRef.current = true; };
    const stopLogging = () => { setIsLogging(false); isLoggingRef.current = false; };
    const downloadLogs = () => logger.download();

    const smoothedHeading = useHeadingSmoothing(sensors?.compassBearing ?? 0, 0.15, 150);
    const confidence = useNavigationConfidence(sensors?.gpsLat ?? 0, sensors?.gpsLon ?? 0, destId);
    const { floor } = useFloorDetection();

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
        onArStop(); // Notify App to clear navigation intent on exit
    }, [onArStop]);

    // 0. Camera Lifecycle
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

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

                // 0. Off-Route Recalibration
                if (deviation > 25 && destIdRef.current) {
                    console.log(`High deviation (${deviation.toFixed(1)}m). Recalculating path...`);
                    const newWp = buildARPath(s.gpsLat, s.gpsLon, destIdRef.current, 5);
                    setWaypoints(newWp);
                    waypointsRef.current = newWp;
                    prevSnapRef.current = null;
                }

                // Next waypoint for calculations
                const nextWP = waypointsRef.current[Math.min(1, waypointsRef.current.length - 1)];

                // 1. Entrance Detection (<10m)
                let foundEnt = null;
                for (const e of ENTRANCES) {
                    if (getDistanceM(s.gpsLat, s.gpsLon, e.lat, e.lon) < 10) {
                        foundEnt = e.name;
                        // AUTOMATED RESET: Snap floor to Ground (0) when entering a building
                        calibrateFloor(0); 
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

        // STABILIZATION: Reset floor baseline on QR scan (use payload floor or default to Ground/0)
        calibrateFloor(payload.floor !== undefined ? payload.floor : 0);
    }, [sensors]);

    // Note: Passive background scanning (markerScannerRef) is intentionally REMOVED.
    // WebXR camera lock makes passive scanning unreliable on most devices.
    // The dedicated Scan Mode (QRScanOverlay) guarantees full camera access.

    // ---------- Build waypoints when destination changes ----------
    useEffect(() => {
        if (!destId || !sensors || !sensors.gpsLat || !sensors.gpsLon) return;
        
        // Prevent regenerating unless the destination actually changed
        if (pathDestRef.current !== destId) {
            const wp = buildARPath(sensors.gpsLat, sensors.gpsLon, destId, 5);
            setWaypoints(wp);
            waypointsRef.current = wp;
            pathDestRef.current = destId;
            prevSnapRef.current = null; // Clear snapping filter history on new route
        }

        // Keep distance indicator updated without flushing the track
        setDistanceLeft(remainingDistance(sensors.gpsLat, sensors.gpsLon, destId));
    }, [destId, sensors]);

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
        <div className="ar-camera-container">
            {/* Dedicated QR Scan Mode — fullscreen, independent camera, guaranteed detection */}
            {scanMode && (
                <QRScanOverlay
                    onDetected={handleMarkerDetected}
                    onCancel={() => setScanMode(false)}
                />
            )}
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
            />
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-10 w-full h-full pointer-events-none"
            />

            {/* Production HUD Overlay */}
            {arActive && (
                <ARHud 
                    gpsAccuracy={sensors?.gpsAccuracy || 0}
                    coneAngleDeg={25} 
                    floorNumber={floor}
                    compassHeading={sensors?.compassBearing || 0}
                />
            )}

            {/* Production Instruction Card */}
            {arActive && turnMessage && (
                <ARInstructionCard 
                    direction={turnMessage} 
                    distanceMeters={Math.round(distanceLeft || 0)} 
                />
            )}

            {/* Error States */}
            {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 p-10 text-center text-red-500 font-bold">
                    ⚠ {cameraError}
                </div>
            )}
            
            {!destId && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4 w-full px-6 pointer-events-auto">
                    <div className="px-4 py-2 glass rounded-full border border-white/5 flex items-center gap-2 shadow-2xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Select Destination in AR</span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 w-full max-w-sm scrollbar-none justify-center">
                        {[
                            { id: 'mnnit_lib', name: 'Library', icon: '📚' },
                            { id: 'mnnit_cse', name: 'CSE Bldg', icon: '💻' },
                            { id: 'mnnit_admin', name: 'Admin', icon: '🏛️' }
                        ].map(b => (
                            <button
                                key={b.id}
                                onClick={() => onDestinationChange(b.id)}
                                className="whitespace-nowrap flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-tighter text-white hover:bg-blue-600 transition-all active:scale-95 shadow-lg"
                            >
                                <span>{b.icon}</span>
                                <span>{b.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Layers — Protected Logic ───────────────────── */}
            <AIAssistantPanel
                onNavigate={onDestinationChange}
                arActive={arActive}
                sensors={sensors}
                waypoints={waypoints}
            />

            <FloorIndicator skipCalibration={!arActive} />

            <CameraHintOverlay
                videoRef={videoRef}
                arActive={arActive}
                confidence={confidence}
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
