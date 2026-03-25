/**
 * MarkerLocalization.ts
 * Implements Absolute Ground-Truth Correction (Level 2 Localization) via WebRTC video.
 * Uses the native BarcodeDetector API to scan physical QR codes placed on campus,
 * instantly nullifying GPS drift and resetting the navigation engine's Kalman filters.
 */

export interface MarkerPayload {
    id: string;
    lat: number;
    lon: number;
    bearing: number; // The exact orientation the user is facing when scanning
}

export class MarkerScanner {
    private detector: any = null;
    private isScanning: boolean = false;
    private videoElement: HTMLVideoElement | null = null;
    private onDetect: ((payload: MarkerPayload) => void) | null = null;
    private scanInterval: any = null;

    constructor() {
        // Initialize native BarcodeDetector if available (Chrome Android / Edge)
        if ('BarcodeDetector' in window) {
            this.detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        } else {
            console.warn('Native BarcodeDetector not supported. Ground Truth scanning requires Chrome Android or a polyfill.');
        }
    }

    public start(video: HTMLVideoElement, onMarkerDetected: (payload: MarkerPayload) => void) {
        if (!this.detector) return;
        this.videoElement = video;
        this.onDetect = onMarkerDetected;
        this.isScanning = true;

        // Scan 2 times per second to save battery
        this.scanInterval = setInterval(() => this.scanFrame(), 500);
    }

    public stop() {
        this.isScanning = false;
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
    }

    private async scanFrame() {
        if (!this.isScanning || !this.videoElement || !this.detector) return;
        
        // Ensure video is playing and has dimensions
        if (this.videoElement.readyState !== this.videoElement.HAVE_ENOUGH_DATA) return;

        try {
            const barcodes = await this.detector.detect(this.videoElement);
            if (barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue;
                this.parsePayload(rawValue);
            }
        } catch (err) {
            // Ignore frame read errors
        }
    }

    private parsePayload(data: string) {
        try {
            // Expected format: JSON {"id": "ACAD_MAIN", "lat": 25.4947, "lon": 81.8641, "bearing": 90}
            const payload = JSON.parse(data) as MarkerPayload;
            if (payload.lat && payload.lon && payload.bearing !== undefined) {
                
                // Throttle detection to prevent spamming
                this.stop(); 
                
                if (this.onDetect) {
                    this.onDetect(payload);
                }

                // Resume scanning after 10 seconds to avoid duplicate lock loops on the same marker
                setTimeout(() => {
                    this.isScanning = true;
                    this.scanInterval = setInterval(() => this.scanFrame(), 500);
                }, 10000);
            }
        } catch (e) {
            console.log('Detected non-navigation QR Code:', data);
        }
    }
}
