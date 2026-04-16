import re

with open('src/pages/ARPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports
imports_chunk = """import { Canvas, useFrame } from '@react-three/fiber';
import { DeviceOrientationControls } from '@react-three/drei';
import * as THREE from 'three';

"""
content = re.sub(r"(import React.*?;\n)", r"\1" + imports_chunk, content, count=1)

# 2. Add AROverlayScene Component Before ARPageProps
scene_component = """
/**
 * AROverlayScene — React Three Fiber 3D Visualization
 * Handles rendering of Path Waypoints and the dynamic Confidence Cone.
 */
const AROverlayScene: React.FC<{ waypoints: ARNavWaypoint[], sensors: ARSensors, headingOffset: number, error: number, confidence: string }> = ({ waypoints, sensors, headingOffset, error, confidence }) => {
    const groupRef = useRef<THREE.Group>(null);
    const coneRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (coneRef.current && waypoints.length > 0) {
            const nextWP = waypoints[Math.min(1, waypoints.length - 1)];
            // Points exactly at the next coordinate
            coneRef.current.lookAt(nextWP.x, -1.0, -nextWP.z);
        }
    });

    // Thesis: Confidence Cone parameters (theta bounds driven by uncertainty)
    const baseRadius = 0.4;
    const dynamicSpread = Math.max(0.1, error * 0.4); // High error = wide cone
    const coneOpacity = Math.max(0.1, 0.8 - (error * 0.05)); // High error = faint, low = solid
    
    // Geographic North (+lat) maps to -Z in Three.js conventionally
    return (
        <>
            <DeviceOrientationControls />
            <ambientLight intensity={0.8} />
            <directionalLight position={[0, 10, 0]} intensity={1.5} />
            
            <group ref={groupRef} rotation={[0, THREE.MathUtils.degToRad(headingOffset), 0]}>
                {/* Render Future Waypoints as Glowing Orbs */}
                {waypoints.slice(0, 5).map((wp, i) => {
                    const scale = Math.max(0.3, 1 - i * 0.15);
                    return (
                        <mesh key={i} position={[wp.x, -1.5, -wp.z]}>
                            <sphereGeometry args={[scale, 16, 16]} />
                            <meshStandardMaterial 
                                color={i === waypoints.length - 1 ? "#ef4444" : "#00ff88"} 
                                transparent opacity={0.8 - i * 0.1} 
                                emissive={i === waypoints.length - 1 ? "#ef4444" : "#00ff88"}
                                emissiveIntensity={0.6}
                            />
                        </mesh>
                    );
                })}

                {/* The Confidence Cone (Uncertainty-Gated Perception) */}
                {waypoints.length > 0 && (
                    <mesh ref={coneRef} position={[0, -1, 0]}>
                        <cylinderGeometry args={[dynamicSpread, baseRadius, 6, 32]} />
                        <meshBasicMaterial 
                            color={confidence === 'Recalculating' ? "#ef4444" : confidence === 'Slightly Off' ? "#eab308" : "#00ff88"}
                            transparent 
                            opacity={coneOpacity} 
                            blending={THREE.AdditiveBlending} 
                            depthWrite={false}
                        />
                    </mesh>
                )}
            </group>
        </>
    );
};

"""
content = content.replace("interface ARPageProps {", scene_component + "interface ARPageProps {")

# 3. Remove the entire useEffect drawing block.
# We find:
#    // ---------- Canvas AR overlay ----------
#    useEffect(() => {
#        if (!arActive || !canvasRef.current || !videoRef.current) return;
# ...
#    }, [arActive, waypoints, sensors, destId, distanceLeft]);
canvas_draw_pattern = re.compile(
    r"\s*// ---------- Canvas AR overlay ----------.*?animRef\.current = requestAnimationFrame\(draw\);\n\s*return \(\) => .*?cancelAnimationFrame.*\n\s*\}, \[arActive, waypoints, sensors, destId, distanceLeft\]\);\n",
    re.DOTALL
)
content = canvas_draw_pattern.sub("\n", content)

# 4. Replace the <canvas> markup with <Canvas> and the HTML UI
html_ui = """
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                        <Canvas camera={{ position: [0, 1.5, 0] }} style={{ pointerEvents: 'none' }}>
                            <AROverlayScene waypoints={waypoints} sensors={sensors} headingOffset={headingOffset} error={debugInfo.error} confidence={confidence} />
                        </Canvas>
                    </div>

                    {/* Ported Canvas Destination Label and Error Code */}
                    {arActive && destId && distanceLeft !== null && (
                        <div style={{ position: 'absolute', top: '100px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', zoom: isMobile ? 0.8 : 1 }}>
                            <div style={{ background: 'rgba(0,0,0,0.7)', border: '1.5px solid #00ff88', borderRadius: '8px', padding: '12px 24px', textAlign: 'center', marginBottom: '8px' }}>
                                <div style={{ color: '#00ff88', fontSize: '18px', fontWeight: 'bold' }}>{CAMPUS_BUILDINGS.find(b => b.id === destId)?.name}</div>
                                <div style={{ color: '#aaa', fontSize: '13px', marginTop: '4px' }}>{Math.round(distanceLeft)} m away</div>
                            </div>
                            
                            <div style={{ background: 'rgba(0,0,0,0.8)', padding: '4px 16px', borderRadius: '12px', color: confidence === 'Recalculating' ? '#ef4444' : confidence === 'Slightly Off' ? '#eab308' : '#00ff88', fontSize: '12px', fontWeight: 'bold' }}>
                                {confidence}
                            </div>
                        </div>
                    )}
                    
                    {sensors && sensors.gpsLat === 25.4920 && sensors.gpsLon === 81.8670 && (
                        <div style={{ position: 'absolute', top: '200px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(239,68,68,0.9)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', zIndex: 10, pointerEvents: 'none' }}>
                            Poor GPS accuracy. Move to open area.
                        </div>
                    )}
"""

# Replace the single canvas tag
content = re.sub(
    r"\{/\* AR Canvas overlay \*/\}\s*<canvas.*?/>",
    html_ui,
    content,
    flags=re.DOTALL
)

with open('src/pages/ARPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patching complete.")
