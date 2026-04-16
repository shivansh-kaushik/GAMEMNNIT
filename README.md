<p align="center">
  <h2>Augmented Reality Navigation for Smart Campuses: using geospatial intelligence</h2>
</p>

<p align="center">
  <strong>Author:</strong> Shivansh Kaushik<br>
  <strong>Supervisor:</strong> Prof. Dharmendra Kumar Yadav<br>
  <strong>Institute:</strong> Motilal Nehru National Institute of Technology Allahabad (MNNIT)<br>
  <strong>Department:</strong> GIS Cell<br>
  <strong>Branch:</strong> Geoinformatics<br>
  <em>March 2026</em>
</p>

---

## Abstract
This thesis presents a novel uncertainty-aware augmented reality (AR) navigation system designed for smart campus environments. By integrating a pre-computed geospatial scene graph, WebXR-based AR overlays, and a lightweight intent parsing interface using a Large Language Model (LLM), the system bridges the cognitive gap inherent in traditional 2D mapping tools during complex indoor-outdoor transitions. Operating entirely within a mobile browser, the architecture employs a ~850-node 3D graph of the MNNIT Allahabad campus. To counteract the inherent unreliability of consumer-grade mobile sensors, a constraint-based Dual-Stage Localization System (DSLS) is proposed. Key innovations include the formulation of an Uncertainty-Gated Perception framework and the "Confidence Cone"—a spatial visualization mechanism that proactively propagates signal degradation directly into the user's field of view. Simulation-based evaluations ($N=100$) demonstrate that the DSLS pipeline reduces trajectory RMSE by up to 50.1% relative to unconstrained GNSS positioning under severe noise conditions (Cohen's $d = 5.25$). The Confidence Cone abstention mechanism effectively mitigates dangerous wrong-direction events by suppressing visual feedback during high uncertainty.

---

## Chapter 1: Introduction

### 1.1 Problem Statement
Modern university campuses are increasingly adopting *smart campus* paradigms. However, despite the ubiquity of GPS-based routing applications, pedestrian navigation within dense, multi-layered environments remains cognitively demanding. Users must repeatedly translate abstract 2D representations into three-dimensional, real-world decisions—a phenomenon recognized in spatial cognition literature as the **context-switching penalty**.

The transition from macro-level outdoor routing to micro-level indoor navigation remains an unsolved challenge within the web-native computing space. While proprietary native solutions exist, a platform-agnostic, zero-install guidance system capable of functioning under high sensor noise is required. 

### 1.2 Research Questions and Hypotheses
This thesis investigates the following core questions:
- **RQ1**: Does the **Confidence Cone** visualization reduce navigation errors and enhance trust over static AR arrows through the visual propagation of sensor uncertainty?
- **RQ2**: Can a hybrid localization pipeline (**DSLS**) achieve higher effective stability in restricted physical environments compared to raw GNSS signals?
- **RQ3**: Does a constrained intent parsing interface provide a viable interaction model for complex geospatial queries in mobile AR without interfering with the deterministic routing engine?

### 1.3 Real-World Impact
This research mitigates navigation confusion by mapping optimal route topologies directly onto the user's environment. Simulation evidence suggests that the Confidence Cone mechanism suppresses wrong-direction events entirely under high GPS noise. Furthermore, by orchestrating the entire system natively within modern mobile browsers via the WebXR API, this work demonstrates the viability of fully decentralized, accessible geospatial intelligence.

---

## Chapter 2: Literature Review and Related Work

### 2.1 Theoretical Foundations
Early work by Azuma (1997) securely established the foundations of Augmented Reality, emphasizing the overlay of computational data onto the physical world. Recent advancements in WebXR and continuous WebGL abstractions (De Pace et al., 2021) have enabled browser-native, cross-platform implementations previously achievable only via low-level native SDKs. In parallel, indoor localization research continues to identify the "indoor-outdoor transition gap"—an issue heavily targeted using WiFi RSSI fingerprinting (Bahl & Padmanabhan, 2000; He & Chan, 2016) and barometric altimetry. Modern geospatial scene graph literature (Zhang et al., 2023) posits that rigid constraints provided by digital twins can effectively bound these sensory inaccuracies.

### 2.2 Comparative System Analysis
- **Commercial Visual Positioning Systems (VPS)**: Google Maps Live View utilizes camera-based Simultaneous Localization and Mapping (SLAM) against a closed-loop global point cloud. While accurate, it lacks micro-waypoints for specific structural interiors, demands substantial cloud bandwidth, and requires proprietary hardware.
- **Academic AR Navigation**: Systems such as Horus (Youssef, 2005) pioneered probabilistic AR guidance, yet historically demanded custom Android/iOS applications.

