
import React from 'react';
import { Wifi, SignalLow, SignalMedium, SignalHigh, Layers } from 'lucide-react';
import { RSSIReading } from '../types';

interface WifiScannerProps {
  readings: RSSIReading[];
  detectedFloor: number;
  confidence: number;
}

const WifiScanner: React.FC<WifiScannerProps> = ({ readings, detectedFloor, confidence }) => {
  const getSignalIcon = (rssi: number) => {
    if (rssi > -50) return <SignalHigh className="text-green-400 w-4 h-4" />;
    if (rssi > -70) return <SignalMedium className="text-yellow-400 w-4 h-4" />;
    return <SignalLow className="text-red-400 w-4 h-4" />;
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-4 w-72 pointer-events-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
          <Wifi className="w-4 h-4" /> RSSI Scanner
        </h3>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 rounded text-[10px] text-blue-400 font-bold">
          LIVE
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {readings.slice(0, 4).map((r, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-300 truncate w-32">{r.ssid}</span>
              <span className={r.rssi > -60 ? "text-green-400" : "text-slate-400"}>{r.rssi} dBm</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${r.rssi > -60 ? 'bg-green-500' : r.rssi > -80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.max(0, Math.min(100, (r.rssi + 100) * 1.5))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-400 w-4 h-4" />
            <span className="text-xs font-bold">Floor Detector</span>
          </div>
          <span className="text-lg font-black text-blue-400">F{detectedFloor}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-500 uppercase">Match Confidence</span>
          <span className="text-[10px] font-bold text-slate-300">{(confidence * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

export default WifiScanner;
