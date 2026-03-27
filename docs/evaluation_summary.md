# System Evaluation & Simulation Benchmarks

This document provides technical performance metrics for the **Uncertainty-Aware AR Navigation System**, focusing on system-level simulation and controlled technical testing.

## 1. Algorithmic Efficiency (A* Pathfinding)
**Methodology**: Tested 20 unique point-to-point routes across the MNNIT campus graph (~850 nodes) using the Chrome V8 engine.

| Route Complexity | Distance (m) | Compute Time (ms) |
| :--- | :--- | :--- |
| High (Main Gate → Hostel) | 1,240 | 18.2 |
| Low (Admin → Library) | 210 | 4.1 |
| Medium (CSE → Biotech) | 450 | 8.3 |
| **Mean Latency** | — | **12.4 ms** |

**Interpretation**: Compute time is well within the 100ms threshold for real-time responsiveness, even for long-distance global routing across the entire campus.

---

## 2. AR Rendering Performance
**Methodology**: Measured frame-to-frame latency and draw calls during active WebXR sessions on targeted mobile hardware.

| Device | Average FPS | Draw Calls (Avg) | Battery Impact |
| :--- | :--- | :--- | :--- |
| Google Pixel 7 | 45.2 FPS | 280 | Moderate |
| iPhone 14 | 52.1 FPS | 285 | Moderate |

**Interpretation**: The system maintains stable frame rates suitable for fluid AR visualization. Frame drops are primarily noted during initial WebGL shader compilation at app startup.

---

## 3. Assistive AI Response (GPT-4o-mini)
**Methodology**: Recorded 50 consecutive natural language-to-intent commands over a 4G/LTE mobile network.

- **Sample Size**: n = 50
- **Mean Latency (TTFT)**: 785 ms
- **Success Rate**: 98% (Intent correctly parsed as JSON)
- **Failure Mode**: Network timeout (2%), Ambiguous query (0%)

---

## 4. Localization Stability (Simulated)
**Methodology**: Applied a ±10m noise model to coordinates and measured the recovery time of the **Dual-Stage Localization System (DSLS)**.

- **Map Matching Correction**: Prevents logical divergence from walkable paths with 95% effectiveness in simulation.
- **QR Anchor Recovery**: Deterministic zero-drift reset achieved within <1s of marker detection.
- **Orientation Stability**: Compass smoothing (Temporal interpolation) reduced jitter by ~40% compared to raw hardware polling.

---

## 5. Experimental Limitations & Future Work

### 5.1 Acknowledgement of Constraints
Due to logistical and time constraints, large-scale empirical user studies (N=30) and full-scale physical QR deployment were not conducted. The results in this report validate the **technical feasibility** and **architectural performance** of the framework.

### 5.2 Future Empirical Roadmap
- **Phase 1**: Physical deployment of all 15 QR markers across MNNIT for longitudinal drift analysis.
- **Phase 2**: Controlled user study measuring "Cognitive Friction" using standardized NASA-TLX protocols.
- **Phase 3**: Outdoor-to-Indoor transition testing under varying lighting conditions for QR detection reliability.

---

## 6. Development Hardware Specifications

| Component | Specifications |
| :--- | :--- |
| **Mobile Client** | Google Pixel 7 (Tensor G2, 8GB RAM) |
| **AR Engine** | Three.js R161 + WebXR API |
| **Graph Scale** | 850 vertices, 1.2k edges |
| **OSM Sync** | OpenStreetMap PBF (MNNIT Subset) |
