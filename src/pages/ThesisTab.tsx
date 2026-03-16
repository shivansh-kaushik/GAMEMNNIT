import React from 'react';
import { GraduationCap, FileText, Award, MapPin, Cpu, Compass, Wifi } from 'lucide-react';

export const ThesisTab: React.FC = () => {
    const architectureDiagram = '[Digital Twin Layer] -> [Routing Engine (A*)] -> [AR Overlay] -> [User Interface]';

    return (
        <div style={{
            width: '100%',
            height: '100vh',
            background: '#0a0a0a',
            color: '#e2e8f0',
            overflowY: 'auto',
            fontFamily: 'Inter, system-ui, sans-serif',
            paddingBottom: '100px',
        }}>
            {/* Hero Header */}
            <div style={{
                background: 'linear-gradient(180deg, rgba(0,255,136,0.12) 0%, rgba(0,0,0,0) 100%)',
                padding: '60px 24px 40px',
                textAlign: 'center',
                borderBottom: '1px solid #1e293b'
            }}>
                <GraduationCap size={48} color="#00ff88" style={{ marginBottom: '16px' }} />
                <h1 style={{
                    fontSize: 'clamp(18px, 3vw, 26px)',
                    fontWeight: 800,
                    lineHeight: 1.3,
                    color: '#fff',
                    maxWidth: '820px',
                    margin: '0 auto 16px auto'
                }}>
                    AR-Based Smart Campus Navigation Using Geospatial Intelligence and Digital Twin Technology
                </h1>
                <div style={{ fontSize: '15px', color: '#94a3b8' }}>
                    <strong style={{ color: '#fff' }}>Shivansh Kaushik</strong> &nbsp;|&nbsp; M.Tech Thesis
                </div>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>
                    Motilal Nehru National Institute of Technology (MNNIT) Allahabad
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
                    {['React 18', 'Three.js', 'AR WebXR', 'Gemini 1.5', 'Mapbox GL JS', 'A* Search'].map(tag => (
                        <span key={tag} style={{
                            background: 'rgba(0,255,136,0.1)',
                            border: '1px solid rgba(0,255,136,0.3)',
                            color: '#00ff88',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 600
                        }}>{tag}</span>
                    ))}
                </div>
            </div>

            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 24px' }}>

                {/* Abstract */}
                <section style={{ marginBottom: '48px' }}>
                    <h2 style={headingStyle}><Award size={18} style={{ marginRight: '10px', color: '#00ff88' }} /> 1. Abstract</h2>
                    <p style={paraStyle}>
                        This project presents the development of a smart campus navigation system combining geospatial mapping,
                        augmented reality (AR), and AI-driven human interaction. The system assists users in navigating complex
                        campus environments by grounding spatial guidance within a real-time digital twin representation of the campus.
                    </p>
                    <p style={paraStyle}>
                        The routing engine uses the <strong style={{ color: '#e2e8f0' }}>A* pathfinding algorithm</strong> over a
                        campus-scale graph. GPS handles outdoor positioning while barometric altimetry and WiFi RSSI fingerprinting
                        support indoor localization. A locally hosted LLM (now powered by <strong style={{ color: '#e2e8f0' }}>Google Gemini 1.5</strong>) interprets voice
                        commands and maps them to navigation intents consumed by the routing engine.
                    </p>
                    <blockquote style={{
                        borderLeft: '3px solid #00ff88',
                        paddingLeft: '16px',
                        margin: '20px 0',
                        color: '#94a3b8',
                        fontStyle: 'italic',
                        fontSize: '15px'
                    }}>
                        "The prototype, validated on the MNNIT Allahabad campus dataset, demonstrates that the convergence of
                        digital twin visualization, WebXR-based AR, and on-device AI interaction is a viable framework for
                        next-generation campus wayfinding."
                    </blockquote>
                </section>

                <hr style={hrStyle} />

                {/* System Architecture */}
                <section style={{ marginBottom: '48px' }}>
                    <h2 style={headingStyle}><Cpu size={18} style={{ marginRight: '10px', color: '#00ff88' }} /> 2. System Architecture</h2>
                    <p style={paraStyle}>
                        The architecture is modular and decoupled, separating visualization, routing, sensor integration, and AI
                        inference so that heavy computations do not block real-time navigation.
                    </p>
                    <div style={codeBoxStyle}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {architectureDiagram}
                        </pre>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginTop: '20px' }}>
                        {[
                            { label: 'Digital Twin Layer', desc: 'Three.js 3D campus model from OSM data' },
                            { label: 'Navigation Engine', desc: 'A* pathfinding on GeoJSON graph' },
                            { label: 'AR Viz Layer', desc: 'WebXR camera overlay with GPS anchoring' },
                            { label: 'AI Assistant', desc: 'Gemini 1.5 Flash for NL command parsing' },
                        ].map(card => (
                            <div key={card.label} style={cardStyle}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#00ff88', marginBottom: '6px' }}>{card.label}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{card.desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                <hr style={hrStyle} />

                {/* Navigation Engine */}
                <section style={{ marginBottom: '48px' }}>
                    <h2 style={headingStyle}><Compass size={18} style={{ marginRight: '10px', color: '#00ff88' }} /> 3. Navigation Engine (A* Search)</h2>
                    <p style={paraStyle}>
                        Each <strong style={{ color: '#e2e8f0' }}>node</strong> represents a spatial waypoint (pathway intersection, building entrance).
                        Each <strong style={{ color: '#e2e8f0' }}>edge</strong> represents a traversable connection.
                    </p>
                    <div style={{ ...codeBoxStyle, textAlign: 'center', fontSize: '20px', letterSpacing: '2px', fontFamily: 'Georgia, serif' }}>
                        f(n) = g(n) + h(n)
                    </div>
                    <p style={{ ...paraStyle, fontSize: '13px', color: '#475569' }}>
                        Where <em>g(n)</em> is the exact cost from origin to node n, and <em>h(n)</em> is the Euclidean distance heuristic to the goal.
                    </p>

                    <div style={{ background: '#111', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1e293b', marginTop: '16px' }}>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e293b', fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>
                            src/navigation/astar.ts
                        </div>
                        <pre style={{ margin: 0, padding: '16px', fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace', overflowX: 'auto' }}>
                            {`function heuristic(a: Node, b: Node): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}`}
                        </pre>
                    </div>
                </section>

                <hr style={hrStyle} />

                {/* Indoor Positioning */}
                <section style={{ marginBottom: '48px' }}>
                    <h2 style={headingStyle}><Wifi size={18} style={{ marginRight: '10px', color: '#00ff88' }} /> 4. Indoor Positioning</h2>
                    <p style={paraStyle}>
                        GPS signal degrades inside reinforced concrete structures. A hybrid sensor fusion approach handles indoor navigation:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                        <div style={cardStyle}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#00ff88', marginBottom: '8px' }}>Barometric Altimetry</div>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                                Floor height from ambient pressure. A change of 3m triggers a floor transition event.
                            </p>
                        </div>
                        <div style={cardStyle}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#00ff88', marginBottom: '8px' }}>WiFi RSSI Fingerprinting</div>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                                Euclidean distance matching of live RSSI arrays against pre-calibrated floor signatures.
                            </p>
                        </div>
                    </div>
                </section>

                <hr style={hrStyle} />

                {/* Performance Metrics */}
                <section style={{ marginBottom: '48px' }}>
                    <h2 style={headingStyle}><FileText size={18} style={{ marginRight: '10px', color: '#00ff88' }} /> 5. Performance Metrics</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #1e293b' }}>
                                <th style={thStyle}>Metric</th>
                                <th style={thStyle}>Achieved</th>
                                <th style={thStyle}>Target</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ['A* Route Generation', '< 50 ms', '< 100 ms'],
                                ['AR Rendering Frame Rate', '30–60 FPS', '≥ 30 FPS'],
                                ['GPS Accuracy', '~5–10 m', '± 5 m'],
                                ['Floor Detection', '± 1 floor', '± 1 floor'],
                                ['AI Intent Latency (Gemini)', '~400 ms', '< 1.5 s'],
                            ].map(([metric, achieved, target]) => (
                                <tr key={metric} style={{ borderBottom: '1px solid #0f172a' }}>
                                    <td style={tdStyle}>{metric}</td>
                                    <td style={{ ...tdStyle, color: '#00ff88', fontWeight: 600 }}>{achieved}</td>
                                    <td style={{ ...tdStyle, color: '#475569' }}>{target}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <hr style={hrStyle} />

                {/* Research Contributions */}
                <section style={{ marginBottom: '48px' }}>
                    <h2 style={headingStyle}><MapPin size={18} style={{ marginRight: '10px', color: '#00ff88' }} /> 6. Research Contributions</h2>
                    {[
                        ['Pure-web AR Navigation', 'A fully browser-native AR direction system decoupled from proprietary OS frameworks, using WebXR and HTML5 Canvas.'],
                        ['Discrete-to-Generative AI Bridge', 'A* graph outputs fed into Gemini 1.5 Flash, enabling natural language reasoning over structured spatial data.'],
                        ['Hybrid Indoor-Outdoor Framework', 'A unified client-side system combining WiFi/barometric indoor math with outdoor OSM and Mapbox GIS data.'],
                    ].map(([title, desc]) => (
                        <div key={title} style={{ display: 'flex', gap: '16px', marginBottom: '16px', padding: '16px', background: '#0f172a', borderRadius: '10px', border: '1px solid #1e293b' }}>
                            <div style={{ color: '#00ff88', fontWeight: 800, fontSize: '20px', lineHeight: 1 }}>→</div>
                            <div>
                                <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{title}</div>
                                <div style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.6 }}>{desc}</div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Footer */}
                <div style={{ textAlign: 'center', color: '#334155', fontSize: '12px', paddingTop: '40px', borderTop: '1px solid #1e293b' }}>
                    <p style={{ margin: '4px 0' }}>Submitted in partial fulfillment of the requirements for the degree of Master of Technology</p>
                    <p style={{ margin: '4px 0' }}><strong style={{ color: '#475569' }}>Motilal Nehru National Institute of Technology Allahabad</strong></p>
                </div>
            </div>
        </div>
    );
};

const headingStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
};

const paraStyle: React.CSSProperties = {
    fontSize: '15px',
    lineHeight: 1.75,
    color: '#94a3b8',
    marginBottom: '14px',
};

const hrStyle: React.CSSProperties = {
    border: 'none',
    borderTop: '1px solid #1e293b',
    margin: '40px 0',
};

const codeBoxStyle: React.CSSProperties = {
    background: 'rgba(0,255,136,0.05)',
    border: '1px solid rgba(0,255,136,0.2)',
    padding: '16px',
    borderRadius: '8px',
    color: '#00ff88',
    fontFamily: 'monospace',
    fontSize: '13px',
    margin: '16px 0',
};

const cardStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '16px',
};

const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 16px',
    color: '#475569',
    fontWeight: 600,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
};

const tdStyle: React.CSSProperties = {
    padding: '10px 16px',
    color: '#94a3b8',
};
