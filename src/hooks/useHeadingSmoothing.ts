/**
 * useHeadingSmoothing.ts
 *
 * Fuses GPS-derived bearing (from Kalman velocity) with device compass.
 *
 * Strategy:
 *   - When moving (speed > 0.5 m/s, gpsBearing ≥ 0):
 *       heading = 60% GPS bearing + 40% compass (GPS grounds it in reality)
 *   - When stationary or slow (gpsBearing === -1 or speed < 0.5):
 *       heading = pure compass with EWM smoothing
 *
 * The EWM (exponentially weighted moving average) smoothing is always applied
 * to prevent jumpy output regardless of input source.
 */
import { useState, useEffect, useRef } from 'react';

export function useHeadingSmoothing(
    rawCompass: number,
    alpha = 0.15,
    delayMs = 150,
    gpsBearing = -1,   // -1 = stationary / not available
    speed = 0          // m/s from Kalman filter
) {
    const [smoothedHeading, setSmoothedHeading] = useState(rawCompass);
    const targetHeadingRef = useRef(rawCompass);
    const gpsBearingRef    = useRef(gpsBearing);
    const speedRef         = useRef(speed);

    // Keep refs current without resetting the animation loop
    useEffect(() => { gpsBearingRef.current = gpsBearing; }, [gpsBearing]);
    useEffect(() => { speedRef.current = speed; }, [speed]);
    useEffect(() => { targetHeadingRef.current = rawCompass; }, [rawCompass]);

    useEffect(() => {
        let animationFrame: number;
        let current = smoothedHeading;

        const updateHeading = () => {
            // Compute the target heading based on movement state
            let target: number;
            const s = speedRef.current;
            const gps = gpsBearingRef.current;

            if (gps >= 0 && s > 0.5) {
                // MOVING: fuse GPS bearing (truth) with compass (fast)
                // Circular blend — handle 0/360 wrap correctly
                const diff = ((gps - targetHeadingRef.current) + 540) % 360 - 180;
                target = (targetHeadingRef.current + 0.6 * diff + 360) % 360;
            } else {
                // STATIONARY: pure smoothed compass
                target = targetHeadingRef.current;
            }

            // EWM smoothing with angle wrap
            let diff = target - current;
            if (diff > 180)  diff -= 360;
            if (diff < -180) diff += 360;

            current = (current + alpha * diff + 360) % 360;
            setSmoothedHeading(current);
            animationFrame = requestAnimationFrame(updateHeading);
        };

        const timer = setTimeout(() => {
            animationFrame = requestAnimationFrame(updateHeading);
        }, delayMs);

        return () => {
            clearTimeout(timer);
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alpha, delayMs]);

    return smoothedHeading;
}
