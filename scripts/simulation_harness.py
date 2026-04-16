import numpy as np
import json
import math
import os

# --- 1. SIMULATION PARAMETERS ---
SIGMAS = [5, 10, 20]     # Noise levels in meters
DRIFT_RATE = 0.05        # Meters per step (simulating IMU dead-reckoning drift)
N_TRIALS = 100           # Full scale tests per condition
EMA_ALPHA = 0.6          # Smoothing factor
QR_INTERVAL = 15         # Simulated QR anchor every 15 steps

# WGS84 Constants for Allahabad
LAT_DEG_M = 110540.0
LON_DEG_M = 111320.0 * math.cos(math.radians(25.48)) 

def to_meters(diff_lat, diff_lon):
    return diff_lat * LAT_DEG_M, diff_lon * LON_DEG_M

def haversine(p1, p2):
    dx, dy = to_meters(p1[0]-p2[0], p1[1]-p2[1])
    return math.sqrt(dx**2 + dy**2)

# --- 2. GROUND TRUTH GENERATION (Campus Synthetic Path) ---
def get_true_path():
    """Generates an L-shaped track across campus ~400m long."""
    path = []
    lat_start = 25.48500
    lon_start = 81.85500
    
    # North segment (20 steps ~10m each)
    for i in range(20):
        lat = lat_start + (i * 10) / LAT_DEG_M
        path.append([lat, lon_start])
        
    # East segment (20 steps ~10m each)
    lat_pivot = path[-1][0]
    for i in range(1, 21):
        lon = lon_start + (i * 10) / LON_DEG_M
        path.append([lat_pivot, lon])
        
    return np.array(path)

# --- 3. NOISE INJECTION MODELS ---
def inject_noise(true_path, sigma_meters, drift_meters_per_step):
    """Applies Gaussian noise and cumulative drift simulating real mobile GNSS."""
    noisy = []
    drift_lat = 0.0
    drift_lon = 0.0
    
    sigma_lat = sigma_meters / LAT_DEG_M
    sigma_lon = sigma_meters / LON_DEG_M
    d_lat = drift_meters_per_step / LAT_DEG_M
    d_lon = drift_meters_per_step / LON_DEG_M
    
    for lat, lon in true_path:
        drift_lat += np.random.normal(d_lat, sigma_lat * 0.1)
        drift_lon += np.random.normal(d_lon, sigma_lon * 0.1)
        
        noisy.append([
            lat + np.random.normal(0, sigma_lat) + drift_lat,
            lon + np.random.normal(0, sigma_lon) + drift_lon
        ])
    return np.array(noisy)

# --- 4. ALGORITHM CONDITIONS ---

def apply_dsls(noisy_path, true_path):
    """
    DSLS (Dual-Stage Localization System):
    1. Map-Matching (snap to nearest graph node sequentially)
    2. Temporal EMA smoothing
    """
    estimated = []
    smoothed_lat, smoothed_lon = None, None
    last_idx = 0
    
    for pt in noisy_path:
        # Sequential windowed search so it doesn't snap backwards across loops
        search_window = true_path[max(0, last_idx-2) : min(len(true_path), last_idx+4)]
        distances = [haversine(pt, tp) for tp in search_window]
        local_idx = np.argmin(distances)
        last_idx = max(0, last_idx-2) + local_idx
        
        matched_lat, matched_lon = true_path[last_idx]
        
        # EMA Smoothing
        if smoothed_lat is None:
            smoothed_lat, smoothed_lon = matched_lat, matched_lon
        else:
            smoothed_lat = EMA_ALPHA * matched_lat + (1 - EMA_ALPHA) * smoothed_lat
            smoothed_lon = EMA_ALPHA * matched_lon + (1 - EMA_ALPHA) * smoothed_lon
            
        estimated.append([smoothed_lat, smoothed_lon])
    return np.array(estimated)

def apply_dsls_qr(noisy_path, true_path):
    """
    DSLS + UGP/QR:
    Uses DSLS, but perfectly zeroes error (resets tracking) every QR_INTERVAL steps
    mimicking physical campus architectural markers.
    """
    estimated = []
    smoothed_lat, smoothed_lon = None, None
    last_idx = 0
    
    for i, pt in enumerate(noisy_path):
        if i % QR_INTERVAL == 0 and i > 0:
            # Physical QR Anchor hits — reset entirely to ground truth
            smoothed_lat, smoothed_lon = true_path[i]
            last_idx = i
            estimated.append([smoothed_lat, smoothed_lon])
            continue
            
        # Sequential windowed search
        search_window = true_path[max(0, last_idx-2) : min(len(true_path), last_idx+4)]
        distances = [haversine(pt, tp) for tp in search_window]
        local_idx = np.argmin(distances)
        last_idx = max(0, last_idx-2) + local_idx
        
        matched_lat, matched_lon = true_path[last_idx]
        
        if smoothed_lat is None:
            smoothed_lat, smoothed_lon = matched_lat, matched_lon
        else:
            smoothed_lat = EMA_ALPHA * matched_lat + (1 - EMA_ALPHA) * smoothed_lat
            smoothed_lon = EMA_ALPHA * matched_lon + (1 - EMA_ALPHA) * smoothed_lon
            
        estimated.append([smoothed_lat, smoothed_lon])
        
    return np.array(estimated)

# --- 5. EXECUTION & METRICS ---
def compute_rmse(estimated, true_path):
    errors = [haversine(e, t)**2 for e, t in zip(estimated, true_path)]
    return math.sqrt(np.mean(errors))

results = {
    'parameters': {'N': N_TRIALS, 'Alpha': EMA_ALPHA, 'Drift': DRIFT_RATE},
    'sigmas': {}
}

true_graph = get_true_path()

print("Launching Phase 2 Simulation Harness...")

for sigma in SIGMAS:
    print(f"\nEvaluating Noise Level: Sigma = {sigma}m")
    
    rmse_gnss = []
    rmse_dsls = []
    rmse_dsls_qr = []
    
    for trial in range(N_TRIALS):
        # Generate stochastic run
        noisy_gnss = inject_noise(true_graph, sigma, DRIFT_RATE)
        
        # Apply Logic pipelines
        dsls_path = apply_dsls(noisy_gnss, true_graph)
        dsls_qr_path = apply_dsls_qr(noisy_gnss, true_graph)
        
        # Score
        rmse_gnss.append(compute_rmse(noisy_gnss, true_graph))
        rmse_dsls.append(compute_rmse(dsls_path, true_graph))
        rmse_dsls_qr.append(compute_rmse(dsls_qr_path, true_graph))
        
    baseline_mean = np.mean(rmse_gnss)
    dsls_mean = np.mean(rmse_dsls)
    qr_mean = np.mean(rmse_dsls_qr)
    
    results['sigmas'][f"{sigma}m"] = {
        'Baseline_GNSS_RMSE': round(float(baseline_mean), 2),
        'DSLS_RMSE': round(float(dsls_mean), 2),
        'DSLS_QR_RMSE': round(float(qr_mean), 2),
        'Cohen_D': round(float((baseline_mean - qr_mean) / np.std(rmse_gnss)), 2)
    }
    
    print(f"  GNSS-Only : {baseline_mean:.2f}m")
    print(f"  DSLS      : {dsls_mean:.2f}m")
    print(f"  DSLS+QR   : {qr_mean:.2f}m")

# Export to Docs
os.makedirs('docs', exist_ok=True)
with open('docs/simulation_results.json', 'w') as f:
    json.dump(results, f, indent=4)

print("\nSuccess: Wrote N=100 Simulation Results to docs/simulation_results.json")
