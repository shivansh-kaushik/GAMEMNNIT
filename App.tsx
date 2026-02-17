
import React, { useState, useCallback, Suspense, useMemo } from 'react';
import { Canvas, ThreeElements } from '@react-three/fiber';
import { Sky, OrbitControls, ContactShadows, Environment, Loader } from '@react-three/drei';
import { Compass, MapPin, RefreshCw, Trophy, Clock, Ruler, Info, Activity, Radio, Loader2, Navigation2, Crosshair } from 'lucide-react';
import Scene from './components/Scene';
import MobileControls from './components/MobileControls';
import CampusEnvironment from './components/CampusEnvironment';
import WifiScanner from './components/WifiScanner';
import ResultsDashboard from './components/ResultsDashboard';
import { MISSIONS, CAMPUS_BUILDINGS } from './constants';
import { RSSIReading, NavigationState } from './types';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements { }
  }
}

const LoadingOverlay = () => (
  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-[100] text-center p-8">
    <div className="relative mb-6">
      <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
      <Loader2 className="w-16 h-16 text-blue-500 animate-spin relative z-10" />
    </div>
    <h2 className="text-2xl font-black text-white mb-2 tracking-[0.2em] uppercase">MNNIT Spatial Engine</h2>
    <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mb-4">
      <div className="h-full bg-blue-500 animate-[loading_2s_ease-in-out_infinite]"></div>
    </div>
    <p className="text-slate-500 text-xs font-mono max-w-xs">Calibrating RSSI Floor Detection & AR Overlay Assets...</p>
    <style>{`
      @keyframes loading {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  </div>
);

const MiniMap = ({ playerPos, buildings }: { playerPos: [number, number, number], buildings: any[] }) => {
  return (
    <div className="w-40 h-40 bg-slate-900/80 border border-slate-700 rounded-xl relative overflow-hidden shadow-2xl backdrop-blur-sm">
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:10px_10px]"></div>
      {buildings.map(b => (
        <div
          key={b.id}
          className="absolute bg-slate-600 border border-slate-500"
          style={{
            width: b.size[0] / 2,
            height: b.size[2] / 2,
            left: `calc(50% + ${b.position[0] / 2}px - ${b.size[0] / 4}px)`,
            top: `calc(50% + ${b.position[2] / 2}px - ${b.size[2] / 4}px)`,
          }}
        />
      ))}
      <div
        className="absolute w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_8px_#3b82f6] transition-all duration-100"
        style={{
          left: `calc(50% + ${playerPos[0] / 2}px - 4px)`,
          top: `calc(50% + ${playerPos[2] / 2}px - 4px)`,
        }}
      />
      <div className="absolute bottom-1 right-1 text-[8px] font-black text-slate-500 uppercase">MNNIT Map</div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeMissionIndex, setActiveMissionIndex] = useState<number>(-1);
  const [researchMode, setResearchMode] = useState(true);
  const [wifiReadings, setWifiReadings] = useState<RSSIReading[]>([]);
  const [playerCoords, setPlayerCoords] = useState<[number, number, number]>([0, 0, 0]);
  const [navState, setNavState] = useState<NavigationState>({
    currentBuildingId: null,
    startTime: null,
    endTime: null,
    distanceTraveled: 0,
    isComplete: false,
    detectedFloor: 0,
    fingerprintConfidence: 0
  });
  const [gameStarted, setGameStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mobileInput, setMobileInput] = useState({
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    vertical: 0
  });

  const startMission = (index: number) => {
    setActiveMissionIndex(index);
    setNavState({
      ...navState,
      currentBuildingId: MISSIONS[index].targetId,
      startTime: Date.now(),
      endTime: null,
      distanceTraveled: 0,
      isComplete: false,
    });
    setGameStarted(true);
    setShowResults(false);
  };

  const handleWifiUpdate = (readings: RSSIReading[], floor: number, confidence: number) => {
    setWifiReadings(readings);
    setNavState(prev => ({ ...prev, detectedFloor: floor, fingerprintConfidence: confidence }));
  };

  const completeMission = useCallback(() => {
    setNavState(prev => ({ ...prev, endTime: Date.now(), isComplete: true }));
    setTimeout(() => setShowResults(true), 1500);
  }, []);

  const resetSimulator = () => {
    setActiveMissionIndex(-1);
    setGameStarted(false);
    setShowResults(false);
    setNavState({
      currentBuildingId: null, startTime: null, endTime: null,
      distanceTraveled: 0, isComplete: false, detectedFloor: 0, fingerprintConfidence: 0
    });
  };

  const targetBuilding = activeMissionIndex >= 0
    ? CAMPUS_BUILDINGS.find(b => b.id === MISSIONS[activeMissionIndex].targetId)
    : null;


  // Optimization: Throttle HUD updates to avoid 60fps React re-renders which freeze the app
  const lastUpdateRef = React.useRef(0);
  const handlePositionUpdate = useCallback((pos: [number, number, number]) => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 200) { // Update 5 times a second max
      setPlayerCoords(pos);
      lastUpdateRef.current = now;
    }
  }, []);

  // Calculate distance to target for HUD
  const distanceToTarget = useMemo(() => {
    if (!targetBuilding) return null;
    const dx = playerCoords[0] - targetBuilding.position[0];
    const dz = playerCoords[2] - targetBuilding.position[2];
    return Math.sqrt(dx * dx + dz * dz);
  }, [playerCoords, targetBuilding]);

  // Handlers for Mobile Controls
  const handleMobileMove = useCallback((x: number, y: number) => {
    setMobileInput(prev => ({ ...prev, move: { x, y } }));
  }, []);

  const handleMobileLook = useCallback((dx: number, dy: number) => {
    setMobileInput(prev => ({ ...prev, look: { x: dx, y: dy } }));
  }, []);

  const handleMobileVertical = useCallback((val: number) => {
    setMobileInput(prev => ({ ...prev, vertical: val }));
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-950 font-sans text-slate-200 selection:bg-blue-500/30">
      {/* Mobile Controls Layer */}
      {gameStarted && (
        <MobileControls
          onMove={handleMobileMove}
          onLook={handleMobileLook}
          onVertical={handleMobileVertical}
        />
      )}

      <Canvas shadows camera={{ position: [0, 15, 20], fov: 60, far: 10000 }}>
        <Sky sunPosition={[100, 20, 100]} turbidity={0.05} rayleigh={0.5} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[50, 50, 25]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
        <color attach="background" args={['#0f172a']} />

        {/* Always render the campus environment */}
        <CampusEnvironment targetBuildingId={targetBuilding?.id} />

        {gameStarted && (
          <Scene
            targetBuilding={targetBuilding || undefined}
            onReached={completeMission}
            isComplete={navState.isComplete}
            researchMode={researchMode}
            onWifiUpdate={handleWifiUpdate}
            onMove={(dist) => {
              setNavState(prev => ({ ...prev, distanceTraveled: prev.distanceTraveled + dist }));
            }}
            onPositionUpdate={handlePositionUpdate}
            mobileInput={mobileInput}
            onMobileLookConsumed={() => setMobileInput(prev => ({ ...prev, look: { x: 0, y: 0 } }))}
          />
        )}


        {!gameStarted && <OrbitControls autoRotate autoRotateSpeed={0.5} />}
        {/* <ContactShadows resolution={1024} scale={150} blur={2.5} opacity={0.6} far={20} color="#000000" /> */}
      </Canvas>

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 overflow-hidden">
        {/* Top Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-5 rounded-2xl shadow-2xl border-l-4 border-l-blue-500">
            <h1 className="text-xl font-black flex items-center gap-3 tracking-tight text-white uppercase">
              <Navigation2 className="text-blue-500 w-6 h-6 rotate-45" />
              MNNIT Smart-Nav
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> System Active
              </span>
              <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Thesis v2.4</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-end">
            <div className="flex gap-2">
              <button
                onClick={() => setResearchMode(!researchMode)}
                className={`px-4 py-2 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black tracking-widest ${researchMode ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
              >
                <Activity className="w-4 h-4" /> {researchMode ? 'RESEARCH VIEW' : 'USER VIEW'}
              </button>
            </div>

            {gameStarted && researchMode && (
              <WifiScanner readings={wifiReadings} detectedFloor={navState.detectedFloor} confidence={navState.fingerprintConfidence} />
            )}
          </div>
        </div>

        {/* HUD Elements */}
        {gameStarted && !showResults && (
          <>
            <div className="absolute top-32 left-6 flex flex-col gap-4 pointer-events-auto">
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl shadow-xl min-w-[220px]">
                <div className="text-[9px] uppercase text-slate-500 font-black mb-1 tracking-widest flex items-center gap-1">
                  <Crosshair className="w-3 h-3" /> Spatial Target
                </div>
                <div className="text-lg font-black text-white">{targetBuilding?.name}</div>

                {/* Distance to Target Display */}
                {distanceToTarget !== null && (
                  <div className="my-2 p-2 bg-blue-500/10 rounded border border-blue-500/30 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-blue-400 uppercase">Distance to Target</span>
                    <span className="text-sm font-mono font-black text-white">{distanceToTarget.toFixed(1)}m</span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between">
                  <div>
                    <div className="text-[8px] uppercase text-slate-500 font-bold">Odometer</div>
                    <div className="text-sm font-mono text-slate-400">{navState.distanceTraveled.toFixed(1)}m</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] uppercase text-slate-500 font-bold">Elapsed</div>
                    <div className="text-sm font-mono text-green-400">{((Date.now() - (navState.startTime || 0)) / 1000).toFixed(1)}s</div>
                  </div>
                </div>
              </div>

              {researchMode && <MiniMap playerPos={playerCoords} buildings={CAMPUS_BUILDINGS} />}
            </div>

            <div className="absolute bottom-28 left-6 pointer-events-auto hidden md:block">
              <div className="bg-slate-900/50 border border-slate-700/30 p-3 rounded-lg text-[9px] font-mono text-slate-400 space-y-1">
                <div className="text-blue-400 font-black mb-1 uppercase tracking-tighter">Research Input Log</div>
                <div>$ WASD :: POS_X_Z_DELTA</div>
                <div>$ SPACE :: ALTITUDE_UP</div>
                <div>$ SHIFT :: ALTITUDE_DOWN</div>
                <div>$ CLOCK :: {Date.now()}</div>
              </div>
            </div>
          </>
        )}

        {/* Footer Mission Selector */}
        <div className="flex justify-center w-full pointer-events-auto">
          {!gameStarted ? (
            <div className="bg-slate-900/95 p-8 rounded-3xl border border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-5xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">Simulation Environment</h2>
                  <p className="text-slate-500 text-xs font-medium">Evaluate the hybrid positioning algorithm via designated campus missions.</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Radio className="text-blue-500 animate-pulse w-6 h-6" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {MISSIONS.map((m, idx) => (
                  <button
                    key={m.id}
                    onClick={() => startMission(idx)}
                    className="flex flex-col items-center gap-4 p-6 bg-slate-800/40 hover:bg-blue-900/20 hover:border-blue-500/50 transition-all rounded-2xl border border-slate-700 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                      <MapPin className="w-12 h-12" />
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500 transition-all duration-300">
                      <MapPin className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-xs font-black text-center leading-tight uppercase tracking-tight group-hover:text-blue-400 transition-colors">{m.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={resetSimulator}
              className="bg-slate-800/90 hover:bg-slate-700 backdrop-blur-md px-10 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-2xl border border-slate-600 mb-8 font-black uppercase text-xs tracking-widest"
            >
              <RefreshCw className="w-5 h-5 text-blue-400" /> End Mission & Recalibrate
            </button>
          )}
        </div>
      </div>

      {navState.isComplete && !showResults && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-[110]">
          <div className="bg-slate-900 p-16 rounded-[3rem] border border-blue-500/30 text-center animate-in fade-in zoom-in duration-700 shadow-[0_0_100px_rgba(59,130,246,0.15)]">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 animate-pulse"></div>
              <Trophy className="w-24 h-24 text-yellow-400 mx-auto relative z-10" />
            </div>
            <h2 className="text-6xl font-black text-white mb-3 tracking-tighter">DATA LOCKED</h2>
            <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-xs">Processing Navigation Efficiency Matrix</p>
          </div>
        </div>
      )}

      {showResults && (
        <ResultsDashboard
          navState={navState}
          targetBuilding={targetBuilding!}
          onRestart={resetSimulator}
        />
      )}
    </div>
  );
};

export default App;
