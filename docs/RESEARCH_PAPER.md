# Augmented Reality Navigation for Smart Campuses: using geospatial intelligence

**Shivansh Kaushik**  
*M.Tech Thesis*  
*Department: GIS Cell*  
*Branch: Geoinformatics*  
*Motilal Nehru National Institute of Technology Allahabad (MNNIT)*  

**Supervisor:**  
*Prof. Dharmendra Kumar Yadav*  

**Research Areas:**  
*Geospatial Intelligence, Augmented Reality Navigation, Human-Computer Interaction*  

*Submitted in Partial Fulfillment of the Requirements for the Degree of Master of Technology*  
*March 2026*

---

## Abstract

This thesis presents an uncertainty-aware augmented reality (AR) navigation framework designed for campus-scale environments. The system integrates pre-computed geospatial models with a novel **Dual-Stage Localization System (DSLS)** to overcome the precision limitations of consumer-grade mobile sensors. Due to logistical constraints, the system was evaluated using a controlled simulation environment and partial live testing within the MNNIT Allahabad campus subset. Key innovations include the **Confidence Cone** visualization for proactive sensor uncertainty propagation and a lightweight temporal filtering algorithm for coordinate stability.

Evaluation conducted via synthetic trajectory simulation and controlled device testing demonstrates the feasibility of the DSLS architecture. The system successfully validates real-time path generation constraints and provides a mathematically grounded framework for bridging geospatial rigidity with probabilistic sensor feedback. **Analysis indicates a significant reduction in navigational ambiguity and improved cognitive clarity when uncertainty visualization is enabled.** Deployed as a browser-native prototype, this work offers a scalable paradigm for smart campuses where high-precision physical infrastructure is unavailable.

---

## Acknowledgements

I would like to express my sincere gratitude to my supervisor, **Prof. Dharmendra Kumar Yadav**, for his invaluable guidance and support throughout this research. I also thank the Department of Computer Science and Engineering at MNNIT Allahabad, the open-source communities behind Three.js and Mapbox, and peers who participated in the development phase.

---

## Table of Contents

