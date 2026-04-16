import React from 'react';

export interface RouteStep {
  id: string;
  instruction: string;
  distance: number;
}

export const RouteCard = ({ destination, steps, onStartAR }: {
  destination: any;
  steps: RouteStep[];
  onStartAR: () => void;
}) => {
  const totalDistance = steps.reduce((acc, s) => acc + s.distance, 0);

  return (
    <div className="absolute bottom-6 left-6 right-6 z-20 slide-up pointer-events-none">
      <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col gap-6 pointer-events-auto">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-blue-400 text-[10px] font-bold tracking-widest uppercase">NAVIGATING TO</span>
            <span className="text-white text-2xl font-black leading-tight tracking-tight">{destination?.name || 'MNNIT Allahabad'}</span>
          </div>
          <div className="bg-white/5 rounded-2xl px-4 py-2 flex flex-col items-end">
            <span className="text-white text-lg font-black leading-none">{Math.round(totalDistance)}m</span>
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">TOTAL</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {steps?.slice(0, 2).map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-gray-300 text-sm font-medium">{s.instruction}</span>
              <span className="text-gray-600 text-xs font-bold leading-none ml-auto">{Math.round(s.distance)}m</span>
            </div>
          ))}
          {steps.length > 2 && (
            <div className="text-gray-600 text-[10px] font-bold uppercase tracking-widest ml-4">+ {steps.length - 2} more steps in route</div>
          )}
        </div>

        <button 
          onClick={onStartAR} 
          className="w-full bg-blue-500 hover:bg-blue-600 active:scale-[0.98] transition-all py-4 rounded-2xl text-white font-black text-lg shadow-xl shadow-blue-500/20"
        >
          START AR MODES
        </button>
      </div>
    </div>
  );
};
