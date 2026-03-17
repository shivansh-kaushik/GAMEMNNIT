import React, { useState, useCallback, useRef, useEffect } from 'react';
import { queryLLM, ChatMessage } from './llmClient';
import { buildNavigationPrompt, parseIntent, NavIntent } from './intentParser';
import { startListening, stopListening, speak, isSpeechAvailable } from './voiceInput';
import { startVoiceGuidance } from './voiceGuidance';
import { ARNavWaypoint } from '../ar/arNavigation';
import { ARSensors } from '../ar/arEngine';

/**
 * AIAssistantPanel — Floating AI assistant layered on top of the AR view.
 * Extended with live voice guidance loop via directionGenerator + voiceGuidance.
 * Does NOT modify any AR navigation, camera, or A* pathfinding logic.
 */

export interface AIAssistantPanelProps {
    /** Called when the AI resolves a navigation intent. ARPage wires this to setDestId. */
    onNavigate: (destId: string) => void;
    /** Whether the AR session is active */
    arActive: boolean;
    /** Latest sensors from ARPage (GPS + compass heading) */
    sensors: ARSensors | null;
    /** Latest waypoints from ARPage (updated by A* path builder) */
    waypoints: ARNavWaypoint[];
}

type PanelStatus = 'idle' | 'listening' | 'thinking' | 'guiding' | 'done' | 'error';

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
    onNavigate,
    arActive,
    sensors,
    waypoints
}) => {
    const [status, setStatus] = useState<PanelStatus>('idle');
    const [query, setQuery] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [guidanceText, setGuidanceText] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [activeDestId, setActiveDestId] = useState<string | null>(null);
    
    const guidanceSession = useRef<{ stop: () => void } | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, status]);

    // ── Keep refs up-to-date so voiceGuidance can always read fresh state ──
    const sensorsRef = useRef(sensors);
    const waypointsRef = useRef(waypoints);
    useEffect(() => { sensorsRef.current = sensors; }, [sensors]);
    useEffect(() => { waypointsRef.current = waypoints; }, [waypoints]);

    // ── Stop guidance when AR is deactivated ──────────────────────────────
    useEffect(() => {
        if (!arActive) {
            guidanceSession.current?.stop();
            guidanceSession.current = null;
            setStatus('idle');
            setGuidanceText('');
        }
    }, [arActive]);

    // ── Start the live voice-guidance loop once a destination is known ────
    const startGuidance = useCallback(() => {
        guidanceSession.current?.stop();

        const session = startVoiceGuidance(
            () => ({
                lat: sensorsRef.current?.gpsLat ?? 25.4947,
                lon: sensorsRef.current?.gpsLon ?? 81.8641,
                heading: sensorsRef.current?.compassBearing ?? 0,
                waypoints: waypointsRef.current
            }),
            (text, instruction) => {
                setGuidanceText(text);
                if (instruction.action === 'arrived') {
                    setStatus('done');
                    guidanceSession.current?.stop();
                    guidanceSession.current = null;
                }
            }
        );

        guidanceSession.current = session;
        setStatus('guiding');
    }, []);

    // ── React to waypoints being populated (A* just computed a path) ──────
    useEffect(() => {
        if (waypoints.length > 0 && arActive && status !== 'guiding') {
            startGuidance();
        }
    }, [waypoints.length, arActive]); // eslint-disable-line

    // ── Handle intent resolution ──────────────────────────────────────────
    const handleIntent = useCallback((intent: NavIntent) => {
        if (intent.destinationId) {
            onNavigate(intent.destinationId);
            setActiveDestId(intent.destinationId); // track for system prompt context
            speak(intent.reply ?? `Navigating to ${intent.destinationName}.`);
            setStatus('guiding'); // guidance loop will kick in once waypoints arrive
        } else {
            const msg = intent.reply ?? 'Could not find that location.';
            speak(msg);
            setStatus('idle');
        }
        
        // Append AI reply to chat history
        setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: intent.reply || 'Request processed.' }] }]);
    }, [onNavigate]);

    const runQuery = useCallback(async (text: string) => {
        if (!text.trim()) return;
        setQuery('');
        setStatus('thinking');

        // Append user new message to history
        const newUserMsg: ChatMessage = { role: 'user', parts: [{ text }] };
        const updatedHistory = [...chatHistory, newUserMsg];
        setChatHistory(updatedHistory);

        // Build context-aware prompt
        const sysPrompt = buildNavigationPrompt(sensorsRef.current, activeDestId);
        
        // Only send last 6 messages to prevent token bloat
        const recentHistory = updatedHistory.slice(-6);

        const llmResult = await queryLLM(recentHistory, sysPrompt);
        
        if (!llmResult.ok) {
           setStatus('error');
           setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: `⚠️ ${llmResult.error || 'Network error'}` }] }]);
           return;
        }

        const intent = parseIntent(llmResult.text, text);
        handleIntent(intent);
    }, [chatHistory, handleIntent, activeDestId]);

    const handleVoice = useCallback(() => {
        if (status === 'listening') {
            stopListening();
            setStatus('idle');
            return;
        }
        setStatus('listening');
        startListening(
            (transcript) => { stopListening(); runQuery(transcript); },
            (err) => { 
                setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: `⚠️ Voice error: ${err}` }] }]);
                setStatus('error'); 
            }
        );
    }, [status, runQuery]);

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        runQuery(query);
    };

    // ── Styles ────────────────────────────────────────────────────────────
    const statusColor: Record<PanelStatus, string> = {
        idle: '#aaa', listening: '#f59e0b', thinking: '#38bdf8',
        guiding: '#00ff88', done: '#a78bfa', error: '#ef4444'
    };
    const statusLabel: Record<PanelStatus, string> = {
        idle: 'Ready', listening: '🎤 Listening…', thinking: '⏳ Thinking…',
        guiding: '🧭 Guiding', done: '✅ Arrived', error: 'Error'
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            width: '320px',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Collapsed pill */}
            {!expanded && (
                <button onClick={() => setExpanded(true)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    margin: '0 auto', padding: '10px 20px',
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
                    border: '1px solid #444', borderRadius: '30px',
                    color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
                }}>
                    🤖 AI Assistant
                    <span style={{ fontSize: '10px', color: statusColor[status] }}>● {statusLabel[status]}</span>
                </button>
            )}

            {/* Expanded panel */}
            {expanded && (
                <div style={{
                    background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)',
                    border: '1px solid #2a2a2a', borderRadius: '16px',
                    padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>🤖 AI Navigation Assistant</span>
                        <button onClick={() => setExpanded(false)}
                            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px' }}>×</button>
                    </div>

                    {/* Live guidance display */}
                    {status === 'guiding' && guidanceText && (
                        <div style={{
                            background: 'rgba(0,255,136,0.1)', border: '1px solid #00ff88',
                            borderRadius: '8px', padding: '10px',
                            fontSize: '13px', color: '#00ff88', lineHeight: 1.5,
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            🧭 {guidanceText}
                        </div>
                    )}

                    {/* Status */}
                    <div style={{ fontSize: '11px', color: statusColor[status] }}>
                        {statusLabel[status]}
                    </div>

                    {/* Chat History View (Scrollable) */}
                    <div style={{
                        flex: 1, maxHeight: '250px', overflowY: 'auto',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                        paddingRight: '6px'
                    }}>
                        {chatHistory.length === 0 && (
                            <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', margin: '20px 0' }}>
                                How can I help you navigate the MNNIT Campus today?
                            </div>
                        )}
                        {chatHistory.map((msg, i) => (
                            <div key={i} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                background: msg.role === 'user' ? '#0f172a' : '#1e293b',
                                color: '#e2e8f0',
                                padding: '10px 14px',
                                borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                fontSize: '13px',
                                lineHeight: 1.4,
                                border: `1px solid ${msg.role === 'user' ? '#334155' : '#475569'}`
                            }}>
                                {msg.parts[0].text.replace(/\{.*\}/, '') /* hide JSON intent from UI layer */}
                            </div>
                        ))}
                        
                        {/* Typing indicator */}
                        {status === 'thinking' && (
                            <div style={{
                                alignSelf: 'flex-start', background: '#1e293b', padding: '10px 14px',
                                borderRadius: '12px 12px 12px 0', fontSize: '13px', color: '#94a3b8',
                                display: 'flex', gap: '4px', alignItems: 'center'
                            }}>
                                <span className="typing-dot" style={{ animationDelay: '0s' }}>●</span>
                                <span className="typing-dot" style={{ animationDelay: '0.2s' }}>●</span>
                                <span className="typing-dot" style={{ animationDelay: '0.4s' }}>●</span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Quick Suggestion Chips */}
                    {status === 'idle' && (
                        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                            {["Where am I?", "Find CSED Building", "Take me to Main Gate"].map(chip => (
                                <button key={chip} onClick={() => runQuery(chip)} style={{
                                    flexShrink: 0, padding: '6px 10px', background: '#0f172a',
                                    border: '1px solid #334155', borderRadius: '16px', color: '#94a3b8',
                                    fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s'
                                }}>
                                    {chip}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Text input form */}
                    <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder='"Take me to CSE dept"'
                            style={{
                                flex: 1, padding: '10px 14px', background: '#0f172a', color: '#fff',
                                border: '1px solid #334155', borderRadius: '20px', fontSize: '13px', outline: 'none'
                            }}
                            disabled={status === 'thinking' || status === 'listening'}
                        />
                        <button type='submit'
                            disabled={status === 'thinking' || status === 'listening' || !query.trim()}
                            style={{
                                padding: '0 16px', background: !query.trim() ? '#334155' : '#00ff88', color: '#000',
                                border: 'none', borderRadius: '20px', fontWeight: 'bold',
                                cursor: !query.trim() ? 'not-allowed' : 'pointer', fontSize: '13px',
                                transition: 'all 0.2s'
                            }}>
                            ↑
                        </button>
                    </form>

                    <div style={{ fontSize: '10px', color: '#475569', textAlign: 'center', marginTop: '4px' }}>
                        Memory Enabled · Web Speech API · Live GPS · A* Route (Gemini 3.0)
                        <style>
                            {`
                            @keyframes typing-dot {
                                0% { opacity: 0.3; transform: translateY(0px); }
                                50% { opacity: 1; transform: translateY(-2px); }
                                100% { opacity: 0.3; transform: translateY(0px); }
                            }
                            .typing-dot { animation: typing-dot 1.2s infinite ease-in-out; }
                            `}
                        </style>
                    </div>
                </div>
            )}
        </div>
    );
};