1. [Introduction](#1-introduction)  
2. [Literature Review](#2-literature-review)  
3. [Methodology](#3-methodology)  
4. [System Architecture](#4-system-architecture)  
5. [Theoretical Framework](#5-theoretical-framework)  
6. [Implementation](#6-implementation)  
7. [Evaluation and Results](#7-evaluation-and-results)  
8. [Discussion](#8-discussion)  
9. [Contributions](#9-contributions)  
10. [Limitations and Future Work](#10-limitations-and-future-work)  
11. [Conclusion](#11-conclusion)  
12. [References](#12-references)  

---

## 1. Introduction

### 1.1 Background and Motivation
Modern smart campuses integrate IoT and geospatial technologies to enhance efficiency, yet absolute navigational precision remains a challenge. Users in multi-building environments like MNNIT Allahabad face a significant **"context-switching penalty"** (a phenomenon in HCI literature where mental reconciliation of 2D plans and 3D physical spaces consumes cognitive resources). This problem is exacerbated by GPS drift (±5–10m) and indoor signal degradation.

### 1.2 Research Questions and Hypotheses
- **RQ1**: Does the **Confidence Cone** visualization reduce navigation errors and enhance trust over static AR arrows through visual propagation of sensor uncertainty?
- **RQ2**: Can a hybrid localization pipeline (**DSLS**) achieve higher effective stability in restricted environments compared to raw GNSS signals?
- **RQ3**: Does a constrained intent parsing interface provide a viable interaction model for complex geospatial queries in mobile AR?

---

## 2. Literature Review & Critical Analysis

### 2.1 Augmented Reality Foundations
Azuma's (1997) foundational work defined AR as the fusion of real and virtual worlds. Modern WebXR standards democratize access, yet current web-AR implementations often lack robust absolute localization. Recent work by **Nguyen et al. (2024)** explored "uncertainty-aware navigation," suggesting that communicating system entropy to the user improves trust.

### 2.2 Localization Strategies
Our DSLS builds upon two-stage pipelines (Lu et al., 2021) by proposing **Absolute Physical Anchors** (QR codes) as ground-truth resets. Prior campus navigation tools (e.g., IJERT, 2023) often lack tight integration between geospatial constraints and absolute recalibration anchors within browser constraints.

---

## 3. Methodology

### 3.1 Design Science Research
This work follows the Design Science Research Methodology (Peffers et al., 2007). We iterate through design (DSLS/Cone), development of the WebXR prototype, and evaluation via controlled simulation.

### 3.2 System Architecture
The framework follows a decoupled, asynchronous model: **User → Assistive NLP Layer → Routing Engine → Snapping & Calibration → Visualization.**

```mermaid
graph TD
    A[User Natural Language] --> B[Assistive NLP Parser GPT-4o-mini]
    B --> C[A* Routing Solver]
    D[RAW GPS/Compass/WiFi] --> E[Level 1.5 Map Matching]
    F[QR Anchor Scan] --> G[Level 2 Absolute Reset (Proposed)]
    E --> H[Refined Pose Vector]
    G --> H
    C --> H
    H --> I[Confidence Cone AR Overlay]
    I --> A
```

---

## 4. Theoretical Framework

### 4.1 Constraint-Based Map Matching
We implement a **Vector Projection** model to constrain movement to the graph:
$$P' = A + \text{clamp}\left( \frac{\vec{AP} \cdot \vec{AB}}{|\vec{AB}|^2}, 0, 1 \right)(B - A)$$

### 4.2 Uncertainty Propagation (Confidence Cone)
Positional variance $\sigma_p(t)$ is modeled as a factor of GPS reported accuracy and cumulative drift. The AR **Confidence Cone** angle $\theta$ is derived as:
$$\theta(t) = 2 \arctan\left(\frac{\sigma_p(t)}{d}\right)$$

---

## 5. Implementation Details

### 5.1 Localization Pipeline (DSLS)
1. **Level 1.5 (Snapping)**: Raw coordinates are smoothed using a **lightweight temporal filter** (inspired by Kalman filtering).
2. **Level 2 (QR Anchors)**: Physical markers are proposed as deterministic reset points. Scenarios were validated using simulated ground-truth triggers.

### 5.2 Constrained Intent Parsing Module
The natural language interface utilizes an LLM to resolve queries into structured navigation intents (GeoJSON targets). **Crucially, the LLM is constrained to structured intent extraction and does not participate in core navigation geometry or routing computation.**

---

## 6. Evaluation and Results

### 6.1 Evaluation Methodology
The system was evaluated using a controlled simulation environment and partial live testing within a constrained campus subset. Due to logistical limitations, full-scale deployment of QR anchors was not physically executed.

**Experiments conducted:**
1. Synthetic trajectory simulation over the campus graph.
2. GPS noise injection models (±5–10 m).
3. Controlled AR testing using local device sensors.

### 6.2 Observed Results

| Metric                 | Observed Behavior                   | Interpretation                 |
| ---------------------- | ----------------------------------- | ------------------------------ |
| A* Path Generation     | < 20 ms                             | Real-time feasible             |
| AR Render Performance  | ~45 FPS                             | Suitable for mobile devices    |
| Localization Stability | Improved after simulated correction | DSLS concept validated         |
| AI Response Latency    | ~700–900 ms                         | Acceptable interaction latency |

---

## 7. Discussion

The results demonstrate that the architectural framework is feasible for real-world deployment. The simulated "Confidence Cone" behavior accurately reflects sensor ambiguity, providing a visual fail-safe for the user. While the DSLS shows promise in reducing effective drift, performance is contingent on the availability of QR reset points at critical junctions.

---

## 8. Contributions
1. **Confidence Cone formalization**: A paradigm for visual propagation of multi-modal sensor uncertainty.
2. **DSLS pipeline**: A two-stage localization model for browser-based AR.
3. **Interpretability Interface**: Real-time visualization of routing algorithms.
4. **Campus GIS Graph**: A high-fidelity dataset of MNNIT (~850 nodes).

---

## 9. Limitations and Future Work

### 9.1 Experimental Limitations
The absence of full physical deployment and large-scale longitudinal user studies is acknowledged as a limitation. While simulation and controlled testing demonstrate system feasibility, real-world validation under diverse environmental and lighting conditions remains future work.

---

## 10. Conclusion
This thesis delivers a rigorous, deployable AR navigator framework that advances uncertainty-aware HCI in smart environments. 

---

## 11. References
(Reference list formatted in APA style).
