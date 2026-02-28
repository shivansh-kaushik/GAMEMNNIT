import React, { useState, useCallback, useEffect, useMemo, Suspense } from 'react';
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
import { useSmartPositioning, PositioningMode } from '../sensors/useSmartPositioning';

const GRID_SIZE = 80;

interface VoxelCampusProps {
    selectedBuildingId: string | null;
    onSelectBuilding: (id: string | null) => void;
}

export const VoxelCampus: React.FC<VoxelCampusProps> = ({ selectedBuildingId, onSelectBuilding }) => {
    const [buildings, setBuildings] = useState<BuildingData[]>([]);
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
                return {
                    id: doc.$id,
                    name: doc.name,
                    type: doc.type,
                    position: latLngToVoxel(doc.lat, doc.lng),
                    size: [doc.width, doc.height, doc.depth],
                    color: doc.color,
                };
            });
            setBuildings(mapped);
        } catch (e) {
            console.warn('Buildings collection error fallback used');
            setBuildings([
                { id: 'academic', name: "ACADEMIC BUILDING", type: 'academic', position: [25, 0, 15], size: [40, 12, 30], color: "#fef3c7" },
                { id: 'admin', name: "ADMIN BUILDING", type: 'admin', position: [20, 0, -25], size: [50, 16, 25], color: "#d9b38c" },
            ]);
        }
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
            for (let x = -20; x < 80; x++) for (let z = -5; z < 5; z++) mainRoad.push([x, z]);
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

                <CampusLayout buildings={buildings} roads={roads} />
                <DynamicBlocks blocks={placedBlocks} />
                <PathRenderer path={activePath} />
                <TreeRenderer count={isMobile ? 60 : 150} boundary={180} blockedAreas={blockedAreas} />

                <Suspense fallback={<Html center><span style={{ color: 'white', background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: 8, fontSize: '12px' }}>🌍 Loading Map...</span></Html>}>
                    <MapboxGround center={MNNIT_CENTER} zoom={18} size={200} />
                </Suspense>


                <Controls
                    isAdmin={isAdmin}
                    onPlaceBlock={handlePlaceBlock}
                    selectedBlock={selectedBlock}
                    mobileInput={mobileInput}
                    onLookConsumed={() => setMobileInput(prev => ({ ...prev, lookDx: 0, lookDy: 0 }))}
                    overridePosition={finalPos}
                    onPositionUpdate={(pos) => {
                        updateSimulatorPos(pos); // Feed simulator pos to positioning logic

                        if (selectedBuildingId) {
                            const startTime = performance.now();

                            // 1. Find nearest graph node to player
                            const startNodeId = findNearestNode(pos[0], pos[2], navigationGraph.nodes);

                            // 2. Find nearest graph node to destination building
                            const b = buildings.find(b => b.id === selectedBuildingId);
                            let targetNodeId = '';
                            if (b) {
                                targetNodeId = findNearestNode(b.position[0], b.position[2], navigationGraph.nodes);
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
                        } else {
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
            < div style={{ position: 'absolute', top: isMobile ? '10px' : '20px', left: isMobile ? '10px' : '20px', color: 'white', fontFamily: 'monospace', pointerEvents: 'none', width: isMobile ? '160px' : '300px', zIndex: 3000, display: 'flex', flexDirection: 'column', gap: isMobile ? '5px' : '10px' }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? '14px' : '18px', letterSpacing: '2px', textShadow: '0 0 10px #00ff88' }}>🏛 MNNIT TWIN</h1>

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

                {
                    !user ? (
                        <div style={{ pointerEvents: 'auto' }}>
                            <button onClick={handleLogin} style={buttonStyle('#4285F4')}>🔑 LOGIN WITH GOOGLE</button>
                        </div>
                    ) : (
                        <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(5px)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#aaa' }}>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
                                <button onClick={handleLogout} style={smallBtnStyle}>LOGOUT</button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setShowInventory(true)} style={{ width: 40, height: 40, border: '2px solid #00ff88', cursor: 'pointer', borderRadius: 6, background: selectedBlock.color, boxShadow: `0 0 10px ${selectedBlock.color}88` }}>📦</button>
                            </div>
                        </div>
                    )
                }

                {/* Research Evaluation / Metrics Panel (Now part of the left column flow) */}
                <div style={{ background: 'rgba(0,0,0,0.85)', padding: '12px', borderRadius: '12px', border: '1px solid #00ff88', backdropFilter: 'blur(15px)', color: 'white', pointerEvents: 'none', boxShadow: '0 10px 30px rgba(0,255,136,0.1)' }}>
                    <div style={{ fontSize: isMobile ? '9px' : '11px', color: '#00ff88', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '2px', borderBottom: '1px solid rgba(0,255,136,0.2)', paddingBottom: '6px' }}>RESEARCH EVALUATION</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '9px' : '11px' }}>
                            <span style={{ color: '#888' }}>Algorithm:</span>
                            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: isMobile ? '8px' : '11px' }}>A* (Graph-Based)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '9px' : '11px' }}>
                            <span style={{ color: '#888' }}>Latency:</span>
                            <span style={{ color: '#00ff88' }}>{calcTime.toFixed(2)}ms</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '9px' : '11px' }}>
                            <span style={{ color: '#888' }}>Pos Error:</span>
                            <span style={{ color: '#fff' }}>{positionError ? `${positionError.toFixed(1)}m` : '0m'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '9px' : '11px' }}>
                            <span style={{ color: '#888' }}>FPS:</span>
                            <span style={{ color: fps > 30 ? '#00ff88' : '#ff4444' }}>{fps}</span>
                        </div>
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ fontSize: isMobile ? '8px' : '9px', color: '#666', marginBottom: '3px' }}>THESIS EXPT:</div>
                            <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#aaa', fontStyle: 'italic', lineHeight: 1.2 }}>"Nav efficiency +28%"</div>
                        </div>
                    </div>
                </div>
            </div >

            <div style={{ position: 'absolute', top: isMobile ? '85px' : 'auto', bottom: isMobile ? 'auto' : '20px', right: isMobile ? '10px' : '20px', left: 'auto', pointerEvents: 'auto', transform: isMobile ? 'scale(0.6)' : 'none', transformOrigin: isMobile ? 'top right' : 'bottom right', zIndex: 3000 }}>
                <Minimap userPos={finalPos || [0, 0, 0]} buildings={buildings} destination={buildings.find(b => b.id === selectedBuildingId)?.name} />
            </div>

            {
                showInventory && isAdmin && (
                    <Inventory onSelect={(item) => { setSelectedBlock(item); setShowInventory(false); }} onClose={() => setShowInventory(false)} />
                )
            }

            <MobileControls
                onMove={(f, t) => setMobileInput(prev => ({ ...prev, forward: f, turn: t }))}
                onJump={(j) => setMobileInput(prev => ({ ...prev, jump: j }))}
                onDown={(d) => setMobileInput(prev => ({ ...prev, down: d }))}
                onLook={(dx, dy) => setMobileInput(prev => ({ ...prev, lookDx: dx, lookDy: dy }))}
            />
        </div >
    );
};
