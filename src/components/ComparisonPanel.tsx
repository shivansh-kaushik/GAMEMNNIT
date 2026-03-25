import React from 'react';

interface ComparisonPanelProps {
    totalNodes: number;
    totalEdges: number;
    pathLength: number;
    executionTimeMs: number;
}

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({ 
    totalNodes, 
    totalEdges, 
    pathLength, 
    executionTimeMs 
}) => {
    return (
        <div style={{
            background: 'rgba(15, 15, 15, 0.9)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            minWidth: '280px'
        }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#00ff88', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Engine Diagnostics
            </h3>
            
            {/* Pipeline Visualization */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: '#000',
                padding: '10px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '11px',
                color: '#aaa',
                border: '1px solid #333'
            }}>
                <div style={stepStyle}>Input</div>
                <div style={arrowStyle}>→</div>
                <div style={stepStyleHighlighted}>A* Search</div>
                <div style={arrowStyle}>→</div>
                <div style={stepStyle}>Path</div>
                <div style={arrowStyle}>→</div>
                <div style={stepStyle}>AR Render</div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <MetricBox label="Graph Nodes" value={totalNodes} />
                <MetricBox label="Graph Edges" value={totalEdges / 2} /> {/* Division by 2 for undirected count */}
                <MetricBox label="Path Length (nodes)" value={pathLength} color={pathLength > 0 ? '#00ff88' : '#fff'} />
                <MetricBox label="A* Exec Time" value={`${executionTimeMs.toFixed(2)} ms`} color="#eab308" />
            </div>
            
            <div style={{ marginTop: '12px', fontSize: '10px', color: '#666', textAlign: 'center' }}>
                Powered by MNNIT Graph Engine
            </div>
        </div>
    );
};

const MetricBox = ({ label, value, color = '#fff' }: { label: string, value: string | number, color?: string }) => (
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px' }}>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color }}>{value}</div>
    </div>
);

const stepStyle = { padding: '4px 6px', background: '#222', borderRadius: '4px' };
const stepStyleHighlighted = { padding: '4px 6px', background: 'rgba(0, 255, 136, 0.2)', color: '#00ff88', borderRadius: '4px', border: '1px solid rgba(0,255,136,0.5)' };
const arrowStyle = { color: '#555' };
