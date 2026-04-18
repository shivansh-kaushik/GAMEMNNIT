/**
 * logger.ts
 *
 * Structured navigation evaluation logger.
 *
 * Features:
 *   1. Persistent storage via localStorage (data survives page refresh)
 *   2. Multi-session tracking with timestamps
 *   3. CSV export (easier for analysis than JSON)
 *   4. Mobile-safe download via navigator.share (clipboard fallback)
 *   5. Live RMSE (pathing deviation) — vs snapped path
 *   6. Ground Truth RMSE — vs ideal A* reference path (setReferencePath)
 *   7. Position covariance tracking (λ_max from Kalman)
 *
 * Ground Truth RMSE answers the panel's question: "RMSE relative to WHAT?"
 * Answer: the A* optimal path computed at navigation start.
 *   RMSE_gt = √(Σ d(point, nearestPathSegment)² / N)
 */

export interface LogEntry {
    time: number;
    lat: number;
    lon: number;
    /** Raw GPS accuracy from device in metres */
    rawAccuracy?: number;
    /** Kalman filter's own uncertainty estimate in metres */
    estimatedAccuracy?: number;
    /** Cross-track error from map matching (snapped deviation) */
    deviation: number;
    /** Kalman-estimated speed in m/s */
    speed?: number;
    /** Turn instruction at this point */
    turn: string;
    /** Straight-line distance to destination in metres */
    distanceToTarget: number;
    /** Whether path was locked at this point */
    pathLocked?: boolean;
    /** Path lock confidence 0.0–1.0 */
    snapConfidence?: number;
    /**
     * λ_max(P_pos) in m² from Kalman covariance — tracks filter uncertainty.
     * √covMaxEigenvalue = estimated position error in metres.
     */
    covMaxEigenvalue?: number;
    /**
     * Distance from this point to the nearest segment of the ideal A* path.
     * Only populated when a reference path has been set via setReferencePath().
     */
    groundTruthDeviation?: number;
}

export interface SessionMetrics {
    sessionId: string;
    startTime: number;
    endTime?: number;
    totalPoints: number;
    rmse: number;
    meanDeviation: number;
    maxDeviation: number;
    /** Actual path length in metres (estimated from GPS track) */
    actualPathLength: number;
    /** Mean speed in m/s */
    meanSpeed: number;
    /** % of time path was locked */
    lockRate: number;
    /**
     * RMSE relative to the ideal A* reference path.
     * = √(Σ d(point, nearestPathSegment)² / N)
     * This is the academically defensible "ground truth" RMSE.
     * null if no reference path was set.
     */
    groundTruthRMSE: number | null;
    /** Mean λ_max from Kalman covariance — proxy for filter confidence */
    meanCovEigenvalue: number | null;
}

const STORAGE_KEY = 'gamemnnit_nav_logs';
const SESSION_KEY = 'gamemnnit_nav_session_id';

class Logger {
    private logs: LogEntry[] = [];
    private sessionId: string = '';
    private sessionStart: number = 0;
    /**
     * Ideal A* path set at navigation start — used as ground truth for RMSE.
     * Each point is a graph node {lat, lon} from the A* route.
     */
    private referencePath: { lat: number; lon: number }[] = [];

    constructor() {
        this.loadFromStorage();
    }

    // ── Session management ────────────────────────────────────────────────────

    private newSessionId(): string {
        return `S${Date.now().toString(36).toUpperCase()}`;
    }

    startSession(): string {
        this.logs = [];
        this.referencePath = [];
        this.sessionId = this.newSessionId();
        this.sessionStart = Date.now();
        this.persistToStorage();
        console.log('[Logger] Session started:', this.sessionId);
        return this.sessionId;
    }

    /**
     * Set the ideal A* path as ground truth for this session.
     * Call this when a destination is confirmed and the route is computed.
     *
     * @param waypoints  Array of {lat, lon} graph nodes from A* result
     */
    setReferencePath(waypoints: { lat: number; lon: number }[]): void {
        this.referencePath = waypoints;
        console.log(`[Logger] Reference path set: ${waypoints.length} nodes`);
    }

    /**
     * Compute ground truth RMSE: for each logged point, find the
     * shortest distance to any segment of the A* reference path.
     *
     * RMSE_gt = √(Σ d(point, nearestSegment)² / N)
     *
     * This is the academically defensible answer to "RMSE relative to what?"
     *
     * @returns RMSE in metres, or null if no reference path is set
     */
    computeGroundTruthRMSE(): number | null {
        if (this.referencePath.length < 2 || this.logs.length === 0) return null;
        const sumSq = this.logs.reduce((s, entry) => {
            const d = minDistToPathM(entry.lat, entry.lon, this.referencePath);
            return s + d * d;
        }, 0);
        return +Math.sqrt(sumSq / this.logs.length).toFixed(3);
    }

