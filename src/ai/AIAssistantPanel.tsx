import React, { useState, useCallback, useRef, useEffect } from 'react';
import { queryLLM } from './llmClient';
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
    const [reply, setReply] = useState('');
    const [guidanceText, setGuidanceText] = useState('');
    const [expanded, setExpanded] = useState(false);
    const guidanceSession = useRef<{ stop: () => void } | null>(null);

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
            speak(intent.reply ?? `Navigating to ${intent.destinationName}.`);
            setReply(`✅ ${intent.reply}`);
            setStatus('guiding'); // guidance loop will kick in once waypoints arrive
        } else {
            const msg = intent.reply ?? 'Could not find that location.';
            speak(msg);
            setReply(`ℹ️ ${msg}`);
            setStatus('error');
        }
    }, [onNavigate]);

    const runQuery = useCallback(async (text: string) => {
        if (!text.trim()) return;
        setQuery(text);
        setReply('');
        setStatus('thinking');

        const llmResult = await queryLLM(buildNavigationPrompt(text));
        const intent = parseIntent(llmResult.text, text);
        handleIntent(intent);
    }, [handleIntent]);

    const handleVoice = useCallback(() => {
        if (status === 'listening') {
            stopListening();
            setStatus('idle');
            return;
        }
        setStatus('listening');
        setReply('');
        startListening(
            (transcript) => { stopListening(); runQuery(transcript); },
            (err) => { setReply(`⚠️ ${err}`); setStatus('error'); }
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

                    {/* Voice button */}
                    {isSpeechAvailable() && (
                        <button onClick={handleVoice} style={{
                            padding: '10px', borderRadius: '10px', border: 'none',
                            background: status === 'listening' ? '#f59e0b' : '#1e293b',
                            color: '#fff', cursor: 'pointer', fontSize: '22px',
                            boxShadow: status === 'listening' ? '0 0 16px #f59e0b' : 'none',
                            transition: 'all 0.2s', width: '100%'
                        }} title={status === 'listening' ? 'Stop' : 'Voice command'}>
                            🎤 {status === 'listening' ? 'Listening… (tap to stop)' : 'Voice Command'}
                        </button>
                    )}

                    {/* Text query */}
                    <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: '8px' }}>
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder='"Take me to CSE dept"'
                            style={{
                                flex: 1, padding: '8px 12px', background: '#111', color: '#fff',
                                border: '1px solid #333', borderRadius: '8px', fontSize: '12px', outline: 'none'
                            }}
                            disabled={status === 'thinking' || status === 'listening'}
                        />
                        <button type='submit'
                            disabled={status === 'thinking' || status === 'listening'}
                            style={{
                                padding: '8px 14px', background: '#00ff88', color: '#000',
                                border: 'none', borderRadius: '8px', fontWeight: 'bold',
                                cursor: 'pointer', fontSize: '12px'
                            }}>
                            Ask
                        </button>
                    </form>

                    {/* Reply */}
                    {reply && (
                        <div style={{
                            background: '#0f172a', borderRadius: '8px', padding: '10px',
                            fontSize: '12px', color: '#e2e8f0', lineHeight: 1.5,
                            border: `1px solid ${status === 'done' ? '#a78bfa' : status === 'error' ? '#ef4444' : '#333'}`
                        }}>
                            {reply}
                        </div>
                    )}

                    <div style={{ fontSize: '10px', color: '#475569', textAlign: 'center' }}>
                        Google Gemini 1.5 · Web Speech API · Live GPS · A* Route
                    </div>
                </div>
            )}
        </div>
    );
};