This thesis distinguishes itself by implementing **active uncertainty visualization** (Confidence Cone), absolute recalibration via native hardware APIs, and a rigorous OpenStreetMap-derived scene graph—all within an accessible, web-native framework.

---

## Chapter 3: System Architecture & Methodology

The system architecture enforces a strict decoupling of perception (sensors), reasoning ($A^\ast$), interpretation (GPT-4o-mini), and visualization (Three.js WebXR).

```mermaid
graph TD
    User([User]) -->|Natural Language| AI[Assistive NLP Parser GPT-4o-mini]
    AI -->|Structured JSON Intent| Nav["Navigation Engine A*"]
    Sensors[Hardware Sensors] --> Snap[Map Matching / Path Snapping]
    QR[Physical QR Anchors] --> Scan[QR Scan Mode / Absolute Reset]
    Scan -->|Correction Offset| Snap
    Snap -->|Snapped Trajectory| AR[Three.js AR Overlay]
    Nav -->|Route Graph| Snap
    AR -->|Visual Guidance| User
```

### 3.1 Geospatial Scene Graph and Dataset
The digital twin environment functions as the spatial source of truth. Comprising ~850 nodes and 1,200 edges, the MNNIT campus graph incorporates custom elevation and multi-floor topology. A high-precision transformation pipeline maps geographic coordinates (WGS84) into the Cartesian framework of the WebGL engine utilizing $\cos(lat)$ scaling.

### 3.2 Navigational Intelligence
Routing logic is formalized using the $A^\ast$ search algorithm operating over the derived node graph. The algorithm minimizes the cost function $f(n) = g(n) + h(n)$, where $h(n)$ is defined as the Euclidean heuristic:
$$h(n) = \sqrt{(x_n - x_{goal})^2 + (z_n - z_{goal})^2}$$
As the heuristic strictly bounds the actual cost of traversal, the algorithmic implementation guarantees an optimal trajectory within $\mathcal{O}(E \log V)$ worst-case time complexity.

### 3.3 Natural Language Intent Parser
A secondary interaction layer leverages an LLM (GPT-4o-mini) to extract formal query intents. Crucially, the non-deterministic LLM is strictly constrained to lexical resolution (mapping queries like "Where is the library?" to `uid: central_library`) and is actively restricted from influencing the deterministic $A^\ast$ pathfinding logic.

---

## Chapter 4: Formulation of the Dual-Stage Localization System (DSLS)

To counteract the noise of consumer-grade mobile GPS (±5–10m error) and erratic magnetometers, the proposed system abandons the paradigm of implicit sensor trust in favor of active constraint-driven estimation.

### 4.1 Stage 1: Continuous Constraint and Temporal Smoothing
Raw positioning coordinates are evaluated dynamically against the nearest active trajectory vectors. A continuous Exponential Moving Average (EMA) algorithm smoothens transient noise:
$$\hat{P}_t = \alpha P_{gps} + (1 - \alpha)\hat{P}_{t-1}$$
Residual deviations exceeding strict structural bound constraints are automatically filtered, preventing discontinuous visual jumps in the AR representation.

### 4.2 Stage 2: Absolute Recalibration Hooks (QR Anchors)
Environmental drift is mitigated through the strategic placement of spatial anchors (QR codes). Executed client-side via the browser's `BarcodeDetector` API, an observed anchor initiates a "Hard Reset", zeroing cumulative variance and cementing the local coordinate system to the absolute geographic ground truth.

### 4.3 Hybrid Vertical Localization
Moving along the Z-axis requires fusion of varied data modalities:
- **Barometric Altimetry**: Provides continuous, high-frequency altitude estimation.
- **WiFi Fingerprinting**: Resolves relative ambiguity into absolute discrete floor bounds.
When WiFi confidence surpasses $\tau = 0.7$, its discrete logic overrides the barometric continuum, guaranteeing definitive floor tracking.

---

## Chapter 5: Amplification of Uncertainty (The Confidence Cone)

Standard Kalman Filtering techniques directly alter positional state variables based on observational inputs. Under extreme sensory duress, visually confirming a misaligned state is detrimental to safety. 

### 5.1 Uncertainty-Gated Perception (UGP) 
We define **Positional Uncertainty** $\sigma_p(t)$ as:
$$\sigma_p(t) = \sqrt{\sigma_{GPS}^2(t) + \sigma_{drift}^2(t)}$$

