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
    // Hardcoded thesis ablation results for visual impact
    const ablationResults = [
        { label: 'GNSS baseline', value: 31.3, color: 'var(--color-danger)' },
        { label: 'DSLS (proposed)', value: 16.6, color: 'var(--color-warning)' },
        { label: 'DSLS + QR', value: 15.6, color: 'var(--color-success)' },
    ];

    const maxVal = 35; // For chart scaling

    // Latency color matching
    const latencyColor = executionTimeMs < 20 ? 'var(--color-success)' : executionTimeMs < 50 ? 'var(--color-warning)' : 'var(--color-danger)';

    return (
        <div style={{
            background: 'var(--color-surface)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-card)',
            padding: '20px',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            backdropFilter: 'var(--blur-card)',
            minWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <h3 style={{ margin: '0', fontSize: '12px', color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '800' }}>
                Engine Diagnostics
            </h3>
            
            {/* Pipeline Visualization */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: 'rgba(0,0,0,0.3)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '10px',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={stepStyle}>Input</div>
                <div style={arrowStyle}>→</div>
                <div style={stepStyleHighlighted}>A*</div>
                <div style={arrowStyle}>→</div>
                <div style={stepStyle}>Path</div>
                <div style={arrowStyle}>→</div>
                <div style={stepStyle}>AR Render</div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <MetricBox label="Graph Nodes" value={totalNodes} />
                <MetricBox label="A* Exec Time" value={`${executionTimeMs.toFixed(2)} ms`} color={latencyColor} />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }} />

            {/* Ablation Study Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Thesis Ablation Study (RMSE)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {ablationResults.map((res, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                <span style={{ color: '#aaa' }}>{res.label}</span>
                                <span style={{ fontWeight: 'bold', color: res.color }}>{res.value}m</span>
                            </div>
                            <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: `${(res.value / maxVal) * 100}%`, 
                                    background: res.color,
                                    borderRadius: '3px',
                                    transition: 'width 1s ease-out'
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div style={{ marginTop: '4px', fontSize: '10px', color: '#555', textAlign: 'center', fontStyle: 'italic' }}>
                Reproducibility Package v1.4
            </div>
        </div>
    );
};

const MetricBox = ({ label, value, color = '#fff' }: { label: string, value: string | number, color?: string }) => (
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ fontSize: '9px', color: 'var(--color-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>{label}</div>
        <div style={{ fontSize: '18px', fontWeight: '800', color }}>{value}</div>
    </div>
);

const stepStyle = { padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' };
const stepStyleHighlighted = { padding: '4px 8px', background: 'var(--color-success)', color: '#000', borderRadius: '4px', fontWeight: 'bold' };
const arrowStyle = { color: 'rgba(255,255,255,0.2)', fontWeight: 'bold' };
