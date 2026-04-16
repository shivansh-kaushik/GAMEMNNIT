import React from 'react';

export const MetricsDashboard = ({ live }: {
  live: {
    astarLatencyMs: number;
    gpsAccuracyM: number;
    coneAngleDeg: number;
    crossTrackError: number;
    dslsCorrectionDelta: number;
    deviation: number;
    distanceToTarget: number;
    arFps: number;
  }
}) => {
  return (
    <div className="p-6 text-white bg-slate-900 min-h-screen flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 italic uppercase">
          <span className="text-blue-500">ENGINE</span>DIAGNOSTICS
        </h2>
        <div className="h-1 w-20 bg-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricBox label="A* LATENCY" value={`${live.astarLatencyMs.toFixed(1)}ms`} highlight={live.astarLatencyMs < 20} />
        <MetricBox label="GPS PRECISION" value={`±${live.gpsAccuracyM.toFixed(1)}m`} highlight={live.gpsAccuracyM < 5} />
        <MetricBox label="CONE ANGLE" value={`${live.coneAngleDeg.toFixed(1)}°`} highlight={live.coneAngleDeg < 30} />
        <MetricBox label="CROSS-TRACK" value={`${live.crossTrackError.toFixed(2)}m`} highlight={live.crossTrackError < 1.0} />
        <MetricBox label="DSLS OFFSET" value={`${live.dslsCorrectionDelta.toFixed(3)}°`} />
        <MetricBox label="PATH DEV" value={`${live.deviation.toFixed(1)}m`} highlight={live.deviation < 2.0} />
        <MetricBox label="FPS (WORLD)" value={`${live.arFps}`} highlight={live.arFps > 30} />
        <MetricBox label="DISTANCE" value={`${Math.round(live.distanceToTarget)}m`} />
      </div>

      <div className="mt-auto bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">SYSTEM STATUS</div>
        <div className="flex items-center gap-2">
          <div className="w-2h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white text-xs font-bold leading-none uppercase">DSLS PIPELINE ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

const MetricBox = ({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) => (
  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-1 shadow-2xl">
    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</div>
    <div className={`text-xl font-black ${highlight ? 'text-blue-500' : 'text-white'}`}>{value}</div>
  </div>
);
