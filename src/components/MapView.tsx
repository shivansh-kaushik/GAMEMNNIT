import React, { useEffect, useRef, useMemo, useState } from 'react';
import { NavigationGraph } from '../navigation/graphGenerator';

interface MapViewProps {
    graph: NavigationGraph;
    activePath: string[]; // Node IDs in the shortest path
    width: number;
    height: number;
    userLat?: number;
    userLon?: number;
    userFloor?: number;
    debugMode?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({ graph, activePath, width, height, userLat, userLon, userFloor, debugMode = false }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Compute bounding box for the graph to scale it correctly on canvas
    const { minLat, maxLat, minLon, maxLon } = useMemo(() => {
        let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
        Object.values(graph.nodes).forEach(n => {
            if (n.lat < minLat) minLat = n.lat;
            if (n.lat > maxLat) maxLat = n.lat;
            if (n.lng < minLon) minLon = n.lng;
            if (n.lng > maxLon) maxLon = n.lng;
        });
        return { minLat, maxLat, minLon, maxLon };
    }, [graph]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        const padding = 40;
        const drawW = width - padding * 2;
        const drawH = height - padding * 2;

        const mapToCanvas = (lat: number, lon: number) => {
            const x = padding + ((lon - minLon) / (maxLon - minLon || 1)) * drawW;
            const y = height - (padding + ((lat - minLat) / (maxLat - minLat || 1)) * drawH);
            return { x, y };
        };

        // Compute simulated explored nodes for animation
        let exploredNodesList: string[] = [];
        if (debugMode && activePath.length > 0) {
             const startNode = graph.nodes[activePath[0]];
             let pMinLat = Infinity, pMaxLat = -Infinity, pMinLon = Infinity, pMaxLon = -Infinity;
             activePath.forEach(id => {
                 const n = graph.nodes[id];
                 if (n) {
                     if (n.lat < pMinLat) pMinLat = n.lat;
                     if (n.lat > pMaxLat) pMaxLat = n.lat;
                     if (n.lng < pMinLon) pMinLon = n.lng;
                     if (n.lng > pMaxLon) pMaxLon = n.lng;
                 }
             });
             const latSlack = (pMaxLat - pMinLat) * 0.3;
             const lonSlack = (pMaxLon - pMinLon) * 0.3;
             const bounds = {
                 minLat: pMinLat - latSlack, maxLat: pMaxLat + latSlack,
                 minLon: pMinLon - lonSlack, maxLon: pMaxLon + lonSlack
             };
             
             // Gather nodes in bounds and sort by distance to start (simulating BFS/A* expansion)
             const candidates = Object.values(graph.nodes).filter(n => 
                 n.lat >= bounds.minLat && n.lat <= bounds.maxLat && 
                 n.lng >= bounds.minLon && n.lng <= bounds.maxLon &&
                 !activePath.includes(n.id)
             );
             if (startNode) {
                 candidates.sort((a, b) => {
                     const da = Math.pow(a.lat - startNode.lat, 2) + Math.pow(a.lng - startNode.lng, 2);
                     const db = Math.pow(b.lat - startNode.lat, 2) + Math.pow(b.lng - startNode.lng, 2);
                     return da - db;
                 });
             }
             exploredNodesList = candidates.map(n => n.id);
        }

        // Draw edges fainter
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        const drawnEdges = new Set<string>();
        Object.entries(graph.edges).forEach(([nodeId, neighbors]) => {
            const n1 = graph.nodes[nodeId];
            if (!n1) return;
            const p1 = mapToCanvas(n1.lat, n1.lng);
            
            neighbors.forEach(neighborId => {
                const edgeKey = [nodeId, neighborId].sort().join('-');
                if (drawnEdges.has(edgeKey)) return;
                drawnEdges.add(edgeKey);
                
                const n2 = graph.nodes[neighborId];
                if (!n2) return;
                const p2 = mapToCanvas(n2.lat, n2.lng);
                
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            });
        });

        // Draw nodes fainter
        ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
        Object.values(graph.nodes).forEach(n => {
            const p = mapToCanvas(n.lat, n.lng);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Animation logic
        let currentExploredCount = 0;
        let animationFrameId: number;
        let pathDrawProgress = 0;
        
        const renderFrame = () => {
            // Draw Explored Nodes (simulating expansion)
            if (debugMode && exploredNodesList.length > 0) {
                const nodesToDraw = exploredNodesList.slice(0, currentExploredCount);
                ctx.fillStyle = 'rgba(234, 179, 8, 0.8)'; // Bright yellow for explored
                nodesToDraw.forEach(id => {
                    const n = graph.nodes[id];
                    if (n) {
                        const p = mapToCanvas(n.lat, n.lng);
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
                
                if (currentExploredCount < exploredNodesList.length) {
                    currentExploredCount += Math.max(1, Math.floor(exploredNodesList.length / 30)); // Animate quickly (~30 frames)
                    animationFrameId = requestAnimationFrame(renderFrame);
                    return; // Wait until explored nodes are done before drawing path
                }
            }

            // Draw Active Path organically (from start to end)
            if (activePath.length > 0) {
                ctx.strokeStyle = '#00ff88'; // Final path green
                ctx.lineWidth = 4;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                
                const nodesToDraw = activePath.slice(0, Math.floor(pathDrawProgress) + 1);
                
                if (nodesToDraw.length > 0) {
                    ctx.beginPath();
                    nodesToDraw.forEach((nodeId, idx) => {
                        const n = graph.nodes[nodeId];
                        if (!n) return;
                        const p = mapToCanvas(n.lat, n.lng);
                        if (idx === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    });
                    ctx.stroke();
                }

                if (pathDrawProgress < activePath.length) {
                    pathDrawProgress += Math.max(0.5, activePath.length / 20); // Animate path in ~20 frames
                    animationFrameId = requestAnimationFrame(renderFrame);
                    return;
                }
                
                // Finally, Draw Start and End Highlights
                const startNode = graph.nodes[activePath[0]];
                const endNode = graph.nodes[activePath[activePath.length - 1]];
                
                if (startNode) {
                    const p = mapToCanvas(startNode.lat, startNode.lng);
                    ctx.fillStyle = '#3b82f6';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
                if (endNode) {
                    const p = mapToCanvas(endNode.lat, endNode.lng);
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
            
            // Draw User Position if available
            if (userLat !== undefined && userLon !== undefined) {
                 const p = mapToCanvas(userLat, userLon);
                 ctx.fillStyle = '#f59e0b';
                 ctx.beginPath();
                 ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
                 ctx.fill();
                 
                 ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
                 ctx.lineWidth = 2;
                 ctx.beginPath();
                 ctx.arc(p.x, p.y, 10 + Math.sin(Date.now() / 200) * 2, 0, Math.PI * 2);
                 ctx.stroke();

                 if (userFloor !== undefined) {
                     ctx.fillStyle = '#fff';
                     ctx.font = 'bold 10px Inter, sans-serif';
                     ctx.textAlign = 'center';
                     const floorLabel = userFloor === 0 ? 'GF' : `F${userFloor}`;
                     ctx.fillText(floorLabel, p.x, p.y - 12);
                 }
            }
        };

        renderFrame();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };

        


    }, [graph, activePath, width, height, userLat, userLon, userFloor]);

    return (
        <canvas 
            ref={canvasRef} 
            width={width} 
            height={height} 
            style={{ 
                background: '#0a0a0a', 
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}
        />
    );
};
