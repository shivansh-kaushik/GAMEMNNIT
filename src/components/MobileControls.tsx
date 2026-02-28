import React, { useState, useEffect, useRef } from 'react';

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

    // For touch-to-look
    const lastTouchRef = useRef<{ x: number, y: number } | null>(null);

    const handleJoystickStart = (e: React.TouchEvent) => {
        setJoystickActive(true);
        updateJoystick(e.touches[0]);
    };

    const handleJoystickMove = (e: React.TouchEvent) => {
        if (!joystickActive) return;
        updateJoystick(e.touches[0]);
    };

    const handleJoystickEnd = () => {
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

        // forward: -dy (up is negative Y), turn: dx
        onMove(-dy / maxRadius, dx / maxRadius);
    };

    const handleLookTouchStart = (e: React.TouchEvent) => {
        // Prevent triggering look when touching the joystick
        if (joystickRef.current?.contains(e.target as Node)) return;
        lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleLookTouchMove = (e: React.TouchEvent) => {
        if (!lastTouchRef.current) return;

        const touch = e.touches[0];
        const dx = touch.clientX - lastTouchRef.current.x;
        const dy = touch.clientY - lastTouchRef.current.y;

        // Apply a small deadzone/sensitivity boost
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            onLook(dx * 0.8, dy * 0.8); // Increased sensitivity from 0.5 to 0.8
        }

        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleLookTouchEnd = () => {
        lastTouchRef.current = null;
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2000,
                pointerEvents: 'none',
                userSelect: 'none',
                touchAction: 'none'
            }}
            onTouchStart={handleLookTouchStart}
            onTouchMove={handleLookTouchMove}
            onTouchEnd={handleLookTouchEnd}
        >
            {/* Left side Joystick Area */}
            <div
                ref={joystickRef}
                style={{
                    position: 'absolute',
                    bottom: '60px',
                    left: '60px',
                    width: '120px',
                    height: '120px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.2)',
                    pointerEvents: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(5px)'
                }}
                onTouchStart={handleJoystickStart}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
            >
                <div style={{
                    width: '50px',
                    height: '50px',
                    background: '#00ff88',
                    borderRadius: '50%',
                    transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                    boxShadow: '0 0 20px rgba(0,255,136,0.5)',
                    transition: joystickActive ? 'none' : 'transform 0.2s ease-out'
                }} />
            </div>

            {/* Right side Buttons */}
            <div style={{
                position: 'absolute',
                bottom: '80px',
                right: '40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                pointerEvents: 'none'
            }}>
                {/* Jump Button */}
                <div
                    style={{
                        width: '70px',
                        height: '70px',
                        background: 'rgba(0,255,136,0.2)',
                        borderRadius: '50%',
                        border: '2px solid #00ff88',
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#00ff88',
                        boxShadow: '0 0 15px rgba(0,255,136,0.3)',
                        backdropFilter: 'blur(5px)'
                    }}
                    onTouchStart={() => onJump(true)}
                    onTouchEnd={() => onJump(false)}
                >
                    UP
                </div>

                {/* Down Button */}
                <div
                    style={{
                        width: '70px',
                        height: '70px',
                        background: 'rgba(255,68,68,0.2)',
                        borderRadius: '50%',
                        border: '2px solid #ff4444',
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#ff4444',
                        boxShadow: '0 0 15px rgba(255,68,68,0.3)',
                        backdropFilter: 'blur(5px)'
                    }}
                    onTouchStart={() => onDown(true)}
                    onTouchEnd={() => onDown(false)}
                >
                    DOWN
                </div>
            </div>

            {/* Top Indicator */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.5)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '10px',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)'
            }}>
                TOUCH AREA: LOOK (RIGHT) | MOVE (LEFT)
            </div>
        </div>
    );
};