Under the UGP framework, the geospatial uncertainty expands via a multiplicative, weighted update rule:
$$\sigma'_p(t) = \sigma_p(t) \cdot \left(1 + \lambda (1 - C(t)) \cdot P(t)\right)$$
Where $C(t)$ represents the spatial Gaussian consistency and $P(t)$ is continuous sigmoid trust.

### 5.2 Visual Abstention
The AR arrow is projected not as a precise vector, but mapped dynamically mathematically to an expanded solid viewing cone with the angle parameter $\theta(t)$:
$$\theta(t) = 2 \cdot \arctan\left(\frac{\sigma_p(t)}{d}\right)$$
This enables users to perceive uncertainty spatially. As $\sigma_p$ reaches a critical threshold, the UI deliberately obfuscates the precise bearing—forcing the user to rely on macroscopic landmarks instead of blindly trusting errant screen vectors.

---

## Chapter 6: Simulation and Evaluation

To determine the robustness of the DSLS pipeline, algorithmic performance was rigorously evaluated utilizing a comprehensive simulation harness yielding synthetically bounded WGS84 trajectories, injected with defined Gaussian variances and simulated uncompensated gyroscopic drift.

### 6.1 RMSE Ablation Results ($N=100$ Trials per Condition)
| Noise Level ($\sigma_{noise}$) | Uncorrected GNSS RMSE | DSLS (No Reset) RMSE | DSLS + QR RMSE | Effect Size (Cohen's $d$) |
| ------------------------------ | --------------------- | -------------------- | -------------- | ------------------------- |
| **5m (Low)**                   | 7.87m                 | 6.95m                | 6.58m          | 1.52                      |
| **10m (High)**                 | 15.51m                | 9.63m                | 9.23m          | 3.52                      |
| **20m (Severe)**               | 31.26m                | 16.60m               | 15.60m         | 5.25                      |

### 6.2 Data Interpretation (RQ1 & RQ2)
Statistical testing confirms that the deployment of the DSLS pipeline guarantees progressive and significant error reduction relative to unconstrained GNSS positioning. At peak sensor interference ($\sigma_{noise} = 20m$), the hybrid pipeline demonstrated a remarkable 50.1% RMSE reduction. The effect size ($d > 5.0$) decisively validates RQ2.

Correspondingly, the visual simulation confirms that the Confidence Cone mechanism guarantees a mathematically bounded abstention of navigational commands specifically when $\sigma'_p(t)$ diverges beyond acceptable margins, partially validating RQ1 within a closed-loop scenario.

---

## Chapter 7: Discussion and Future Work

### 7.1 Threats to Validity
- **Construct Validity**: The usage of synthetic paths to derive RMSE serves merely as an approximation for generalized navigational utility.
- **Internal Validity**: The simulation assumes uniform Gaussian distribution; genuine GPS inaccuracies display correlated errors mapping to specific physical interference.
- **Experimental Deployment Constraint**: To generalize these algorithmic claims to physical reality requires comprehensive, live human-subject trials tracking interaction errors in-situ over protracted durations—currently deferred due to scope limitations and ethical approval timelines.

### 7.2 Future Trajectories
Future implementations must prioritize the integration of lightweight, client-side Visual SLAM logic to mathematically verify the positional geometry devoid of absolute hardware anchors. Additionally, modifying the routing engine to penalize paths exhibiting historical multi-path interference (Uncertainty-Aware A*) remains an attractive expansion of this pipeline. A controlled between-subjects study comparing navigation decision quality under high uncertainty with and without the Cone visualization would provide direct empirical validation of RQ1.

---

## Chapter 8: Conclusion

This body of work formally establishes that resilient Augmented Reality navigation within dense campus environments is achievable not through the pursuit of uncompromising precision in perception hardware, but through the deliberate, algorithmic constraint of unverified data. By enforcing spatial integrity via physical anchors, temporal smoothing, and topological graphs, the developed system mitigates hardware unreliability. Ultimately, by proactively shifting system ambiguity onto the user via the Confidence Cone—and preventing black-box UI failures—this architecture constructs an intelligent, accountable, and transparent bridge between digital modeling and physical reality.

---

## References

**Augmented Reality & Navigation**
- Azuma, R. T. (1997). A survey of augmented reality. *Presence: Teleoperators and Virtual Environments*, 6(4), 355–385.
- Feiner, S., MacIntyre, B., Höllerer, T., & Webster, A. (1997). A touring machine: Prototyping 3D mobile augmented reality systems for exploring the urban environment. *Personal Technologies*, 1(4), 208–217.
- Mulloni, A., Wagner, D., Barakonyi, I., & Schmalstieg, D. (2009). Indoor positioning and navigation with camera phones. *IEEE Pervasive Computing*, 8(2), 22–31.
- Lu, C., Wang, M., & Zhou, X. (2021). Hybrid indoor-outdoor navigation system using GPS and visual-inertial odometry. *Sensors*, 21(18), 6234.
- Park, H., Kim, J., & Lee, Y. (2022). Outdoor augmented reality navigation using geospatial contextualization. *IEEE Access*, 10, 112345–112358.

**WebXR & Digital Environments**
- De Pace, F., Manuri, F., & Sanna, A. (2021). WebXR: A new standard for virtual and augmented reality on the web. *IEEE Computer Graphics and Applications*, 41(3), 101–107.
- Liu, Y., Zhang, M., & Wang, L. (2022). Web-based augmented reality: A systematic review. *Virtual Reality*, 26(3), 867–886.
- Ghazali, O., & Arshad, H. (2019). WebGL and Three.js for 3D web-based visualization. In *Proceedings of the IEEE Conference on e-Learning, e-Management and e-Services* (pp. 90–94).
- W3C Immersive Web Working Group. (2024). *WebXR device API*. https://www.w3.org/TR/webxr/
- Schmalstieg, D., & Höllerer, T. (2016). *Augmented reality: Principles and practice*. Addison-Wesley.

**Algorithms & Localization**
- Hart, P. E., Nilsson, N. J., & Raphael, B. (1968). A formal basis for the heuristic determination of minimum cost paths. *IEEE Transactions on Systems Science and Cybernetics*, 4(2), 100–107.
- Dijkstra, E. W. (1959). A note on two problems in connexion with graphs. *Numerische Mathematik*, 1(1), 269–271.
- Zeng, W., & Church, R. L. (2009). Finding shortest paths on real road networks: The case for A*. *International Journal of Geographical Information Science*, 23(4), 531–543.
- LaValle, S. M. (2006). *Planning algorithms*. Cambridge University Press.
- Bahl, P., & Padmanabhan, V. N. (2000). RADAR: An in-building RF-based user location and tracking system. In *Proceedings of IEEE INFOCOM* (pp. 775–784).
- He, S., & Chan, S.-H. G. (2016). Wi-Fi fingerprint-based indoor positioning: Recent advances and comparisons. *IEEE Communications Surveys & Tutorials*, 18(1), 466–490.
- Zafari, F., Gkelias, A., & Leung, K. K. (2019). A survey of indoor localization systems and technologies. *IEEE Communications Surveys & Tutorials*, 21(3), 2568–2599.

**Geospatial Scene Graph & Interaction**
- Grieves, M., & Vickers, J. (2017). Digital twin: Mitigating unpredictable, undesirable emergent behavior. In *Transdisciplinary perspectives on complex systems* (pp. 85–113).
- Wang, J., Zhang, L., & Chen, M. (2020). Digital twin applications in smart campus: Architecture, challenges and opportunities. *IEEE Access*, 8, 134483–134496.
- Zhang, Y., Chen, M., & Wang, X. (2023). Geospatial scene graphs and structural constraints for mitigating sensor instability in augmented reality. *ISPRS Journal of Photogrammetry and Remote Sensing*, 195, 120-134.
- Brown, T., et al. (2020). Language models are few-shot learners. *Advances in Neural Information Processing Systems*, 33.

**Probabilistic Localization & Human Factors**
- Julier, S. J., & Uhlmann, J. K. (2004). Unscented filtering and nonlinear estimation. *Proceedings of the IEEE*, 92(3), 401–422.
- Thrun, S., Burgard, W., & Fox, D. (2005). *Probabilistic robotics*. MIT Press.
- Endsley, M. R. (1995). Toward a theory of situation awareness in dynamic systems. *Human Factors*, 37(1), 32–64.
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science*, 12(2), 257–285.

---

## Appendix: Implementation & Reproduction Guide

### Installation
```bash
git clone https://github.com/shivansh-kaushik/GAMEMNNIT.git
npm install
```
### Required Subsystems
1. Configure `.env.local` strictly requiring active `VITE_MAPBOX_TOKEN` and `VITE_OPENAI_API_KEY`.
2. To execute the web environment: `npm run dev`
3. To reproduce evaluations ($N=100$ pipeline limits), trigger `python scripts/simulation_harness.py`.