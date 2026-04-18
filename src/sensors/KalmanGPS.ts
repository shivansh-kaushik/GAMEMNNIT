/**
 * KalmanGPS.ts  —  ENU-Space Kalman Filter with IMU Injection
 *
 * State vector: x = [e, n, vE, vN]  (all in METRES, East-North-Up tangent plane)
 *   e, n  = easting / northing relative to first GPS fix origin
 *   vE,vN = horizontal velocity in m/s
 *
 * WHY ENU instead of lat/lon:
 *   In the previous (lat/lon) formulation, the covariance P mixed degrees
 *   and deg²/s — physically meaningless. In ENU, P[0] = σ_e² in m²,
 *   P[5] = σ_n² in m², making every element physically interpretable.
 *
 * IMU Injection:
 *   DeviceMotion acceleration [aE, aN] (world-frame, m/s²) is injected via
 *   updateIMU() at ~60 Hz between GPS fixes (~1 Hz). This dramatically
 *   reduces prediction drift during the 1-second inter-fix gaps.
 *
 * Confidence Cone Formula (PhD-level):
 *   The cone half-angle is driven by the largest eigenvalue of the 2×2
 *   position covariance block P_pos = [[P[0],P[1]],[P[4],P[5]]]:
 *
 *     λ_max = (P[0]+P[5])/2 + √((P[0]−P[5])²/4 + P[1]²)
 *     θ = k · √λ_max   (k = AR world scale, empirically 0.1)
 *
 * References:
 *   Welch & Bishop, "An Introduction to the Kalman Filter", UNC 2006
 *   Groves, "Principles of GNSS, Inertial, and Multisensor Integrated
 *     Navigation Systems", 2nd ed., Artech House, 2013
 *   Wendel et al., "A Performance Comparison of Tightly and Loosely
 *     Coupled GPS/INS Integration", NAVIGATION, 53(3), 2006
 */

/** ENU local coordinate system origin (set on first GPS fix). */
interface ENUOrigin {
    lat: number;   // degrees
    lon: number;   // degrees
    cosLat: number; // cos(lat * π/180) — cached for lon→metres conversion
}

export interface KalmanState {
    /** Kalman-filtered latitude in decimal degrees */
    lat: number;
    /** Kalman-filtered longitude in decimal degrees */
    lon: number;
    /** Speed in m/s derived from velocity state */
    speed: number;
    /**
     * True bearing (0–360°) from velocity vector — actual movement direction.
     * Returns -1 when stationary (speed < 0.3 m/s) — use compass instead.
     */
    gpsBearing: number;
    /**
     * √(λ_max(P_pos)) — position uncertainty in metres from Kalman covariance.
     * More stable than raw GPS accuracy because it converges over time.
     */
    estimatedAccuracy: number;
    /**
     * λ_max(P_pos) in m² — the maximum eigenvalue of the 2×2 position
     * covariance block.  Used directly for the thesis confidence cone:
     *   cone_spread = k · √covMaxEigenvalue
     */
    covMaxEigenvalue: number;
    /** Easting in metres from origin (ENU debug) */
    easting: number;
    /** Northing in metres from origin (ENU debug) */
    northing: number;
}

/** Process noise spectral density for position & velocity (m², (m/s)²) */
const Q_POS  = 0.5;   // position uncertainty growth per step
const Q_VEL  = 0.25;  // velocity uncertainty growth per step

/** Minimum GPS accuracy to trust (metres) — avoids unrealistic trust in bad fixes */
const MIN_GPS_ACCURACY = 2.0;

export class KalmanGPS {
    // ── State ─────────────────────────────────────────────────────────────────
    /** [e, n, vE, vN] in metres and m/s */
    private x: number[] = [0, 0, 0, 0];

    /**
     * Error covariance matrix (4×4), row-major flat array.
     * Initial covariance: large position uncertainty (100 m²), small velocity.
     */
    private P: number[] = [
        100, 0,   0,   0,
        0,   100, 0,   0,
        0,   0,   1,   0,
        0,   0,   0,   1,
    ];

