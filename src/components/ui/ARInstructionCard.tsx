import React from 'react';

export const ARInstructionCard = ({ direction, distanceMeters }: {
  direction: string;
  distanceMeters: number;
}) => {
  return (
    <div className="absolute bottom-6 left-6 right-6 z-20 slide-up pointer-events-none">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 flex items-center gap-4">
        <div className="bg-blue-500 rounded-xl p-3 flex items-center justify-center shadow-lg">
          <span className="text-white text-3xl font-bold">
            {direction.toLowerCase().includes('left') ? '⬅' : direction.toLowerCase().includes('right') ? '➡' : '⬆'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">NEXT INSTRUCTION</span>
          <span className="text-white text-xl font-black leading-tight">{direction}</span>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-blue-400 text-sm font-bold">{distanceMeters}</span>
            <span className="text-gray-500 text-xs font-bold">m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
