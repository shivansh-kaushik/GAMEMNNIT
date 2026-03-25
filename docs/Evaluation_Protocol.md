# System Evaluation Protocol (MNNIT AR Navigation)

This document formally outlines the testing methodology required to validate the Dual-Stage Localization Architecture (Map Matching + QR Ground Truth). Successful execution of these protocols provides the empirical evidence required for an M.Tech Thesis or a tier-1 conference (IEEE/ISMAR).

## Core Objective
Prove that the system mathematically mitigates raw sensor unreliability (GPS drift/compass noise) via Map-Matching constraints and Ground Truth Anchor resets.

---

## 🏗️ Test Preparation (Pilot Deployment)

Do not paste all 15 markers initially. Select a targeted testing perimeter across 4 diverse environments:

1. **Junction Anchor:** `ACAD_LIB_JUNCTION` (Tests rapid yaw/bearing recalculation at a fork path).
2. **Long Path Stabilizer:** `LONG_PATH_ACAD_1` (Tests continuous drift cancellation).
3. **Indoor Transition:** `LIBRARY_PORCH` (Tests GPS signal degradation behavior).
4. **Concrete Heavy Area:** `ADMIN_RECEPTION` (Tests extreme hardware magnetometer interference).

**Preparation Steps:**
1. Execute `node scripts/generate_printable_qrs.js`.
2. Open `printable_qrs.html` in Chrome and Print (A4).
3. Cut and tape the 4 markers exactly at the target coordinates described in `qr_markers.json`. Ensure the marker is clearly visible at chest-to-eye height with the `📍 Scan for AR Navigation Accuracy` label intact.

---

## 🧪 Evaluation Scenarios & Logging

Run these tests while the "Dev Diagnostic Tool" (Telemetry Overlay) is visible on-screen. Do not use screen recording; use the application's built-in `logger` to export CSV data.

### 🔴 SCENARIO 1: Unconstrained Baseline (The Control)
* **Goal:** Document how bad raw GPS is.
* **Test:** Walk from the Academic Building to the Library. 
* **Action:** Before walking, temporarily disable the Level 1.5 path snapping in the code (return `rawLat` and `rawLon` directly to the AR engine).
* **Observe:** The AR arrows will jump into walls, point laterally, and jitter.
* **Log Metric:** `Raw GPS Deviation` (m).

### 🟢 SCENARIO 2: Level 1.5 Map Matching (The Filter) 
* **Goal:** Prove the constraint engine stabilizes the UI.
* **Test:** Walk the exact same path with `advancedSnapToPath` re-enabled.
* **Action:** Even if you walk 5m slightly off the path on the grass, the system should strictly lock you to the computational edge.
* **Observe:** The UI badge reads `🔒 Path Locked (98%)` and the AR arrow remains perfectly centered.
* **Log Metric:** `Smoothed Cross-Track Error` vs `Raw Error`.

### 🟣 SCENARIO 3: Forced Failure & Absolute Correction (The Anchor)
* **Goal:** Prove Level 2 Ground Truth resolves absolute offset accumulation.
* **Test:** Begin navigating in a degraded area (e.g. under thick canopy near Admin).
* **Action:** Monitor the telemetry. The UI should eventually glow amber: `🔄 Reacquiring Route...` indicating the 20m tolerance broke. 
* **Execution:** Turn to the QR Marker and scan it.
* **Observe:** 
    1. The visual jump of the AR Arrow as it hard-resets.
    2. The UI switches to `🎯 Ground Truth Anchor: ADMIN_RECEPTION`.
    3. The `crossTrackError` instantly zeroizes.
* **Log Metric (Critical):** `Error Reduction Ratio (ERR)` = (Drift Distance Pre-Scan) / (Drift Distance Post-Scan).

---

## 📊 Data Collection & Thesis Presentation

After running the scenarios 5 times each, download the `navigation_logs.csv` from the app.

For your thesis evaluation section, generate two graphs:
1. **Temporal Stability Graph:** A line chart plotting `Time (s)` vs `Lateral Deviation (m)`. Show two lines: Raw GPS (highly erratic) vs Map-Matched Route (smooth line).
2. **The "Correction Drop" Graph:** A line chart showing `Absolute Position Error (m)` growing over time, then plunging vertically to `0.0m` at `t=scan` when the QR anchor is detected.

**Conclusion Statement Example:**
> "By implementing a Dual-Stage Localization pipeline, the system reduced mean cross-track navigational error from 8.2m (Raw GPS) to 1.1m, with absolute coordinate drift mitigated indefinitely via periodic strategic physical QR anchor node interactions."
