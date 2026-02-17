import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';

interface MobileControlsProps {
    onMove: (x: number, y: number) => void;
    onLook: (dx: number, dy: number) => void;
    onVertical: (val: number) => void; // 1 for up, -1 for down, 0 for none
}

const MobileControls: React.FC<MobileControlsProps> = ({ onMove, onLook, onVertical }) => {
    // Joystick State
    const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
    const [isDraggingStick, setIsDraggingStick] = useState(false);
    const stickOrigin = useRef<{ x: number, y: number } | null>(null);
    const STICK_RADIUS = 40;

    // Touch Look State
    const lastLookTouch = useRef<{ x: number, y: number } | null>(null);

    // Joystick Handlers
    const handleStickStart = (e: React.TouchEvent | React.MouseEvent) => {
        setIsDraggingStick(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        stickOrigin.current = { x: clientX, y: clientY };
        setStickPos({ x: 0, y: 0 });
    };

    const handleStickMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDraggingStick || !stickOrigin.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const dx = clientX - stickOrigin.current.x;
        const dy = clientY - stickOrigin.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(distance, STICK_RADIUS);

        const angle = Math.atan2(dy, dx);
        const newX = Math.cos(angle) * clampedDist;
        const newY = Math.sin(angle) * clampedDist;

        setStickPos({ x: newX, y: newY });

        // Normalize for output (-1 to 1)
        // Invert Y because screen Y is down, but 3D forward is usually -Z or +Z depending on setup. 
        // Typically joystick Up (negative screen Y) should mean Forward.
        onMove(newX / STICK_RADIUS, newY / STICK_RADIUS);
    };

    const handleStickEnd = () => {
        setIsDraggingStick(false);
        setStickPos({ x: 0, y: 0 });
        onMove(0, 0);
    };

    // Look Handlers
    const handleLookMove = (e: React.TouchEvent) => {
        // Find the touch that started in the look area (simple approach: just take first non-stick touch?)
        // Better: strict separation. This div handles touch moves.
        const touch = e.touches[0];
        if (lastLookTouch.current) {
            const dx = touch.clientX - lastLookTouch.current.x;
            const dy = touch.clientY - lastLookTouch.current.y;
            onLook(dx, dy);
        }
        lastLookTouch.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleLookEnd = () => {
        lastLookTouch.current = null;
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-end pb-20 px-8">
            {/* Visual Instruction */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 text-[10px] text-white/30 font-mono uppercase tracking-widest pointer-events-none">
                Mobile Interface Active
            </div>

            <div className="flex justify-between items-end w-full pointer-events-auto">
                {/* Left: Joystick */}
                <div
                    className="relative w-32 h-32 bg-slate-900/50 rounded-full border border-slate-600/50 backdrop-blur-sm touch-none"
                    onTouchStart={handleStickStart}
                    onTouchMove={handleStickMove}
                    onTouchEnd={handleStickEnd}
                    onMouseDown={handleStickStart}
                    onMouseMove={handleStickMove}
                    onMouseUp={handleStickEnd}
                    onMouseLeave={handleStickEnd}
                >
                    <div
                        className="absolute w-12 h-12 bg-blue-500/80 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                        style={{ transform: `translate(${stickPos.x - 24}px, ${stickPos.y - 24}px)` }}
                    />
                </div>

                {/* Right: Buttons & Touch Look Area */}
                <div className="flex flex-col gap-4 items-center touch-none">
                    {/* Look Area (Invisible overlay on right half of screen ideally, but here just a pad) */}
                    <div
                        className="w-40 h-32 bg-slate-900/20 border border-white/10 rounded-xl mb-4 flex items-center justify-center"
                        onTouchMove={handleLookMove}
                        onTouchEnd={handleLookEnd}
                    >
                        <span className="text-[9px] text-white/20 uppercase font-black">Touch & Drag to Look</span>
                    </div>

                    <div className="flex gap-4">
                        <button
                            className="w-16 h-16 bg-slate-800/80 rounded-full border border-slate-600 flex items-center justify-center active:bg-blue-600 active:scale-95 transition-all"
                            onTouchStart={() => onVertical(-1)}
                            onTouchEnd={() => onVertical(0)}
                            onMouseDown={() => onVertical(-1)}
                            onMouseUp={() => onVertical(0)}
                        >
                            <ArrowDown className="w-6 h-6 text-white" />
                        </button>
                        <button
                            className="w-16 h-16 bg-slate-800/80 rounded-full border border-slate-600 flex items-center justify-center active:bg-blue-600 active:scale-95 transition-all"
                            onTouchStart={() => onVertical(1)}
                            onTouchEnd={() => onVertical(0)}
                            onMouseDown={() => onVertical(1)}
                            onMouseUp={() => onVertical(0)}
                        >
                            <ArrowUp className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileControls;
