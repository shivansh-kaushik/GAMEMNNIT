import { useState, useEffect, useRef } from 'react';
import type { MobileNet } from '@tensorflow-models/mobilenet';

// Mapping MobileNet classes to our building/navigation contextual hints
const KEYWORD_MAP: Record<string, string> = {
  'door': 'Entrance likely ahead',
  'sliding door': 'Entrance likely ahead',
  'revolving door': 'Entrance likely ahead',
  'doormat': 'Entrance likely ahead',
  
  'stair': 'Indoor transition detected',
  'staircase': 'Indoor transition detected',
  'elevator': 'Indoor transition detected',
  'escalator': 'Indoor transition detected',
  
  'patio': 'Building structure ahead',
  'window': 'Building structure ahead',
  'wall': 'Building structure ahead',
  'shoji': 'Building structure ahead', // Often triggered on grid-like glass doors/windows
  'bannister': 'Indoor transition detected', // typically staircases
};

/**
 * useCameraUnderstanding
 * 
 * Lightweight camera parser running at low frequency.
 * Designed to FAIL SAFELY. If TF.js or MobileNet fail to load or run, 
 * it simply returns no hints.
 */
export function useCameraUnderstanding(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  intervalMs = 2000
) {
  const [hint, setHint] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const modelRef = useRef<MobileNet | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    // Lazy load TF.js and the MobileNet model to avoid bloating main thread parsing randomly
    // and failing safely.
    if (!active || modelRef.current || loadingRef.current) return;

    let isMounted = true;

    async function loadModel() {
      try {
        loadingRef.current = true;
        // Dynamic imports ensure these don't break the build if they fail downstream
        const tf = await import('@tensorflow/tfjs');
        await tf.ready();
        
        const mobilenet = await import('@tensorflow-models/mobilenet');
        const model = await mobilenet.load({ version: 1, alpha: 0.25 }); // Lightest possible model
        
        if (isMounted) {
          modelRef.current = model;
          setIsReady(true);
        }
      } catch (err: any) {
        console.error('Camera assistant failed to load:', err);
        if (isMounted) setError('Failed to load vision model');
      } finally {
        if (isMounted) loadingRef.current = false;
      }
    }

    loadModel();

    return () => {
      isMounted = false;
    };
  }, [active]);

  useEffect(() => {
    if (!active || !isReady || !modelRef.current) {
        setHint(null);
        return;
    }

    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return; // Wait for video to have frames

      try {
        const predictions = await modelRef.current!.classify(video, 3);
        
        let foundHint: string | null = null;

        // Iterate through predictions and keyword dictionaries
        for (const pred of predictions) {
          if (pred.probability < 0.15) continue; // Noise filter
          
          const className = pred.className.toLowerCase();
          
          for (const key in KEYWORD_MAP) {
            if (className.includes(key)) {
              foundHint = KEYWORD_MAP[key];
              break;
            }
          }
          if (foundHint) break;
        }

        setHint(foundHint);

      } catch (err) {
        console.warn('Camera Assistant parsing error:', err);
        // Fail gracefully without crashing AR
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [active, isReady, intervalMs, videoRef]);

  return { hint, isReady, error };
}
