import React, { useState, useRef } from 'react';

interface MobileControlsProps {
    onMove: (forward: number, turn: number) => void;
    onJump: (jump: boolean) => void;
    onDown: (down: boolean) => void;
    onLook: (dx: number, dy: number) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onMove, onJump, onDown, onLook }) => {
    const joystickRef = useRef<HTMLDivElement>(null);
    const [joystickActive, setJoystickActive] = useState(false);
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

    const lastTouchRef = useRef<{ x: number, y: number } | null>(null);
    const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null);

    const handleJoystickStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        setJoystickActive(true);
        updateJoystick(e.touches[0]);
    };

    const handleJoystickMove = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (!joystickActive) return;
        updateJoystick(e.touches[0]);
    };

    const handleJoystickEnd = (e: React.TouchEvent) => {
        e.stopPropagation();
        setJoystickActive(false);
        setJoystickPos({ x: 0, y: 0 });
        onMove(0, 0);
    };

    const updateJoystick = (touch: React.Touch) => {
        if (!joystickRef.current) return;
        const rect = joystickRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;

        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxRadius = rect.width / 2;

        if (distance > maxRadius) {
            dx = (dx / distance) * maxRadius;
            dy = (dy / distance) * maxRadius;
        }

        setJoystickPos({ x: dx, y: dy });
        onMove(-dy / maxRadius, dx / maxRadius);
    };

    const handleMainTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    };

    const handleMainTouchMove = (e: React.TouchEvent) => {
        if (!lastTouchRef.current) return;

        const touch = e.touches[0];
        const dx = touch.clientX - lastTouchRef.current.x;
        const dy = touch.clientY - lastTouchRef.current.y;

        if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
            onLook(dx * 1.5, dy * 1.5);
        }

        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleMainTouchEnd = (e: React.TouchEvent) => {
        if (touchStartRef.current) {
            const touch = e.changedTouches[0];
            const dx = Math.abs(touch.clientX - touchStartRef.current.x);
            const dy = Math.abs(touch.clientY - touchStartRef.current.y);
            const duration = Date.now() - touchStartRef.current.time;

            if (dx < 10 && dy < 10 && duration < 200) {
                // Dispatch a click to trigger block placement in Controls.tsx
                window.dispatchEvent(new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                }));
            }
        }
        lastTouchRef.current = null;
        touchStartRef.current = null;
    };

    const btnStyle: React.CSSProperties = {
        width: '70px', height: '70px', borderRadius: '20px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 8px 15px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer', outline: 'none'
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 2000, pointerEvents: 'auto', userSelect: 'none', touchAction: 'none', background: 'transparent' }}
            onTouchStart={handleMainTouchStart}
            onTouchMove={handleMainTouchMove}
            onTouchEnd={handleMainTouchEnd}
        >
            <div
                ref={joystickRef}
                style={{
                    position: 'absolute', bottom: '40px', left: '40px', width: '130px', height: '130px',
                    background: 'rgba(255,255,255,0.1)', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'
                }}
                onTouchStart={handleJoystickStart}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
            >
                <div style={{
                    width: '55px', height: '55px', background: 'radial-gradient(circle, #00ff88 0%, #008855 100%)',
                    borderRadius: '50%', transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                    boxShadow: '0 0 20px rgba(0,255,136,0.5)', transition: joystickActive ? 'none' : 'transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                }} />
            </div>

            <div style={{ position: 'absolute', bottom: '40px', right: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div
                    style={{ ...btnStyle, background: 'rgba(0,255,136,0.15)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)' }}
                    onTouchStart={(e) => { e.stopPropagation(); onJump(true); }}
                    onTouchEnd={(e) => { e.stopPropagation(); onJump(false); }}
                >
                    <span style={{ fontSize: '18px' }}>▲</span> JUMP
                </div>
                <div
                    style={{ ...btnStyle, background: 'rgba(255,68,68,0.15)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.3)' }}
                    onTouchStart={(e) => { e.stopPropagation(); onDown(true); }}
                    onTouchEnd={(e) => { e.stopPropagation(); onDown(false); }}
                >
                    <span style={{ fontSize: '18px' }}>▼</span> DOWN
                </div>
            </div>
        </div>
    );
};
