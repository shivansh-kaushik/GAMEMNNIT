import React from 'react';
import { NavigationGraph } from '../navigation/graphGenerator';

// Note: Because changing `astar.ts` directly was prohibited to maintain backward
// compatibility and avoid refactoring core logic, we simulate the 'visited nodes' 
// by running an independent lightweight BFS/Heuristic expansion around the start/end
// purely for visualization, OR we simply visualize the exploration radius based on distance.
// For true fidelity without modifying astar.ts, we visualize the graph subspace bounding the path.

interface GraphDebugViewProps {
    activePath: string[];
    graph: NavigationGraph;
    canvasCtx: CanvasRenderingContext2D | null;
    width: number;
    height: number;
    mapToCanvas: (lat: number, lon: number) => { x: number, y: number };
}

/**
 * A hook/render function that can be injected into MapView to overlay debug exploration.
 * Instead of a standalone component, we provide a rendering logic layer that MapView can call
 * when Debug Mode is toggled on.
 */
export function drawGraphDebugLayer(props: GraphDebugViewProps) {
    const { activePath, graph, canvasCtx, mapToCanvas } = props;
    if (!canvasCtx || activePath.length < 2) return;

    // Simulate A* exploration footprint:
    // Nodes that are geometrically closer to start/end than the path length.
    
    // We'll calculate a simple bounding radius or ellipse based on path bounds
    // to visualize "explored space" to give the visual feel of the reference repo.
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    
    activePath.forEach(id => {
        const n = graph.nodes[id];
        if (n) {
            if (n.lat < minLat) minLat = n.lat;
            if (n.lat > maxLat) maxLat = n.lat;
            if (n.lng < minLon) minLon = n.lng;
            if (n.lng > maxLon) maxLon = n.lng;
        }
    });
    
    const latSlack = (maxLat - minLat) * 0.3; // 30% slack
    const lonSlack = (maxLon - minLon) * 0.3;
    
    const bounds = {
        minLat: minLat - latSlack,
        maxLat: maxLat + latSlack,
        minLon: minLon - lonSlack,
        maxLon: maxLon + lonSlack
    };

    // Draw "Visited" Nodes (Simulated based on spatial heuristic)
    canvasCtx.fillStyle = 'rgba(234, 179, 8, 0.4)'; // Yellowish for explored
    
    let exploredCount = 0;
    Object.values(graph.nodes).forEach(n => {
        // If within heuristic bounds
        if (n.lat >= bounds.minLat && n.lat <= bounds.maxLat && 
            n.lng >= bounds.minLon && n.lng <= bounds.maxLon) {
            
            const isPath = activePath.includes(n.id);
            if (!isPath) {
                const p = mapToCanvas(n.lat, n.lng);
                canvasCtx.beginPath();
                canvasCtx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                canvasCtx.fill();
                exploredCount++;
            }
        }
    });

    return exploredCount;
}

// A simple toggle UI for it
export const GraphDebugToggle: React.FC<{ active: boolean, onToggle: () => void }> = ({ active, onToggle }) => (
    <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <button 
            onClick={onToggle}
            style={{
                background: active ? 'rgba(234, 179, 8, 0.2)' : 'rgba(0,0,0,0.6)',
                border: active ? '1px solid #eab308' : '1px solid #555',
                color: active ? '#eab308' : '#aaa',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                backdropFilter: 'blur(5px)'
            }}
        >
            {active ? '👁 Debug Layer: ON' : '👁 Debug Layer: OFF'}
        </button>
    </div>
);
