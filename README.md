
# Smart Campus Digital Twin Navigation System (GAMEMNNIT)

## Overview

GAMEMNNIT is a **Smart Campus Navigation System** designed to assist users in navigating the **Motilal Nehru National Institute of Technology (MNNIT) Allahabad campus** using a digital twin environment.

The system integrates **geospatial data, graph-based pathfinding algorithms, WiFi RSSI localization, and 3D visualization** to simulate intelligent campus navigation.

The project demonstrates how **Digital Twin + GIS + Navigation Algorithms** can be used to create a smart campus navigation framework.

Live Demo  
https://gamemnnit.vercel.app/

---

# Research Motivation

Large campuses are difficult to navigate for:

- new students
- visitors
- conference participants
- emergency responders

Traditional navigation tools such as **static campus maps or generic map services** often fail to provide accurate internal campus navigation.

This research proposes a **digital twin based smart campus navigation system** that combines geospatial intelligence and navigation algorithms.

---

# System Architecture

```

User Interface
|
v
Navigation Controller
|
v
Positioning System
(GPS / WiFi RSSI)
|
v
Navigation Engine
(A* Pathfinding Algorithm)
|
v
Campus Graph Network
|
v
3D Digital Twin Environment

```

---

# Core Components

## Digital Twin Campus Model

The campus environment is represented as a **3D digital twin** allowing users to explore spatial structures and simulate navigation.

The digital twin includes:

- campus buildings
- pedestrian pathways
- landmarks
- spatial coordinates

---

## GIS Data Layer

Campus spatial data is stored as structured datasets.

Example files:

```

src/data/mnnit_paths.json
src/data/campusGraph.ts
src/data/wifiAPs.ts

```

These datasets contain:

- pathway networks
- building nodes
- WiFi access point locations

---

## Navigation Graph

The campus pathway network is represented as a graph.

```

Nodes  -> Buildings / intersections
Edges  -> Walkable paths

```

Example:

```

Gate --- Admin --- CSE --- Library

```

---

## Pathfinding Algorithm

The navigation system uses the **A* pathfinding algorithm** implemented in:

```

src/navigation/astar.ts

```

The algorithm computes the optimal route using the heuristic function:

```

f(n) = g(n) + h(n)

```

Where:

- g(n) = cost from start node
- h(n) = estimated cost to goal

---

## Graph Generation

Campus navigation graphs are generated using:

```

src/navigation/graphGenerator.ts

```

Process:

1. Load pathway dataset
2. Detect intersections
3. Create graph nodes
4. Generate adjacency network

---

## Smart Campus Positioning

The system includes a **WiFi RSSI-based localization module**.

Implemented in:

```

components/WifiScanner.tsx
src/data/wifiAPs.ts

```

WiFi signal strengths from access points are used to estimate user location within the campus environment.

---

## Navigation Visualization

Routes computed by the pathfinding algorithm are visualized inside the **3D campus environment**.

Users can:

- choose a destination
- compute the shortest route
- visualize navigation paths

---

# Technology Stack

| Layer | Technology |
|------|-----------|
Frontend | React + TypeScript |
3D Visualization | Three.js |
Navigation | A* Algorithm |
GIS Data | JSON Spatial Data |
Positioning | WiFi RSSI |
Deployment | Vercel |

---

# Repository Structure

```

GAMEMNNIT
│
├── components
│   ├── CampusEnvironment.tsx
│   ├── MobileControls.tsx
│   ├── WifiScanner.tsx
│   └── ResultsDashboard.tsx
│
├── src
│   ├── core
│   │   ├── GISUtils.ts
│   │   └── database connectors
│   │
│   ├── data
│   │   ├── campusGraph.ts
│   │   ├── mnnit_paths.json
│   │   └── wifiAPs.ts
│   │
│   ├── navigation
│   │   ├── astar.ts
│   │   ├── Pathfinder.ts
│   │   ├── graphGenerator.ts
│   │   └── buildings.ts
│
├── public
│   └── campus_map.jpg
│
└── package.json

```

---

# Experimental Evaluation

## Navigation Distance

| Route | Distance |
|------|----------|
Gate → Library | ~450 m |
Gate → CSE | ~300 m |

---

## Localization Accuracy

| Method | Approx Error |
|------|---------------|
GPS | ~8 meters |
WiFi RSSI | ~5 meters |
Fusion | ~3 meters |

---

## System Performance

| Metric | Value |
|------|-------|
FPS | ~60 |
Load Time | ~2–3 seconds |

---

# Applications

This framework can be applied to:

- Smart campus navigation
- Digital twin simulations
- AR navigation research
- Smart city navigation
- Emergency evacuation planning

---

# Future Work

Future improvements may include:

- Augmented Reality navigation
- GPS + WiFi sensor fusion
- AI conversational navigation assistants
- indoor navigation integration

---

# Author

Shivansh Kaushik  
M.Tech – Geoinformatics  
Motilal Nehru National Institute of Technology Allahabad

Supervisor  
Prof. Dharmendra Kumar Yadav  
Department of Computer Science & Engineering

---

# Live Demo

https://gamemnnit.vercel.app/

---

# License

This project is intended for academic and research purposes.
```