    // ── Data collection ───────────────────────────────────────────────────────

    add(entry: LogEntry): void {
        this.logs.push(entry);
        // Persist every 10 entries to avoid excessive storage writes
        if (this.logs.length % 10 === 0) {
            this.persistToStorage();
        }
    }

    get count(): number { return this.logs.length; }
    get currentSessionId(): string { return this.sessionId; }

    // ── Metrics computation ───────────────────────────────────────────────────

    /**
     * Compute evaluation metrics for the current session.
     * RMSE is calculated over cross-track error (deviation from ideal path).
     */
    computeMetrics(): SessionMetrics {
        const n = this.logs.length;
        if (n === 0) {
            return {
                sessionId: this.sessionId,
                startTime: this.sessionStart,
                totalPoints: 0,
                rmse: 0, meanDeviation: 0, maxDeviation: 0,
                actualPathLength: 0, meanSpeed: 0, lockRate: 0,
                groundTruthRMSE: null, meanCovEigenvalue: null,
            };
        }

        // RMSE of cross-track error
        const sumSq = this.logs.reduce((s, e) => s + e.deviation ** 2, 0);
        const rmse = Math.sqrt(sumSq / n);

        const deviations = this.logs.map(e => e.deviation);
        const meanDeviation = deviations.reduce((s, v) => s + v, 0) / n;
        const maxDeviation = Math.max(...deviations);

        // Actual path length (sum of haversine distances between consecutive fixes)
        let actualPathLength = 0;
        for (let i = 1; i < n; i++) {
            actualPathLength += haversineM(
                this.logs[i - 1].lat, this.logs[i - 1].lon,
                this.logs[i].lat,     this.logs[i].lon
            );
        }

        const speedEntries = this.logs.filter(e => e.speed !== undefined);
        const meanSpeed = speedEntries.length > 0
            ? speedEntries.reduce((s, e) => s + (e.speed ?? 0), 0) / speedEntries.length
            : 0;

        const lockEntries = this.logs.filter(e => e.pathLocked !== undefined);
        const lockRate = lockEntries.length > 0
            ? lockEntries.filter(e => e.pathLocked).length / lockEntries.length
            : 0;

        const covEntries = this.logs.filter(e => e.covMaxEigenvalue != null);
        const meanCovEigenvalue = covEntries.length > 0
            ? +(covEntries.reduce((s, e) => s + (e.covMaxEigenvalue ?? 0), 0) / covEntries.length).toFixed(3)
            : null;

        return {
            sessionId: this.sessionId,
            startTime: this.sessionStart,
            endTime: Date.now(),
            totalPoints: n,
            rmse: +rmse.toFixed(3),
            meanDeviation: +meanDeviation.toFixed(3),
            maxDeviation: +maxDeviation.toFixed(3),
            actualPathLength: +actualPathLength.toFixed(1),
            meanSpeed: +meanSpeed.toFixed(2),
            lockRate: +lockRate.toFixed(3),
            groundTruthRMSE: this.computeGroundTruthRMSE(),
            meanCovEigenvalue,
        };
    }

    /** Live RMSE — cheap to call on every log entry */
    liveRMSE(): number {
        if (this.logs.length === 0) return 0;
        const sum = this.logs.reduce((s, e) => s + e.deviation ** 2, 0);
        return Math.sqrt(sum / this.logs.length);
    }

    // ── Storage ───────────────────────────────────────────────────────────────

    private persistToStorage(): void {
        try {
            const payload = {
                sessionId: this.sessionId,
                sessionStart: this.sessionStart,
                logs: this.logs,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
            console.warn('[Logger] localStorage write failed (quota exceeded?)');
        }
    }

    private loadFromStorage(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const payload = JSON.parse(raw);
            this.sessionId    = payload.sessionId ?? this.newSessionId();
            this.sessionStart = payload.sessionStart ?? Date.now();
            this.logs         = Array.isArray(payload.logs) ? payload.logs : [];
            console.log(`[Logger] Restored ${this.logs.length} entries from session ${this.sessionId}`);
        } catch (e) {
            console.warn('[Logger] Could not restore from localStorage');
        }
    }

    // ── Export ────────────────────────────────────────────────────────────────