    private origin: ENUOrigin | null = null;
    private initialized = false;
    private lastTimestamp = 0;

    // ── IMU state (updated at ~60 Hz via updateIMU) ────────────────────────
    /** Latest world-frame acceleration in m/s² */
    private imu = { aE: 0, aN: 0 };
    /** Timestamp of last IMU update (ms) */
    private lastIMUTime = 0;

    // ── Public API ────────────────────────────────────────────────────────────

    /** Initialize the filter with the first GPS fix. */
    init(lat: number, lon: number, timestamp: number): void {
        this.origin = {
            lat,
            lon,
            cosLat: Math.cos(lat * Math.PI / 180),
        };
        this.x = [0, 0, 0, 0];  // ENU origin
        this.lastTimestamp = timestamp;
        this.initialized = true;
    }

    /**
     * Inject a DeviceMotion acceleration reading (world-frame ENU).
     *
     * Called asynchronously at ~60 Hz from a DeviceMotion listener.
     * The acceleration is stored and used on the next GPS update's
     * prediction step.
     *
     * @param aE   Eastward acceleration in m/s²  (≈ −accelX·sin(ψ) + accelY·cos(ψ))
     * @param aN   Northward acceleration in m/s² (≈  accelX·cos(ψ) + accelY·sin(ψ))
     * @param timestamp  performance.now() or Date.now() in ms
     */
    updateIMU(aE: number, aN: number, timestamp: number): void {
        this.imu = { aE, aN };
        this.lastIMUTime = timestamp;
    }

    /**
     * Feed a new GPS fix through the filter.
     *
     * @param lat       Raw latitude from watchPosition (degrees)
     * @param lon       Raw longitude from watchPosition (degrees)
     * @param accuracy  GPS horizontal accuracy in metres
     * @param timestamp Epoch milliseconds (GeolocationPosition.timestamp)
     */
    update(lat: number, lon: number, accuracy: number, timestamp: number): KalmanState {
        if (!this.initialized) {
            this.init(lat, lon, timestamp);
            return this.buildState();
        }

        const dt = Math.max(0.05, (timestamp - this.lastTimestamp) / 1000);
        this.lastTimestamp = timestamp;
        const o = this.origin!;

        // ── Convert GPS measurement to ENU metres ─────────────────────────────
        const measE = (lon - o.lon) * o.cosLat * 111320;
        const measN = (lat - o.lat) * 110540;

        // ── PREDICT (with IMU control input) ──────────────────────────────────
        const { aE, aN } = this.imu;
        const dt2 = dt * dt;

        // x_pred = F·x + B·u
        const x_pred = [
            this.x[0] + this.x[2] * dt + 0.5 * aE * dt2,
            this.x[1] + this.x[3] * dt + 0.5 * aN * dt2,
            this.x[2] + aE * dt,
            this.x[3] + aN * dt,
        ];

        // P_pred = F·P·Fᵀ + Q
        const P_pred = this.predictCovariance(dt);

        // ── UPDATE (GPS measurement) ──────────────────────────────────────────
        // Measurement matrix H = [[1,0,0,0],[0,1,0,0]]
        // Measurement noise R: use GPS accuracy directly in m²
        const sigma2 = Math.max(MIN_GPS_ACCURACY, accuracy) ** 2;

        // Innovation covariance S = H·P_pred·Hᵀ + R (diagonal)
        const S00 = P_pred[0] + sigma2;
        const S11 = P_pred[5] + sigma2;

        // Kalman gain K = P_pred·Hᵀ·S⁻¹  (4×2, stored as [K_col0, K_col1] interleaved)
        const Ke = [P_pred[0] / S00, P_pred[4] / S00, P_pred[8] / S00,  P_pred[12] / S00];
        const Kn = [P_pred[1] / S11, P_pred[5] / S11, P_pred[9] / S11,  P_pred[13] / S11];

        // Innovation
        const innov_e = measE - x_pred[0];
        const innov_n = measN - x_pred[1];

        // Updated state
        this.x = [
            x_pred[0] + Ke[0] * innov_e + Kn[0] * innov_n,
            x_pred[1] + Ke[1] * innov_e + Kn[1] * innov_n,
            x_pred[2] + Ke[2] * innov_e + Kn[2] * innov_n,
            x_pred[3] + Ke[3] * innov_e + Kn[3] * innov_n,
        ];

        // Updated covariance P = (I − K·H)·P_pred
        this.updateCovariance(Ke, Kn, P_pred);

        return this.buildState();
    }

