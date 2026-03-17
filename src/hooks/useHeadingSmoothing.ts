/**
 * src/hooks/useHeadingSmoothing.ts
 * Filters jitter out of raw AR compass data.
 */
import { useState, useEffect, useRef } from 'react';

export function useHeadingSmoothing(rawHeading: number, alpha = 0.15, delayMs = 150) {
  const [smoothedHeading, setSmoothedHeading] = useState(rawHeading);
  const targetHeadingRef = useRef(rawHeading);

  useEffect(() => {
    targetHeadingRef.current = rawHeading;
  }, [rawHeading]);

  useEffect(() => {
    let animationFrame: number;
    let currentSmoothed = smoothedHeading;

    const updateHeading = () => {
      // Handle the wrapping around 360 degrees
      let diff = targetHeadingRef.current - currentSmoothed;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      currentSmoothed = currentSmoothed + alpha * diff;
      currentSmoothed = (currentSmoothed + 360) % 360;
      
      setSmoothedHeading(currentSmoothed);
      animationFrame = requestAnimationFrame(updateHeading);
    };

    // Buffer delay as requested to stabilize jumps
    const timer = setTimeout(() => {
       animationFrame = requestAnimationFrame(updateHeading);
    }, delayMs);

    return () => {
        clearTimeout(timer);
        if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [alpha, delayMs]); // removed rawHeading from deps to avoid resetting animation loop, using ref instead

  return smoothedHeading;
}
