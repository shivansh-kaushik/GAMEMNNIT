import React from 'react';

export const ARHud = ({ gpsAccuracy, coneAngleDeg, floorNumber, compassHeading }: {
  gpsAccuracy: number;
  coneAngleDeg: number;
  floorNumber: number;
  compassHeading: number;
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-30">
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex flex-col gap-1 shadow-2xl">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${gpsAccuracy < 5 ? 'bg-green-400' : 'bg-orange-400'} animate-pulse`} />
          <span className="text-white text-[10px] font-bold tracking-widest uppercase opacity-70">GPS PRECISION</span>
        </div>
        <div className="text-white text-lg font-black leading-none">±{gpsAccuracy.toFixed(1)}m</div>
      </div>

      <div className="flex flex-col gap-2 scale-90 origin-top-right">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1 text-white text-[10px] font-bold text-right uppercase">
          CONE: {coneAngleDeg.toFixed(1)}°
        </div>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1 text-white text-[10px] font-bold text-right uppercase">
          FLOOR: {floorNumber}
        </div>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1 text-white text-[10px] font-bold text-right uppercase">
          HEADING: {Math.round(compassHeading)}°
        </div>
      </div>
    </div>
  );
};