    /**
     * λ_max of the 2×2 position covariance block P_pos.
     *
     * For the confidence cone:
     *   cone_spread_ar = k · √(covarianceMaxEigenvalue())
     *
     * Analytical formula for 2×2 symmetric matrix eigenvalue:
     *   λ_max = (a+d)/2 + √((a−d)²/4 + b²)
     *   where P_pos = [[a, b], [b, d]]
     */
    covarianceMaxEigenvalue(): number {
        const a = this.P[0];  // σ_e²
        const b = this.P[1];  // σ_en (cross-correlation)
        const d = this.P[5];  // σ_n²
        return (a + d) / 2 + Math.sqrt(((a - d) ** 2) / 4 + b * b);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private predictCovariance(dt: number): number[] {
        // P_pred = F·P·Fᵀ + Q for constant-velocity F
        // Analytical closed-form for this specific F structure:
        const P = this.P;
        const dt2 = dt * dt;
        return [
            P[0]  + dt*(P[8] +P[2]) + dt2*P[10] + Q_POS,
            P[1]  + dt*(P[9] +P[3]) + dt2*P[11],
            P[2]  + dt*P[10],
            P[3]  + dt*P[11],
            P[4]  + dt*(P[12]+P[6]) + dt2*P[14],
            P[5]  + dt*(P[13]+P[7]) + dt2*P[15] + Q_POS,
            P[6]  + dt*P[14],
            P[7]  + dt*P[15],
            P[8]  + dt*P[10],
            P[9]  + dt*P[11],
            P[10]                   + Q_VEL,
            P[11],
            P[12] + dt*P[14],
            P[13] + dt*P[15],
            P[14],
            P[15]                   + Q_VEL,
        ];
    }

    private updateCovariance(Ke: number[], Kn: number[], P_pred: number[]): void {
        // P = (I − KH)·P_pred  with H = [I₂|0₂] (observe position only)
        // IKH = I − K·H  (4×4)
        const IKH = [
            1 - Ke[0],  -Kn[0],   0, 0,
            -Ke[1],  1 - Kn[1],   0, 0,
            -Ke[2],    -Kn[2],    1, 0,
            -Ke[3],    -Kn[3],    0, 1,
        ];
        this.P = matMul4(IKH, P_pred);
    }

    private buildState(): KalmanState {
        const [e, n, vE, vN] = this.x;
        const o = this.origin!;

        // ENU → GPS
        const lat = n / 110540 + o.lat;
        const lon = e / (111320 * (o.cosLat || 1)) + o.lon;

        // Speed and bearing from velocity
        const speed = Math.sqrt(vE * vE + vN * vN);
        const gpsBearing = speed > 0.3
            ? (Math.atan2(vE, vN) * 180 / Math.PI + 360) % 360
            : -1;

        // Position uncertainty metrics
        const covMax = this.covarianceMaxEigenvalue();
        const estimatedAccuracy = Math.sqrt(Math.max(0, covMax));

        return { lat, lon, speed, gpsBearing, estimatedAccuracy, covMaxEigenvalue: covMax, easting: e, northing: n };
    }
}

/** 4×4 matrix multiplication (row-major flat arrays). */
function matMul4(A: number[], B: number[]): number[] {
    const C = new Array(16).fill(0);
    for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
            let s = 0;
            for (let k = 0; k < 4; k++) s += A[i * 4 + k] * B[k * 4 + j];
            C[i * 4 + j] = s;
        }
    return C;
}
