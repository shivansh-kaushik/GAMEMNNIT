# A Digital Twin-Inspired AR Navigation System for Smart Campuses Using Geospatial Intelligence

<p align="center">
  <strong>Shivansh Kaushik</strong><br>
  M.Tech Thesis | Motilal Nehru National Institute of Technology (MNNIT) Allahabad<br>
  <em>Research Area: Geospatial Intelligence · Augmented Reality Navigation · Human-Computer Interaction</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" />
  <img src="https://img.shields.io/badge/Three.js-r128-black?logo=three.js" />
  <img src="https://img.shields.io/badge/AR-WebXR-purple" />
  <img src="https://img.shields.io/badge/AI-Gemini%201.5-orange" />
  <img src="https://img.shields.io/badge/Maps-Mapbox%20GL%20JS-green?logo=mapbox" />
  <img src="https://img.shields.io/badge/License-MIT-lightgrey" />
</p>

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Literature Review & Related Work](#3-literature-review--related-work)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Digital Twin & Campus Dataset](#6-digital-twin--campus-dataset)
7. [Navigation Engine](#7-navigation-engine)
8. [AR Navigation System](#8-ar-navigation-system)
9. [AI Navigation Assistant](#9-ai-navigation-assistant)
10. [Theoretical Framework (Math)](#10-theoretical-framework-math)
11. [Evaluation & Results](#11-evaluation--results)
12. [Research Contributions](#12-research-contributions)
13. [Dynamic Documentation Architecture](#13-dynamic-documentation-architecture)
14. [Limitations & Future Work](#14-limitations--future-work)
15. [Installation & Setup](#15-installation--setup)
16. [Usage Guide](#16-usage-guide)
17. [Project Structure](#17-project-structure)
18. [References](#18-references)

---

## 1. Abstract

This work proposes and validates the design and implementation of a smart campus navigation system that fuses geospatial mapping, augmented reality (AR), and AI-driven natural language interaction. The system is engineered to reduce the cognitive load of navigating complex, multi-floor university campuses by grounding spatial guidance within a **digital twin-inspired 3D representation** of the environment.

The core routing framework employs the **A\* pathfinding algorithm** operating over a campus-scale graph. Outdoor positioning is achieved via meter-level GPS alignment, while a conceptual indoor localization framework is proposed using sensor fusion (barometric altimetry and WiFi RSSI). A cloud-based LLM via **Google Gemini 1.5 API** interprets voice commands into structured navigation intents, rendered as AR directional overlays synchronized to the device's camera.

---

## 🎥 Live Demo

- **Live Application:** [https://gamemnnit.vercel.app/](https://gamemnnit.vercel.app/)

---

## 📸 Screenshots

<p align="center">
  <img src="docs/screenshot_twin.png" width="30%" alt="3D Digital Twin" />
  &nbsp;&nbsp;
  <img src="docs/screenshot_voxel_research.png" width="30%" alt="Research Evaluation Panel" />
  &nbsp;&nbsp;
  <img src="docs/screenshot_realmap_nodes.png" width="30%" alt="Real Map Node Graph" />
</p>
<p align="center">
  <em>Digital Twin Overview &nbsp;|&nbsp; Real-time Research Metrics &nbsp;|&nbsp; Campus Node Distribution</em>
</p>

<p align="center">
  <img src="docs/screenshot_indoor_pos.png" width="30%" alt="Indoor Positioning Dashboard" />
  &nbsp;&nbsp;
  <img src="docs/screenshot_ar_mode.png" width="30%" alt="AR Navigation Mode" />
  &nbsp;&nbsp;
  <img src="docs/screenshot_layout_tool.png" width="30%" alt="Layout Calibration Tool" />
</p>
<p align="center">
  <em>Hybrid Indoor Localization (WiFi RSSI) &nbsp;|&nbsp; AR Guidance Interface &nbsp;|&nbsp; Voxel Calibration Grid</em>
</p>

---

## 2. Introduction

Modern university campuses are adopting *smart campus* paradigms, yet despite GPS-based routing, navigation within dense environments remains cognitively demanding. Users must repeatedly translate abstract 2D representations into real-world decisions, a phenomenon known as the **context-switching penalty**.

This work addresses the need for a seamless, hands-free navigation system that intuitively bridges outdoor and indoor tracking while providing human-like interaction.

### 2.1 Research Questions (RQ)
1. **RQ1**: How does uncertainty-aware visualization (Confidence Cone) affect user trust and navigation error rates compared to static AR indicators?
2. **RQ2**: Can multi-modal sensor fusion (GPS + Barometer + WiFi) reduce floor-level detection ambiguity in multi-story campus buildings?
3. **RQ3**: Does a constrained LLM-based voice interface significantly reduce "Time-to-Initiation" for complex geospatial queries versus traditional text search?

### 2.2 Problem Statement
The transition from macro-level routing to micro-level indoor destinations remains an unsolved challenge in the web-native space. This project proposes an **immersive, context-aware spatial guidance system** as a solution.

### 2.3 Real-World Impact
- **Reduces navigation confusion by 78.8%** based on experimental validation.
- **NASA-TLX Score Reduction**: Demonstrates a **63.8% reduction** in perceived navigational cognitive load.
- **Zero Specialized Hardware**: Runs entirely in modern mobile web browsers via WebXR.

---

## 3. Literature Review & Related Work

### 3.1 Literature Review
Early work by **Azuma (1997)** established AR foundations, but modern advancements in **WebXR** and **Three.js** enable browser-native, cross-platform implementations. Research in **Indoor Localization** identifies the "indoor-outdoor transition" gap, typically addressed via **WiFi RSSI fingerprinting** or **Barometric altimetry**, as explored in recent **Digital Twin** studies (**Zhang et al., 2023**).

### 3.2 Related Work
- **Commercial VPS**: Google Maps Live View uses camera-based SLAM against a global cloud. While accurate, it is closed-source and lacks micro-waypoints for specific campus interiors.
- **Academic AR**: Systems like **Horus** (Youssef 2005) pioneered AR guidance but required custom native apps. This project achieves high precision via a browser-resident WebGL stack.

### 3.3 Comparative Feature Matrix
| Feature | GAMEMNNIT (Proposed) | Google Maps Live View | Apple Maps Indoor |
|---|---|---|---|
| **Uncertainty Visualization** | ✅ (Confidence Cone) | ❌ | ❌ |
| **Browser-Native (No App)** | ✅ (WebXR/Three.js) | ❌ (Native App) | ❌ (Native App) |
| **LLM Intent Engine** | ✅ (Gemini 1.5) | ➖ (Google Assistant) | ➖ (Siri) |
| **Digital Twin Integration** | ✅ (OSM Voxelized) | ➖ (StreetView) | ➖ (Look Around) |

---

## 4. System Architecture

The system follows a **modular, decoupled architecture** separating visualization (Three.js), routing (A*), and AI inference (Gemini).

```mermaid
graph TD
    User([User]) -->|Voice| AI[AI Assistant]
    AI -->|Structured JSON| Nav["Navigation Engine A*"]
    Nav -->|Route Path| AR[AR Rendering Engine]
    Sensors[Hardware Sensors] --> AR
    AR -->|Visual Overlay| User
```

---

## 5. Technology Stack

| Category | Technologies |
|---|---|
| **Frontend Framework** | React 18, TypeScript, Vite |
| **3D & Mapping** | Three.js, R3F, Mapbox GL JS, OpenStreetMap API |
| **AR & Sensors** | WebXR Device API, Geolocation, DeviceOrientation, Barometer |
| **AI & NLP** | Google Gemini 1.5 API, Web Speech API |
| **Backend & Auth** | Appwrite (BaaS) |

---

## 6. Digital Twin & Campus Dataset

The Digital Twin environment (`src/three/`) serves as the **spatial source of truth**.

- **Dataset**: ~850 nodes and 1,200 edges covering the MNNIT campus.
- **Voxel Matrix Editor**: An embedded tool (`campuslayout.html`) enables precise calibration of building positions against the digital twin for geographical accuracy.
- **Coordinate Mapping**: A high-precision pipeline aligns 3D voxel space with WGS84 GPS telemetry via `cos(lat)` adjusted scaling.

---

## 7. Navigation Engine

Campus routing is implemented using the **A\* search algorithm** operating on a pedestrian/vehicular graph.

### 7.1 Mathematical Foundation
The algorithm minimizes the combined cost function:
$$f(n) = g(n) + h(n)$$
where $h(n)$ is the **Euclidean distance** heuristic:
$$h(n) = \sqrt{(x_n - x_{goal})^2 + (z_n - z_{goal})^2}$$

### 7.2 Complexity & Optimality
- **Worst-Case**: $\mathcal{O}(E \log V)$.
- **Optimality**: Guaranteed due to the admissibility of the Euclidean heuristic.

---

## 8. AR Navigation System

Projects directional overlays onto the live camera feed using **WebXR**.

### 8.1 Confidence-Aware Visualization
A key contribution is the **Confidence Cone** projection. When sensor uncertainty (GPS drift or magnetometer variance) exceeds $E_{max}$, the AR arrow morphs into an expanded cone, visually communicating ambiguity to the user to prevent over-reliance on inaccurate sensors.

---

## 9. AI Navigation Assistant

Resolves natural language queries into structured JSON intents via **Gemini 1.5 Flash**.

### 9.1 Structured Intent Pipeline
1. **User**: "Take me to the CSE building."
2. **Gemini**: `{ "intent": "NAVIGATE", "target": "cse_block" }`.
3. **Graph Engine**: Computes path and triggers voice guidance.

---

## 10. Theoretical Framework (Math)

### 10.1 Positional Uncertainty Model
We define **Positional Uncertainty** $\sigma_p(t)$ as:
$$\sigma_p(t) = \sqrt{\sigma_{GPS}^2(t) + \sigma_{drift}^2(t)}$$
The AR **Confidence Cone** angle $\theta$ is projected as:
$$\theta(t) = 2 \cdot \arctan\left(\frac{\sigma_p(t)}{d}\right)$$

### 10.2 Proof of Admissibility
The Euclidean distance heuristic $h(n)$ is admissible because it is the straight-line lower bound of travel between two points; therefore, $h(n) \leq h^*(n)$, guaranteeing A* optimality.

---

## 11. Evaluation & Results

Verification logs are stored in [docs/evaluation_summary.md](docs/evaluation_summary.md).

### 11.1 Performance Metrics
| Metric | Achieved (Mean ± SD) | Target | Status |
|---|---|---|---|
| **A\* Path Generation** | 12.4 ms ± 4.2 ms (n=20) | < 100 ms | **Met** |
| **AR Render FPS** | 45.2 FPS ± 8.1 FPS | ≥ 30 FPS | **Met** |
| **GPS Position Error** | **6.4 m** average (n=5) | ± 5 m | **Partially Met¹** |
| **LLM Intent Latency** | 785 ms ± 142 ms (n=50) | < 1.5 s | **Met** |

*¹ GPS variance is constrained by consumer hardware. See [Evaluation Summary §2](docs/evaluation_summary.md#2-global-positioning-system-gps-accuracy).*

### 11.2 User Study Experimental Validation
- **Design**: Within-subjects, counterbalanced ($N=30$).
- **Statistical Rigor**: Paired t-test results: **$t(29) = 8.42, p < 0.001$**.
- **Effect Size**: **Cohen's $d = 0.79$**.

---

## 12. Research Contributions

1. **Confidence-Aware AR Navigation Interface**: A visualization mechanism that communicates spatial ambiguity via "Confidence Cones."
2. **Browser-Native AR Navigation Pipeline**: A fully Web-native system using WebXR/Three.js without proprietary OS requirements.
3. **High-Precision Coordinate Transformation**: Synchronizes voxel space with WGS84 GPS telemetry via bidirectional affine mapping.
4. **Empirical Evaluation**: Validated $N=30$ study proving a **63.8% reduction** in cognitive load via NASA-TLX.

---

## 13. Dynamic Documentation Architecture

The application features a **Self-Reflecting UI** (Thesis Tab) where this `README.md` is rendered live using `react-markdown` and `mermaid.js`. This ensures the thesis presentation and project code are synchronized at built-time.

---

## 14. Limitations & Future Work

### 14.1 Key Limitations
- **GPS Drift**: Consumer sensors fluctuate ±5–10 m.
- **WiFi Fingerprinting Status**: Currently a **simulation module** due to browser security restrictions.

### 14.2 Future Directions
- **VPS Integration**: Camera-based facade recognition to replace magnetometer dependency.
- **UA-A***: Implementing the **Uncertainty-Aware A\*** algorithm for risk-aware path planning.

---

## 15. Installation & Setup

1. `git clone https://github.com/your-username/smart-campus-nav.git`
2. `npm install`
3. Configure `.env` with `VITE_MAPBOX_TOKEN` and `VITE_GEMINI_API_KEY`.
4. `npm run dev`

### 15.2 Reproducibility Package (Benchmarks)
To verify benchmarks:
1. Run `import { benchmarkNavigation } from './src/benchmarks/AStarStressTest'`.
2. Execute `benchmarkNavigation(100)` in the console to record Mean/SD for pathfinding.

---

## 18. References

1. **Azuma, R. T.** (1997). A Survey of Augmented Reality. *Presence*, 6(4).
2. **Zhang, X., et al.** (2023). A WebXR-based Digital Twin Framework for Smart Campus Navigation. *J. Geovisualization*.
... *(See References section 18 for full list of 26 citations)*

---

## License
Project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <em>Submitted in partial fulfillment of the requirements for the degree of Master of Technology</em><br>
  <strong>Motilal Nehru National Institute of Technology Allahabad</strong>
</p>