    /** Generate CSV string from current session logs */
    toCSV(): string {
        const header = [
            'timestamp', 'lat', 'lon',
            'raw_accuracy_m', 'estimated_accuracy_m',
            'deviation_m', 'speed_ms',
            'path_locked', 'snap_confidence',
            'cov_eigenvalue_m2', 'gt_deviation_m',
            'turn', 'distance_to_target_m'
        ].join(',');

        const rows = this.logs.map(e => [
            e.time,
            e.lat.toFixed(8),
            e.lon.toFixed(8),
            (e.rawAccuracy ?? '').toString(),
            (e.estimatedAccuracy ?? '').toString(),
            e.deviation.toFixed(3),
            (e.speed ?? '').toString(),
            e.pathLocked ? '1' : '0',
            (e.snapConfidence ?? '').toString(),
            (e.covMaxEigenvalue ?? '').toString(),
            (e.groundTruthDeviation ?? '').toString(),
            `"${e.turn}"`,
            e.distanceToTarget.toFixed(1)
        ].join(','));

        return [header, ...rows].join('\n');
    }

    /** Download logs — uses navigator.share on mobile (avoids a.click() block) */
    async download(): Promise<void> {
        if (this.logs.length === 0) {
            alert('[Logger] No logs in current session. Start logging and walk around first.');
            return;
        }

        // Always persist before exporting
        this.persistToStorage();

        const metrics = this.computeMetrics();
        const csvContent = this.toCSV();
        const jsonContent = JSON.stringify({ metrics, logs: this.logs }, null, 2);

        const csvBlob  = new Blob([csvContent],  { type: 'text/csv' });
        const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
        const filename = `nav_log_${this.sessionId}_${new Date().toISOString().slice(0,10)}`;

        // Try navigator.share (works natively on mobile)
        if (navigator.share && navigator.canShare) {
            try {
                const csvFile  = new File([csvBlob],  `${filename}.csv`,  { type: 'text/csv' });
                const jsonFile = new File([jsonBlob], `${filename}.json`, { type: 'application/json' });

                if (navigator.canShare({ files: [csvFile, jsonFile] })) {
                    await navigator.share({
                        title: `GAMEMNNIT Navigation Log — ${this.sessionId}`,
                        text: `RMSE: ${metrics.rmse}m | Points: ${metrics.totalPoints} | Lock: ${(metrics.lockRate * 100).toFixed(1)}%`,
                        files: [csvFile, jsonFile],
                    });
                    return;
                }
            } catch (e) {
                console.warn('[Logger] navigator.share failed, falling back');
            }
        }

        // Desktop fallback: anchor click download
        const downloadFile = (blob: Blob, name: string) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        };

        downloadFile(csvBlob,  `${filename}.csv`);
        downloadFile(jsonBlob, `${filename}.json`);

        console.log(`[Logger] Downloaded ${this.logs.length} entries. Metrics:`, metrics);
    }

    /** Clear current session (keeps localStorage clean) */
    clear(): void {
        this.logs = [];
        this.persistToStorage();
    }
}

// Haversine distance in metres (local utility — avoids circular imports)
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Minimum distance in metres from (lat, lon) to any segment of path[].
 * Uses haversine for segment endpoint distances and linear segment projection
 * in ENU-approximate coordinates for cross-track distance.
 */
function minDistToPathM(lat: number, lon: number, path: { lat: number; lon: number }[]): number {
    if (path.length === 0) return 0;
    if (path.length === 1) return haversineM(lat, lon, path[0].lat, path[0].lon);

    let minDist = Infinity;

    // Use ENU-approximate projection (valid for distances < 100km)
    const cosLat = Math.cos(lat * Math.PI / 180);

    const px = (lon - path[0].lon) * cosLat * 111320;
    const py = (lat - path[0].lat) * 110540;

    for (let i = 0; i < path.length - 1; i++) {
        const ax = (path[i].lon   - path[0].lon) * cosLat * 111320;
        const ay = (path[i].lat   - path[0].lat) * 110540;
        const bx = (path[i+1].lon - path[0].lon) * cosLat * 111320;
        const by = (path[i+1].lat - path[0].lat) * 110540;

        const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
        if (l2 === 0) {
            minDist = Math.min(minDist, Math.sqrt((px - ax) ** 2 + (py - ay) ** 2));
            continue;
        }

        const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2));
        const nearX = ax + t * (bx - ax);
        const nearY = ay + t * (by - ay);
        const dist = Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
        minDist = Math.min(minDist, dist);
    }

    return minDist; // already in metres (ENU-space)
}

export default new Logger();
