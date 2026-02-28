import React, { useState, useCallback, useEffect, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Html } from '@react-three/drei';
import { CampusLayout } from '../three/CampusLayout';
import { DynamicBlocks } from '../three/DynamicBlocks';
import { PathRenderer } from '../three/PathRenderer';
import { Controls } from '../three/Controls';
import { Inventory, InventoryItem } from '../components/Inventory';
import { Pathfinder, PathNode } from '../navigation/Pathfinder';
import { MapboxGround } from '../three/MapboxGround';
import { TreeRenderer } from '../three/TreeRenderer';
import { Minimap } from '../three/Minimap';
import { MNNIT_CENTER, latLngToVoxel } from '../core/GISUtils';
import { useGPSTracking } from '../sensors/GPSTracker';
import { account, databases, DB_ID, BLOCKS_COLLECTION_ID, BUILDINGS_COLLECTION_ID, ROADS_COLLECTION_ID } from '../core/appwrite';
import { ID, Models } from 'appwrite';
import { MobileControls } from '../components/MobileControls';
import { BuildingData, BuildingRecord, RoadRecord } from '../../types';

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
    const [gpsEnabled, setGpsEnabled] = useState(false);

    const { position: gpsPos, error: gpsError } = useGPSTracking(gpsEnabled);

    const [activePath, setActivePath] = useState<PathNode[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const navigationGrid = useMemo(() => {
        const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill("B"));
        const offset = Math.floor(GRID_SIZE / 2);

        roads.forEach(([rx, rz]) => {
            const x = Math.round(rx + offset);
            const z = Math.round(rz + offset);
            if (x >= 0 && x < GRID_SIZE && z >= 0 && z < GRID_SIZE) {
                grid[z][x] = "R";
            }
        });

        buildings.forEach(b => {
            for (let dx = 0; dx < b.size[0]; dx++) {
                for (let dz = 0; dz < b.size[2]; dz++) {
                    const x = Math.round(b.position[0] + dx + offset);
                    const z = Math.round(b.position[2] + dz + offset);
                    if (x >= 0 && x < GRID_SIZE && z >= 0 && z < GRID_SIZE) {
                        grid[z][x] = "B";
                    }
                }
            }
        });

        return grid;
    }, [buildings, roads]);

    const pathfinder = useMemo(() => new Pathfinder(navigationGrid), [navigationGrid]);

    const blockedAreas = useMemo(() =>
        buildings.map(b => ({ position: b.position, size: b.size })),
        [buildings]);

    useEffect(() => {
        account.get()
            .then((u) => { setUser(u); setIsAdmin(true); })
            .catch(() => { setUser(null); setIsAdmin(false); });
    }, []);

    const handleLogin = async () => {
        account.createOAuth2Session(
            'google' as any,
            `${window.location.origin}`,
            `${window.location.origin}`
        );
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
                const voxelPos = latLngToVoxel(doc.lat, doc.lng);
                return {
                    id: doc.$id,
                    name: doc.name,
                    type: doc.type,
                    position: voxelPos,
                    size: [doc.width, doc.height, doc.depth],
                    color: doc.color,
                };
            });
            setBuildings(mapped);
        } catch (e) {
            console.warn('Buildings collection error:', e);
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
            console.warn('Roads collection error:', e);
            const mainRoad: [number, number][] = [];
            for (let x = 0; x < 100; x++) {
                for (let z = -5; z < 5; z++) {
                    mainRoad.push([x - 20, z]);
                }
            }
            setRoads(mainRoad);
        }
    }, []);

    const fetchBlocks = useCallback(async () => {
        try {
            const res = await databases.listDocuments(DB_ID, BLOCKS_COLLECTION_ID);
            const mapped = res.documents.map((d) => ({
                id: d.$id,
                position: JSON.parse(d.position) as [number, number, number],
                type: d.type as 'B' | 'R',
                color: d.color,
            }));
            setPlacedBlocks(mapped);
        } catch (e) {
            console.warn('Appwrite DB blocks error:', e);
        }
    }, []);

    useEffect(() => {
        fetchBuildings();
        fetchRoads();
        fetchBlocks();
    }, [fetchBuildings, fetchRoads, fetchBlocks]);

    const handlePlaceBlock = useCallback(async (position: [number, number, number]) => {
        if (!isAdmin) return;
        try {
            await databases.createDocument(DB_ID, BLOCKS_COLLECTION_ID, ID.unique(), {
                position: JSON.stringify(position),
                type: selectedBlock.type,
                color: selectedBlock.color,
            });
            fetchBlocks();
        } catch (e) {
            console.error('Error placing block:', e);
        }
    }, [isAdmin, selectedBlock, fetchBlocks]);


    const buttonStyle = (bg: string, color = 'white') => ({
        padding: '7px 14px', borderRadius: '5px', border: 'none',
        background: bg, color, cursor: 'pointer', fontWeight: 'bold' as const, fontSize: '10px', letterSpacing: '0.5px'
    });
    const smallBtnStyle = {
        padding: '2px 6px', borderRadius: '4px', border: '1px solid #555',
        background: 'rgba(0,0,0,0.4)', color: '#aaa', cursor: 'pointer', fontSize: '9px'
    };
    const navBtnStyle = {
        padding: '5px 8px', textAlign: 'left' as const, fontSize: '10px',
        border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', borderRadius: '3px',
        transition: 'all 0.15s',
    };

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', touchAction: 'none' }}>
            <Canvas shadows camera={{ position: [20, 30, 60], fov: 60 }}>
                <Sky sunPosition={[100, 20, 100]} />
                <ambientLight intensity={0.5} />
                <hemisphereLight intensity={0.5} groundColor="#444444" />
                <directionalLight position={[50, 100, 50]} intensity={1.5} castShadow shadow-mapSize={[4096, 4096]} />

                <CampusLayout buildings={buildings} roads={roads} />
                <DynamicBlocks blocks={placedBlocks} />
                <PathRenderer path={activePath} />
                <TreeRenderer
                    count={150}
                    boundary={180}
                    blockedAreas={blockedAreas}
                />

                <Suspense fallback={<Html center><span style={{ color: 'white', background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: 8 }}>🌍 Loading Map...</span></Html>}>
                    <MapboxGround center={MNNIT_CENTER} zoom={18} size={200} />
                </Suspense>

                {/* GPS Blue Dot in 3D */}
                {gpsPos && (
                    <mesh position={[gpsPos[0], gpsPos[1] + 1, gpsPos[2]]}>
                        <sphereGeometry args={[0.5, 32, 32]} />
                        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2} />
                        <pointLight color="#3b82f6" intensity={2} distance={10} />
                        <Html center distanceFactor={15}>
                            <div style={{ color: '#3b82f6', background: 'rgba(255,255,255,0.8)', padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>YOU</div>
                        </Html>
                    </mesh>
                )}

                <Controls
                    isAdmin={isAdmin}
                    onPlaceBlock={handlePlaceBlock}
                    selectedBlock={selectedBlock}
                    mobileInput={mobileInput}
                    onLookConsumed={() => setMobileInput(prev => ({ ...prev, lookDx: 0, lookDy: 0 }))}
                    overridePosition={gpsEnabled ? gpsPos : null}
                    onPositionUpdate={(pos) => {
                        const activeDestId = selectedBuildingId;
                        if (activeDestId) {
                            const b = buildings.find(b => b.id === activeDestId);
                            if (b) {
                                const offset = Math.floor(GRID_SIZE / 2);
                                let targetX = b.position[0] + Math.floor(b.size[0] / 2);
                                let targetZ = b.position[2] + Math.floor(b.size[2] / 2);
                                let nearestX = Math.round(targetX) + offset;
                                let nearestZ = Math.round(targetZ) + offset;
                                if (navigationGrid[nearestZ]?.[nearestX] !== "R") {
                                    let found = false;
                                    for (let r = 1; r < 10 && !found; r++) {
                                        for (let dx = -r; dx <= r && !found; dx++) {
                                            for (let dz = -r; dz <= r && !found; dz++) {
                                                const nx = nearestX + dx;
                                                const nz = nearestZ + dz;
                                                if (navigationGrid[nz]?.[nx] === "R") {
                                                    nearestX = nx;
                                                    nearestZ = nz;
                                                    found = true;
                                                }
                                            }
                                        }
                                    }
                                }
                                const path = pathfinder.findPath(
                                    Math.round(pos[0]) + offset, Math.round(pos[2]) + offset,
                                    nearestX, nearestZ
                                );
                                setActivePath(path.map(n => ({ ...n, x: n.x - offset, z: n.z - offset })));
                            }
                        } else {
                            setActivePath([]);
                        }
                    }}
                />
            </Canvas>

            <div style={{ position: 'absolute', top: '20px', left: '20px', color: 'white', fontFamily: '"Courier New", monospace', pointerEvents: 'none', width: '300px' }}>
                <h1 style={{ margin: 0, fontSize: '18px', letterSpacing: '2px', textShadow: '0 0 10px #00ff88' }}>
                    🏛 VOXEL WORLD
                </h1>
                <div style={{ pointerEvents: 'auto', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {!user ? (
                        <button onClick={handleLogin} style={buttonStyle('#4285F4')}>
                            🔑 LOGIN
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#aaa' }}>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
                                <button onClick={handleLogout} style={smallBtnStyle}>LOGOUT</button>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => setGpsEnabled(!gpsEnabled)} style={buttonStyle(gpsEnabled ? '#00cc44' : '#555', gpsEnabled ? '#000' : '#fff')}>
                                    📍 GPS {gpsEnabled ? 'ON' : 'OFF'}
                                </button>
                                <div onClick={() => setShowInventory(true)} style={{ width: 36, height: 36, background: selectedBlock.color, border: '2px solid #ffcc00', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, borderRadius: 4 }}>
                                    INV
                                </div>
                            </div>
                            {gpsError && <div style={{ color: '#ff5555', fontSize: 10 }}>⚠ {gpsError}</div>}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: '100px', left: '20px', pointerEvents: 'auto' }}>
                <Minimap userPos={[0, 0, 0]} buildings={buildings} destination={buildings.find(b => b.id === selectedBuildingId)?.name} />
            </div>

            {showInventory && isAdmin && (
                <Inventory onSelect={(item) => { setSelectedBlock(item); setShowInventory(false); }} onClose={() => setShowInventory(false)} />
            )}

            <MobileControls
                onMove={(f, t) => setMobileInput(prev => ({ ...prev, forward: f, turn: t }))}
                onJump={(j) => setMobileInput(prev => ({ ...prev, jump: j }))}
                onDown={(d) => setMobileInput(prev => ({ ...prev, down: d }))}
                onLook={(dx, dy) => setMobileInput(prev => ({ ...prev, lookDx: dx, lookDy: dy }))}
            />
        </div>
    );
};
