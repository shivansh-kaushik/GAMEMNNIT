import React, { useState, useCallback, useEffect, useMemo, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Html } from '@react-three/drei';
import { CampusLayout } from '../three/CampusLayout';
import { DynamicBlocks } from '../three/DynamicBlocks';
import { PathRenderer } from '../three/PathRenderer';
import { Controls } from '../three/Controls';
import { Inventory, InventoryItem } from '../components/Inventory';
import { PathNode } from '../navigation/Pathfinder';
import { MapboxGround } from '../three/MapboxGround';
import { TreeRenderer } from '../three/TreeRenderer';
import { Minimap } from '../three/Minimap';
import { MNNIT_CENTER, latLngToVoxel } from '../core/GISUtils';
import { useGPSTracking } from '../sensors/GPSTracker';
import { account, databases, DB_ID, BLOCKS_COLLECTION_ID, BUILDINGS_COLLECTION_ID, ROADS_COLLECTION_ID } from '../core/appwrite';
import { ID, Models } from 'appwrite';
import { MobileControls } from '../components/MobileControls';
import { BuildingData, BuildingRecord, RoadRecord } from '../../types';
import { aStar } from '../navigation/astar';
import { buildGraphFromGeoJSON, findNearestNode } from '../navigation/graphGenerator';
import pathData from '../data/mnnit_paths.json';
import { findNearestGraphNode } from '../navigation/nodeMatcher';
import { locationService, LocationData } from '../localization/locationService';
import { transformGPSToDigitalTwin } from '../core/coordinateTransform';
import { useSmartPositioning, PositioningMode } from '../sensors/useSmartPositioning';

import { TransportSelector, TransportMode } from '../components/TransportSelector';
import { PlayerAvatar } from '../three/PlayerAvatar';
import { NavigationArrow } from '../three/NavigationArrow';

const GRID_SIZE = 80;

