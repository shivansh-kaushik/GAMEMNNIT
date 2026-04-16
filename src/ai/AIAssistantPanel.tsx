import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Bot, 
  Mic, 
  Send, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Navigation,
  Sparkles
} from 'lucide-react';
import { queryLLM, ChatMessage } from './llmClient';
import { buildNavigationPrompt, parseIntent, NavIntent } from './intentParser';
import { startListening, stopListening, speak, isSpeechAvailable } from './voiceInput';
import { startVoiceGuidance } from './voiceGuidance';
import { ARNavWaypoint } from '../ar/arNavigation';
import { ARSensors } from '../ar/arEngine';
import { calibrateFloor } from '../sensors/floorDetection';

export interface AIAssistantPanelProps {
    onNavigate: (destId: string) => void;
    arActive: boolean;
    sensors: ARSensors | null;
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
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [guidanceText, setGuidanceText] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [activeDestId, setActiveDestId] = useState<string | null>(null);
    
    const guidanceSession = useRef<{ stop: () => void } | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, status]);

    const sensorsRef = useRef(sensors);
    const waypointsRef = useRef(waypoints);
    useEffect(() => { sensorsRef.current = sensors; }, [sensors]);
    useEffect(() => { waypointsRef.current = waypoints; }, [waypoints]);

    useEffect(() => {
        if (!arActive) {
            guidanceSession.current?.stop();
            guidanceSession.current = null;
            setStatus('idle');
            setGuidanceText('');
        }
    }, [arActive]);

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
                    calibrateFloor(0);
                }
            }
        );

        guidanceSession.current = session;
        setStatus('guiding');
    }, []);

    useEffect(() => {
        if (waypoints.length > 0 && arActive && status !== 'guiding') {
            startGuidance();
        }
    }, [waypoints.length, arActive]); // eslint-disable-line

    const handleIntent = useCallback((intent: NavIntent) => {
        if (intent.destinationId) {
            onNavigate(intent.destinationId);
            setActiveDestId(intent.destinationId);
            speak(intent.reply ?? `Navigating to ${intent.destinationName}.`);
            setStatus('guiding');
        } else {
            const msg = intent.reply ?? 'Could not find that location.';
            speak(msg);
            setStatus('idle');
        }
        setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: intent.reply || 'Request processed.' }] }]);
    }, [onNavigate]);

    const runQuery = useCallback(async (text: string) => {
        if (!text.trim()) return;
        setQuery('');
        setStatus('thinking');
        setErrorMessage(null);

        const newUserMsg: ChatMessage = { role: 'user', parts: [{ text }] };
        const updatedHistory = [...chatHistory, newUserMsg];
        setChatHistory(updatedHistory);

        const sysPrompt = buildNavigationPrompt(sensorsRef.current, activeDestId);
        const recentHistory = updatedHistory.slice(-6);

        const llmResult = await queryLLM(recentHistory, sysPrompt);
        
        if (!llmResult.ok) {
           setStatus('error');
           setErrorMessage(llmResult.error || 'Connection Failed');
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

    const statusConfig: Record<PanelStatus, { color: string, label: string, icon: boolean }> = {
        idle: { color: 'text-slate-400', label: 'Ready', icon: false },
        listening: { color: 'text-orange-500', label: 'Listening...', icon: true },
        thinking: { color: 'text-blue-400', label: 'Thinking...', icon: true },
        guiding: { color: 'text-emerald-400', label: 'Navigating', icon: false },
        done: { color: 'text-purple-400', label: 'Arrived', icon: false },
        error: { color: 'text-rose-500', label: errorMessage || 'Error', icon: false }
    };

    return (
        <div className="absolute bottom-28 left-3 z-50 w-[300px] font-sans antialiased">
            {/* Collapsed Status Pill */}
            {!expanded && (
                <button 
                  onClick={() => setExpanded(true)}
                  className="mx-auto flex items-center gap-3 px-5 py-3 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full text-white cursor-pointer hover:bg-slate-900/90 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.5)] group"
                >
                    <div className="bg-blue-500/20 p-1.5 rounded-full group-hover:scale-110 transition-transform">
                        <Bot size={16} className="text-blue-400" />
                    </div>
                    <span className="text-xs font-black italic uppercase tracking-tighter">AI Assistant</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-md">
                        <div className={`w-1.5 h-1.5 rounded-full ${statusConfig[status].color.replace('text', 'bg')} ${status === 'listening' ? 'animate-ping' : ''}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${statusConfig[status].color}`}>
                            {statusConfig[status].label}
                        </span>
                    </div>
                </button>
            )}

            {/* Expanded AI Panel */}
            {expanded && (
                <div className="bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-white/5 bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500 p-2 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                <Sparkles size={16} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black italic uppercase tracking-tighter text-white">Smart Navigation</h3>
                                <p className={`text-[9px] font-bold uppercase tracking-widest ${statusConfig[status].color}`}>
                                    {statusConfig[status].label}
                                </p>
                            </div>
                        </div>
                        <button 
                          onClick={() => setExpanded(false)}
                          className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
                        >
                            <ChevronDown size={20} />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 max-h-[300px] overflow-y-auto p-4 flex flex-col gap-4 scrollbar-none">
                        {chatHistory.length === 0 && (
                            <div className="py-10 flex flex-col items-center justify-center text-center gap-3 opacity-40">
                                <Bot size={40} className="text-slate-500" />
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                    "Take me to the library"<br/>
                                    "Where is the CSE department?"
                                </p>
                            </div>
                        )}
                        
                        {chatHistory.map((msg, i) => (
                            <div 
                              key={i} 
                              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                            >
                                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-none font-medium' 
                                    : 'bg-white/10 text-slate-200 rounded-bl-none border border-white/5'
                                }`}>
                                    {msg.parts[0].text.replace(/\{.*\}/, '')}
                                </div>
                            </div>
                        ))}
                        
                        {/* Guidance Pulse */}
                        {status === 'guiding' && guidanceText && (
                            <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 animate-pulse">
                                <Navigation size={14} className="text-emerald-400" />
                                <p className="text-[12px] font-bold text-emerald-400 leading-tight">
                                    {guidanceText}
                                </p>
                            </div>
                        )}
                        
                        {status === 'thinking' && (
                             <div className="flex gap-1.5 p-3 bg-white/5 w-16 rounded-2xl justify-center items-center">
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
                             </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Controls */}
                    <div className="p-4 pt-0">
                        {/* Chips */}
                        {status === 'idle' && chatHistory.length === 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
                                {["Library", "CSE Bldg", "Main Gate"].map(chip => (
                                    <button 
                                      key={chip} 
                                      onClick={() => runQuery(`Take me to ${chip}`)}
                                      className="whitespace-nowrap px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-tighter text-slate-400 hover:bg-white/10 transition-colors"
                                    >
                                        📍 {chip}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="relative flex items-center gap-2">
                            <form onSubmit={handleTextSubmit} className="flex-1 relative">
                                <input
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder='Ask anything...'
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all pr-12"
                                    disabled={status === 'thinking' || status === 'listening'}
                                />
                                <button 
                                  type="submit"
                                  disabled={!query.trim() || status === 'thinking'}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-500 hover:scale-110 disabled:opacity-0 transition-all"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                            
                            <button 
                              onClick={handleVoice}
                              className={`p-3 rounded-2xl transition-all ${
                                status === 'listening' 
                                ? 'bg-orange-500 text-white animate-pulse shadow-[0_0_20px_rgba(249,115,22,0.5)]' 
                                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_8px_16px_rgba(37,99,235,0.4)]'
                              }`}
                            >
                                <Mic size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
