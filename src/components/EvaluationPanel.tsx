/**
 * EvaluationPanel.tsx
 *
 * Collapsible overlay panel showing live and session-level evaluation metrics.
 * Designed for the thesis defense / viva — shows RMSE, lock rate, and speed.
 *
 * Mobile-safe: uses logger.download() which calls navigator.share internally.
 */
import React, { useState, useEffect } from 'react';
import logger from '../utils/logger';

interface EvaluationPanelProps {
    isLogging: boolean;
    onStartLog: () => void;
    onStopLog: () => void;
    isMobile?: boolean;
}

export const EvaluationPanel: React.FC<EvaluationPanelProps> = ({
    isLogging,
    onStartLog,
    onStopLog,
    isMobile = false,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [liveRMSE, setLiveRMSE] = useState(0);
    const [livePositionSigma, setLivePositionSigma] = useState<number | null>(null);
    const [logCount, setLogCount] = useState(0);
    const [sessionMetrics, setSessionMetrics] = useState<ReturnType<typeof logger.computeMetrics> | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [sessionDuration, setSessionDuration] = useState('00:00');

    // Update live metrics every second while logging
    useEffect(() => {
        if (!isLogging) {
            if (logCount > 0) {
                // Compute final metrics when logging stops
                setSessionMetrics(logger.computeMetrics());
            }
            return;
        }

        const startTime = Date.now();
        const interval = setInterval(() => {
            setLiveRMSE(logger.liveRMSE());
            setLogCount(logger.count);

            // Live position σ from last log entry's covMaxEigenvalue
            const lastEntry = (logger as any)['logs']?.slice(-1)[0];
            if (lastEntry?.covMaxEigenvalue != null) {
                setLivePositionSigma(Math.sqrt(lastEntry.covMaxEigenvalue));
            }

            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const ss = String(elapsed % 60).padStart(2, '0');
            setSessionDuration(`${mm}:${ss}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [isLogging, logCount]);

    const handleDownload = async () => {
        setDownloading(true);
        await logger.download();
        setDownloading(false);
    };

    const handleStartLog = () => {
        logger.startSession();
        setLiveRMSE(0);
        setLogCount(0);
        setSessionMetrics(null);
        setSessionDuration('00:00');
        onStartLog();
    };

    const pillStyle: React.CSSProperties = {
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '3px 8px', borderRadius: '999px', fontSize: '9px',
        fontWeight: 'bold', letterSpacing: '0.5px',
    };

    const metricRow = (label: string, value: string, color = '#fff') => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#888', fontSize: '10px' }}>{label}</span>
            <span style={{ color, fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace' }}>{value}</span>
        </div>
    );

    // Collapsed button
    if (!expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                style={{
                    position: 'absolute',
                    bottom: isMobile ? '80px' : '90px',
                    left: isMobile ? '8px' : '16px',
                    zIndex: 30,
                    background: isLogging
                        ? 'rgba(59, 130, 246, 0.9)'
                        : 'rgba(0,0,0,0.7)',
                    border: isLogging ? '1.5px solid #3b82f6' : '1px solid #444',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isLogging ? '0 0 12px rgba(59,130,246,0.5)' : 'none',
                }}
            >
                {isLogging ? (
                    <>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                        RMSE {liveRMSE.toFixed(2)}m
                    </>
                ) : (
                    <>📊 Evaluation</>
                )}
            </button>
        );
    }

    // Expanded panel
    return (
        <div style={{
            position: 'absolute',
            bottom: isMobile ? '80px' : '90px',
            left: isMobile ? '8px' : '16px',
            zIndex: 30,
            background: 'rgba(10,10,10,0.95)',
            border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: '16px',
            padding: '14px',
            color: '#fff',
            width: isMobile ? '200px' : '240px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#3b82f6', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    📊 Evaluation
                </div>
                <button onClick={() => setExpanded(false)}
                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }}>
                    ✕
                </button>
            </div>

            {/* Live metrics while logging */}
            {isLogging ? (
                <>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <span style={{ ...pillStyle, background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                            ⚫ {sessionDuration}
                        </span>
                        <span style={{ ...pillStyle, background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)' }}>
                            {logCount} pts
                        </span>
                    </div>
                    {metricRow('Live RMSE', `${liveRMSE.toFixed(3)} m`, liveRMSE < 5 ? '#00ff88' : liveRMSE < 10 ? '#eab308' : '#ef4444')}
                    {livePositionSigma != null && metricRow('Position σ', `${livePositionSigma.toFixed(2)} m`, '#8b5cf6')}
                    {metricRow('Session ID', logger.currentSessionId, '#555')}

                    <button
                        onClick={onStopLog}
                        style={{ width: '100%', marginTop: '10px', padding: '8px', background: 'rgba(245,158,11,0.2)', border: '1px solid #f59e0b', borderRadius: '8px', color: '#f59e0b', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                        ⏹ Stop Logging
                    </button>
                </>
            ) : (
                <>
                    {/* Post-session metrics */}
                    {sessionMetrics ? (
                        <>
                            <div style={{ fontSize: '9px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Session: {sessionMetrics.sessionId}
                            </div>
                            {metricRow('RMSE (snapped)', `${sessionMetrics.rmse} m`, sessionMetrics.rmse < 5 ? '#00ff88' : sessionMetrics.rmse < 10 ? '#eab308' : '#ef4444')}
                            {sessionMetrics.groundTruthRMSE != null && (
                                metricRow('RMSE (vs A* path)', `${sessionMetrics.groundTruthRMSE} m`,
                                    sessionMetrics.groundTruthRMSE < 5 ? '#00ff88' :
                                    sessionMetrics.groundTruthRMSE < 10 ? '#eab308' : '#ef4444')
                            )}
                            {metricRow('Mean Deviation', `${sessionMetrics.meanDeviation} m`)}
                            {metricRow('Max Deviation', `${sessionMetrics.maxDeviation} m`, '#ef4444')}
                            {metricRow('Path Length', `${sessionMetrics.actualPathLength} m`)}
                            {metricRow('Lock Rate', `${(sessionMetrics.lockRate * 100).toFixed(1)}%`, sessionMetrics.lockRate > 0.8 ? '#00ff88' : '#eab308')}
                            {metricRow('Mean Speed', `${sessionMetrics.meanSpeed} m/s`)}
                            {sessionMetrics.meanCovEigenvalue != null && (
                                metricRow('Mean σ_pos', `${Math.sqrt(sessionMetrics.meanCovEigenvalue).toFixed(2)} m`, '#8b5cf6')
                            )}
                            {metricRow('Data Points', `${sessionMetrics.totalPoints}`, '#3b82f6')}

                            <button
                                onClick={handleDownload}
                                disabled={downloading}
                                style={{ width: '100%', marginTop: '10px', padding: '8px', background: downloading ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)', border: '1px solid #8b5cf6', borderRadius: '8px', color: '#8b5cf6', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                                {downloading ? '⏳ Exporting…' : '⬇ Export CSV + JSON'}
                            </button>
                        </>
                    ) : (
                        <div style={{ color: '#555', fontSize: '11px', textAlign: 'center', padding: '8px 0' }}>
                            No session data yet
                        </div>
                    )}

                    <button
                        onClick={handleStartLog}
                        style={{ width: '100%', marginTop: '8px', padding: '8px', background: 'rgba(59,130,246,0.2)', border: '1px solid #3b82f6', borderRadius: '8px', color: '#3b82f6', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                        ⚫ Start New Session
                    </button>
                </>
            )}
        </div>
    );
};