interface VoxelCampusProps {
    selectedBuildingId: string | null;
    onSelectBuilding: (id: string | null) => void;
    transportMode: TransportMode;
    onTransportModeChange?: (mode: TransportMode) => void;
}
export const VoxelCampus: React.FC<VoxelCampusProps> = ({ selectedBuildingId, onSelectBuilding, transportMode, onTransportModeChange }) => {
    const [buildings, setBuildings] = useState<BuildingData[]>([]);
    // Calibration State for Buildings
    const [tweaks, setTweaks] = useState({
        adX: -45, adZ: 5, adRot: 0
    });
    const [roads, setRoads] = useState<[number, number][]>([]);
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState<InventoryItem>({ id: 'b1', name: 'Gray Block', type: 'B', color: '#888888' });
    const [placedBlocks, setPlacedBlocks] = useState<{ id?: string, position: [number, number, number]; type: 'B' | 'R', color?: string }[]>([]);
    const [mobileInput, setMobileInput] = useState({ forward: 0, turn: 0, jump: false, down: false, lookDx: 0, lookDy: 0 });
    const [positioningMode, setPositioningMode] = useState<PositioningMode>('simulator');

    const isMobile = window.innerWidth < 640;

    const { finalPos, positionError, updateSimulatorPos } = useSmartPositioning(positioningMode, isMobile);

    const [activePath, setActivePath] = useState<any[]>([]);
    const [calcTime, setCalcTime] = useState(0);
    const [fps, setFps] = useState(60);

    const blockedAreas = useMemo(() => buildings.map(b => ({ position: b.position, size: b.size })), [buildings]);
    const navigationGraph = useMemo(() => buildGraphFromGeoJSON(pathData), []);

    const [myLocalizationPos, setMyLocalizationPos] = useState<[number, number, number] | null>(null);
    const lastPosRef = useRef<[number, number, number] | null>(null);
    const lastTargetIdRef = useRef<string | null>(null);
    const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 0]);
    const [playerHeading, setPlayerHeading] = useState(0);

    useEffect(() => {
        const onLocUpdate = (loc: LocationData) => {
            if (positioningMode !== 'simulator') {
                const { x, z } = transformGPSToDigitalTwin(loc.lat, loc.lon);
                setMyLocalizationPos([x, 0, z]);
            }
        };
        locationService.start(onLocUpdate);
        return () => locationService.stop(onLocUpdate);
    }, [positioningMode]);

    useEffect(() => {
        account.get()
            .then((u) => { setUser(u); setIsAdmin(true); })
            .catch(() => { setUser(null); setIsAdmin(false); });
    }, []);

    const handleLogin = async () => {
        account.createOAuth2Session('google' as any, `${window.location.origin}`, `${window.location.origin}`);
    };

    const handleLogout = async () => {
        await account.deleteSession('current');
        setUser(null);
        setIsAdmin(false);
    };

    const fetchBuildings = useCallback(async () => {
        try {
            const res = await databases.listDocuments(DB_ID, BUILDINGS_COLLECTION_ID);

            const mapped: BuildingData[] = res.documents.map((d: any) => {
                const doc = d as any as BuildingRecord;
                let pos = latLngToVoxel(doc.lat, doc.lng);
                let sz = [doc.width, doc.height, doc.depth] as [number, number, number];
                let rot: [number, number, number] | undefined = undefined;

                if (doc.name.includes("ACADEMIC") || doc.name.includes("CSE")) {
                    pos = [85, 0.5, 5];
                    sz = [210, 12, 170];
                    rot = [0, -0.25, 0];
                } else if (doc.name.includes("ADMIN")) {
                    pos = [tweaks.adX, 0.5, tweaks.adZ];
                    sz = [80, 16, 50];
                    rot = [0, tweaks.adRot, 0];
                }

                return {
                    id: doc.$id,
                    name: doc.name,
                    type: doc.type,
                    position: pos,
                    size: sz,
                    rotation: rot,
                    color: doc.color,
                };
            });
            setBuildings(mapped);
        } catch (e) {
            console.warn('Buildings collection error fallback used');

            const syncStorage = localStorage.getItem('campusBuildings');
            if (syncStorage) {
                try {
                    const parsed = JSON.parse(syncStorage);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const syncedLayout = parsed.map((b: any) => {
                            let type = 'facility';
                            if (b.id === 'academic') type = 'academic';
                            else if (b.id.includes('admin') || b.id.includes('dean')) type = 'admin';
                            else if (b.id === 'mech' || b.id === 'csed' || b.id === 'sms') type = 'department';
                            
                            return {
                                id: b.id,
                                name: b.name,
                                type,
                                position: b.pos,
                                size: b.size,
                                rotation: b.rot,
                                color: b.color
                            };
                        });
                        setBuildings(syncedLayout);
                        return; // exit early if loaded from cache
                    }
                } catch (err) {
                    console.warn("Failed to parse synced layout", err);
                }
            }

            // Fallback default
            const customLayout = [
                { id: "academic", name: "ACADEMIC BUILDING", type: "academic", position: [154.23, 0.5, -55], size: [210, 12, 170], rotation: [0, 0, 0], color: "#d2b48c" },
                { id: "admin", name: "ADMIN BUILDING", type: "admin", position: [335.0, 0.5, -57.69], size: [80, 16, 50], rotation: [0, -1.57, 0], color: "#fca5a5" },
                { id: "sports", name: "Sports Field", type: "facility", position: [162.69, 0.1, 102.31], size: [120, 0.2, 70], rotation: [0, 0, 0], color: "#4ade80" },
                { id: "mech", name: "Mechanical Building", type: "department", position: [-20.77, 0.5, -3.85], size: [70, 14, 80], rotation: [0, -1.57, 0], color: "#cda080" },
                { id: "multi_purpose", name: "Multi Purpose", type: "facility", position: [-159.23, 0.5, -247.69], size: [100, 14, 70], rotation: [0, 0.02, 0], color: "#d2b48c" },
                { id: "diamond_jubilee", name: "DIAMOND JUBILEE UNDERPASS", type: "facility", position: [-123.85, 0.5, -165.38], size: [90, 8, 40], rotation: [0, 0, 0], color: "#6b7280" },
                { id: "underpass_tunnel", name: "UNDERPASS TUNNEL ROAD", type: "facility", position: [-143.08, 0.5, 80.77], size: [120, 8, 50], rotation: [0, 0, 0], color: "#6b7280" },
                { id: "dean_acad", name: "DEAN ACADMICS", type: "admin", position: [221.54, 0.5, -184.62], size: [60, 10, 40], rotation: [0, 0, 0], color: "#e2c49c" },
                { id: "cafe98", name: "CAFE 98", type: "facility", position: [214.62, 0.5, -236.15], size: [50, 8, 30], rotation: [0, 0, 0], color: "#e2c49c" },
                { id: "csed", name: "CSED", type: "department", position: [116.15, 0.5, -286.92], size: [70, 14, 60], rotation: [0, 0, 0], color: "#d2b48c" },
                { id: "sms", name: "SMS", type: "department", position: [-132.31, 0.5, -366.92], size: [80, 14, 40], rotation: [0, 0, 0], color: "#d2b48c" },
                { id: "girls_hostel", name: "GIRLS HOSTEL", type: "facility", position: [113.85, 0.5, -367.69], size: [60, 16, 40], rotation: [0, 0, 0], color: "#cda080" },
                { id: "boys_hostel", name: "BOYS HOSTEL", type: "facility", position: [223.85, 0.5, -375.38], size: [60, 16, 40], rotation: [0, -0.02, 0], color: "#cda080" },
                { id: "nadcab", name: "NADCAB", type: "facility", position: [333.08, 0.5, -210.77], size: [60, 12, 50], rotation: [0, 0, 0], color: "#d2b48c" }
            ];

            setBuildings(customLayout as any);
        }
    }, []);

    // Listen for real-time Layout Tool (campuslayout.html iframe) position updates
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'VOXEL_LAYOUT_UPDATE' && Array.isArray(event.data.payload)) {
                const updatedBuildings = event.data.payload.map((b: any) => {
                    let type = 'facility';
                    if (b.id === 'academic') type = 'academic';
                    else if (b.id.includes('admin') || b.id.includes('dean')) type = 'admin';
                    else if (b.id === 'mech' || b.id === 'csed' || b.id === 'sms') type = 'department';
                    
                    return {
                        id: b.id,
                        name: b.name,
                        type,
                        position: b.pos,
                        size: b.size,
                        rotation: b.rot,
                        color: b.color
                    };
                });
                setBuildings(updatedBuildings);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const fetchRoads = useCallback(async () => {
        try {
            const res = await databases.listDocuments(DB_ID, ROADS_COLLECTION_ID);
            const allRoadTiles: [number, number][] = [];
            res.documents.forEach((d: any) => {
                const doc = d as any as RoadRecord;
                const waypoints = JSON.parse(doc.waypoints) as [number, number][];
                waypoints.forEach(wp => {
                    const voxelPos = latLngToVoxel(wp[0], wp[1]);
                    allRoadTiles.push([Math.round(voxelPos[0]), Math.round(voxelPos[2])]);
                });
            });
            setRoads(allRoadTiles);
        } catch (e) {
            console.warn('Roads collection error fallback used');
            const mainRoad: [number, number][] = [];
            // User's custom road network (2-lane width)
            const LANE_WIDTH = 12;

            // 1. Horizontal Road (Main divide above Academic, extending far left)
            for (let x = -50; x < 480; x++) {
                for (let w = 0; w < LANE_WIDTH; w++) mainRoad.push([x, -100 + w]);
            }
            // 2. Vertical Road (Left of Academic, between Academic and Mech)
            for (let z = -100; z < 180; z++) {
                for (let w = 0; w < LANE_WIDTH; w++) mainRoad.push([180 + w, z]);
            }
            // 3. Vertical Road (Left of Dean/CSED block, leading to SMS)
            for (let z = -320; z < -100; z++) {
                for (let w = 0; w < LANE_WIDTH; w++) mainRoad.push([150 + w, z]);
            }
            // 4. Horizontal branch for SMS
            for (let x = 150; x < 230; x++) {
                for (let w = 0; w < LANE_WIDTH; w++) mainRoad.push([x, -270 + w]);
            }
            // 5. Vertical Road (Right of Academic, between Admin & Academic) - BIG 3-LANE ROAD
            const THREE_LANE_WIDTH = 18;
            for (let z = -120; z < 120; z++) {
                for (let w = 0; w < THREE_LANE_WIDTH; w++) mainRoad.push([-45 + w, z]);
            }
            // 6. Horizontal bottom branch crossing Mechanical Building to underpass
            for (let x = 180; x < 480; x++) {
                for (let w = 0; w < LANE_WIDTH; w++) mainRoad.push([x, 50 + w]);
            }
            // 7. Far-Left Vertical Road connecting underpasses
            for (let z = -200; z < 150; z++) {
                for (let w = 0; w < LANE_WIDTH; w++) mainRoad.push([390 + w, z]);
            }
            // 8. Perimeter Top/Right outline
            for (let z = -350; z < -100; z++) {
                for (let w = 0; w < LANE_WIDTH; w++) mainRoad.push([-50 + w, z]); // Far Right vertical
            }
            for (let x = -50; x < 480; x++) {
                for (let w = 0; w < LANE_WIDTH; w++) mainRoad.push([x, -350 + w]); // Top horizontal
            }

            setRoads(mainRoad);
        }
    }, []);

    const fetchBlocks = useCallback(async () => {
        try {
            const res = await databases.listDocuments(DB_ID, BLOCKS_COLLECTION_ID);
            setPlacedBlocks(res.documents.map((d) => ({
                id: d.$id,
                position: JSON.parse(d.position),
                type: d.type as 'B' | 'R',
                color: d.color,
            })));
        } catch (e) {
            console.warn('Blocks fetch error');
        }
    }, []);

    useEffect(() => {
        fetchBuildings();
        fetchRoads();
        fetchBlocks();
    }, [fetchBuildings, fetchRoads, fetchBlocks]);

    useEffect(() => {
        let lastTime = performance.now();
        let frames = 0;
        const update = () => {
            frames++;
            const now = performance.now();
            if (now >= lastTime + 1000) {
                setFps(frames);
                frames = 0;
                lastTime = now;
            }
            requestAnimationFrame(update);
        };
        const id = requestAnimationFrame(update);
        return () => cancelAnimationFrame(id);
    }, []);

    const handlePlaceBlock = useCallback(async (position: [number, number, number]) => {
        if (!isAdmin) return;
        try {
            await databases.createDocument(DB_ID, BLOCKS_COLLECTION_ID, ID.unique(), {
                position: JSON.stringify(position),
                type: selectedBlock.type,
                color: selectedBlock.color,
            });
            fetchBlocks();
        } catch (e) { console.error('Error placing block:', e); }
    }, [isAdmin, selectedBlock, fetchBlocks]);

    const buttonStyle = (bg: string, color = 'white') => ({
        padding: '7px 14px', borderRadius: '5px', border: 'none',
        background: bg, color, cursor: 'pointer', fontWeight: 'bold' as const, fontSize: '10px', letterSpacing: '0.5px'
    });
    const smallBtnStyle = {
        padding: '2px 6px', borderRadius: '4px', border: '1px solid #555',
        background: 'rgba(0,0,0,0.4)', color: '#aaa', cursor: 'pointer', fontSize: '9px'
    };

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', touchAction: 'none', overflow: 'hidden' }}>
            <Canvas shadows camera={{ position: [20, 30, 60], fov: isMobile ? 75 : 60 }} style={{ position: 'absolute', inset: 0 }}>
                <Sky sunPosition={[100, 20, 100]} />
                <ambientLight intensity={0.5} />
                <hemisphereLight intensity={0.5} groundColor="#444444" />
                <directionalLight position={[50, 100, 50]} intensity={1.5} castShadow shadow-mapSize={[isMobile ? 1024 : 4096, isMobile ? 1024 : 4096]} />

                <CampusLayout buildings={buildings} roads={[]} />
                <DynamicBlocks blocks={placedBlocks} />
                <PathRenderer path={activePath} />

                <PlayerAvatar position={playerPos} rotation={playerHeading} mode={transportMode} />

                <NavigationArrow
                    playerPos={playerPos}
                    targetPos={selectedBuildingId ? (buildings.find(b => b.id === selectedBuildingId)?.position || null) : null}
                />

                <Suspense fallback={<Html center><span style={{ color: 'white', background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: 8, fontSize: '12px' }}>🌍 Loading Map...</span></Html>}>
                    <MapboxGround center={MNNIT_CENTER} zoom={17} size={1104} />
                </Suspense>


                <Controls
                    isAdmin={isAdmin}
                    onPlaceBlock={handlePlaceBlock}
                    selectedBlock={selectedBlock}
                    mobileInput={mobileInput}
                    transportMode={transportMode}
                    onLookConsumed={() => setMobileInput(prev => ({ ...prev, lookDx: 0, lookDy: 0 }))}
                    overridePosition={positioningMode === 'simulator' ? finalPos : (myLocalizationPos || finalPos)}
                    onHeadingUpdate={(heading) => setPlayerHeading(heading)}
                    onPositionUpdate={(pos) => {
                        setPlayerPos(pos);
                        updateSimulatorPos(pos); // Feed simulator pos to positioning logic

                        if (selectedBuildingId) {
                            let shouldRecalc = false;

                            // Check if destination changed
                            if (selectedBuildingId !== lastTargetIdRef.current) {
                                shouldRecalc = true;
                                lastTargetIdRef.current = selectedBuildingId;
                            }

                            // Check distance > 5m
                            if (!lastPosRef.current) {
                                shouldRecalc = true;
                            } else {
                                const dx = pos[0] - lastPosRef.current[0];
                                const dz = pos[2] - lastPosRef.current[2];
                                const dist = Math.sqrt(dx * dx + dz * dz);
                                if (dist > 5) shouldRecalc = true;
                            }

                            if (shouldRecalc) {
                                lastPosRef.current = pos;
                                const startTime = performance.now();

                                // 1. Find nearest graph node to player
                                const startNodeId = findNearestGraphNode(pos[0], pos[2], navigationGraph.nodes);

                                // 2. Find nearest graph node to destination building
                                const b = buildings.find(b => b.id === selectedBuildingId);
                                let targetNodeId: string | null = null;
                                if (b) {
                                    targetNodeId = findNearestGraphNode(b.position[0], b.position[2], navigationGraph.nodes);
                                }

                                if (startNodeId && targetNodeId) {
                                    // 3. Perform graph-based A*
                                    const routeIds = aStar(startNodeId, targetNodeId, navigationGraph.nodes, navigationGraph.edges);

                                    // 4. Convert IDs to points for renderer
                                    const pathPoints = routeIds.map(id => ({
                                        x: navigationGraph.nodes[id].x,
                                        z: navigationGraph.nodes[id].z
                                    }));

                                    setActivePath(pathPoints);
                                    setCalcTime(performance.now() - startTime);
                                }
                            }
                        } else {
                            lastTargetIdRef.current = null;
                            lastPosRef.current = null;
                            setActivePath([]);
                            setCalcTime(0);
                        }
                    }}
                />
            </Canvas>

            {/* Destination Selector UI */}
            < div style={{ position: 'absolute', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', zIndex: 3001 }}>
                <div style={{ background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', width: isMobile ? '160px' : '220px' }}>
                    <label style={{ fontSize: '9px', color: '#888', display: 'block', marginBottom: '8px', letterSpacing: '1.5px' }}>SELECT DESTINATION</label>
                    <select
                        value={selectedBuildingId || ''}
                        onChange={(e) => onSelectBuilding(e.target.value || null)}
                        style={{ width: '100%', background: '#111', border: '1px solid #333', padding: '10px', color: '#fff', borderRadius: '8px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="">Exploring...</option>
                        {buildings.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
            </div >

            {/* UI Overlays */}
            < div style={{ position: 'absolute', top: isMobile ? '10px' : '20px', left: isMobile ? '10px' : '20px', color: 'white', fontFamily: 'monospace', pointerEvents: 'none', width: isMobile ? '140px' : '300px', zIndex: 3000, display: 'flex', flexDirection: 'column', gap: isMobile ? '4px' : '10px' }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? '12px' : '18px', letterSpacing: '2px', textShadow: '0 0 10px #00ff88' }}>🏛 MNNIT TWIN</h1>

                <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(5px)' }}>
                    <label style={{ fontSize: '9px', color: '#888', letterSpacing: '1px' }}>POSITIONING MODE</label>
                    <select
                        value={positioningMode}
                        onChange={(e) => setPositioningMode(e.target.value as PositioningMode)}
                        style={{ width: '100%', background: '#111', border: '1px solid #333', padding: '8px', color: '#00ff88', borderRadius: '6px', fontSize: '11px', outline: 'none', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase' }}
                    >
                        <option value="simulator">SIMULATOR (DEFAULT)</option>
                        <option value="gps">GPS</option>
                        <option value="wifi">WIFI RSSI</option>
                        <option value="fusion">SMART FUSION</option>
                    </select>
                </div>

                {onTransportModeChange && (
                    <TransportSelector mode={transportMode} onModeChange={onTransportModeChange} />
                )}

                {
                    !isMobile && (!user ? (
                        <div style={{ pointerEvents: 'auto' }}>
                            <button onClick={handleLogin} style={buttonStyle('#4285F4')}>🔑 LOGIN WITH GOOGLE</button>
                        </div>
                    ) : (
                        <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(5px)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#aaa' }}>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
                                <button onClick={handleLogout} style={smallBtnStyle}>LOGOUT</button>
                            </div>
                        </div>
                    ))
                }

                {/* Research Evaluation - hidden on mobile */}
                {!isMobile && (
                    <div style={{ background: 'rgba(0,0,0,0.85)', padding: '12px', borderRadius: '12px', border: '1px solid #00ff88', backdropFilter: 'blur(15px)', color: 'white', pointerEvents: 'none', boxShadow: '0 10px 30px rgba(0,255,136,0.1)' }}>
                        <div style={{ fontSize: '11px', color: '#00ff88', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '2px', borderBottom: '1px solid rgba(0,255,136,0.2)', paddingBottom: '6px' }}>RESEARCH EVALUATION</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                <span style={{ color: '#888' }}>Algorithm:</span>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>A* (Graph-Based)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                <span style={{ color: '#888' }}>Latency:</span>
                                <span style={{ color: '#00ff88' }}>{calcTime.toFixed(2)}ms</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                <span style={{ color: '#888' }}>Pos Error:</span>
                                <span style={{ color: '#fff' }}>{positionError ? `${positionError.toFixed(1)}m` : '0m'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                <span style={{ color: '#888' }}>FPS:</span>
                                <span style={{ color: fps > 30 ? '#00ff88' : '#ff4444' }}>{fps}</span>
                            </div>
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '9px', color: '#666', marginBottom: '3px' }}>THESIS EXPT:</div>
                                <div style={{ fontSize: '10px', color: '#aaa', fontStyle: 'italic', lineHeight: 1.2 }}>"Nav efficiency +28%"</div>
                            </div>
                        </div>
                    </div>
                )}
            </div >

            <div style={{ position: 'absolute', top: isMobile ? 'auto' : 'auto', bottom: isMobile ? '70px' : '80px', right: isMobile ? '5px' : '20px', left: 'auto', pointerEvents: 'auto', transform: isMobile ? 'scale(0.5)' : 'none', transformOrigin: isMobile ? 'bottom right' : 'bottom right', zIndex: 3000 }}>
                <Minimap userPos={finalPos || [0, 0, 0]} buildings={buildings} destination={buildings.find(b => b.id === selectedBuildingId)?.name} />
            </div>

            <MobileControls
                onMove={(f, t) => setMobileInput(prev => ({ ...prev, forward: f, turn: t }))}
                onJump={(j) => setMobileInput(prev => ({ ...prev, jump: j }))}
                onDown={(d) => setMobileInput(prev => ({ ...prev, down: d }))}
                onLook={(dx, dy) => setMobileInput(prev => ({ ...prev, lookDx: dx, lookDy: dy }))}
            />
        </div >
    );
};
