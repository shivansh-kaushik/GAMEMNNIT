import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bounds of MNNIT Campus
const minLat = 25.485;
const maxLat = 25.498;
const minLng = 81.855;
const maxLng = 81.875;

// Grid setup to generate approx 850 nodes
const gridLatSteps = 28;
const gridLngSteps = 30;

const features = [];
const nodes = []; 

for (let i = 0; i < gridLatSteps; i++) {
    for (let j = 0; j < gridLngSteps; j++) {
        const lat = minLat + (i * (maxLat - minLat) / (gridLatSteps - 1));
        const lng = minLng + (j * (maxLng - minLng) / (gridLngSteps - 1));
        
        const nLat = lat + (Math.random() - 0.5) * 0.0002;
        const nLng = lng + (Math.random() - 0.5) * 0.0002;
        
        nodes.push({ r: i, c: j, coord: [Number(nLng.toFixed(6)), Number(nLat.toFixed(6))] });
    }
}

for (let i = 0; i < gridLatSteps; i++) {
    for (let j = 0; j < gridLngSteps; j++) {
        const current = nodes.find(n => n.r === i && n.c === j);
        if (!current) continue;

        if (j < gridLngSteps - 1) {
            if (Math.random() > 0.15) { // 85% chance to connect right
                const right = nodes.find(n => n.r === i && n.c === j + 1);
                features.push({
                    type: "Feature",
                    properties: { name: `Path_R${i}_C${j}_to_C${j+1}` },
                    geometry: { type: "LineString", coordinates: [current.coord, right.coord] }
                });
            }
        }
        
        if (i < gridLatSteps - 1) {
            if (Math.random() > 0.15) { // 85% chance to connect down
                const bottom = nodes.find(n => n.r === i + 1 && n.c === j);
                features.push({
                    type: "Feature",
                    properties: { name: `Path_R${i}_C${j}_to_R${i+1}` },
                    geometry: { type: "LineString", coordinates: [current.coord, bottom.coord] }
                });
            }
        }
    }
}

const oldPaths = [
    { name: "Main Road", coords: [[81.864531, 25.494901], [81.864630, 25.494720], [81.864779, 25.494677]] },
    { name: "Admin Path", coords: [[81.864779, 25.494677], [81.864979, 25.495127]] },
    { name: "Academic Path", coords: [[81.864779, 25.494677], [81.865029, 25.494542]] },
    { name: "Library Path", coords: [[81.865029, 25.494542], [81.865279, 25.494632]] },
    { name: "Science Block Path", coords: [[81.865279, 25.494632], [81.866500, 25.493200]] },
    { name: "Engineering Block Path", coords: [[81.866500, 25.493200], [81.866000, 25.491800]] },
    { name: "Management Path", coords: [[81.866500, 25.493200], [81.865000, 25.494000]] }
];

oldPaths.forEach(p => {
    features.push({
        type: "Feature",
        properties: { name: p.name },
        geometry: { type: "LineString", coordinates: p.coords }
    });
});

const oldEndpoints = [ [81.864531, 25.494901], [81.864779, 25.494677], [81.866500, 25.493200], [81.866000, 25.491800] ];
oldEndpoints.forEach((ep) => {
    let nearest = nodes[0];
    let minDist = Infinity;
    nodes.forEach(n => {
        const dist = Math.pow(n.coord[0] - ep[0], 2) + Math.pow(n.coord[1] - ep[1], 2);
        if (dist < minDist) {
            minDist = dist;
            nearest = n;
        }
    });
    features.push({
        type: "Feature",
        properties: { name: "Integration_Edge" },
        geometry: { type: "LineString", coordinates: [ep, nearest.coord] }
    });
});

const geoJson = {
    type: "FeatureCollection",
    features: features
};

const outPath = path.join(__dirname, '../src/data/mnnit_paths.json');
fs.writeFileSync(outPath, JSON.stringify(geoJson, null, 2));

console.log(`Generated structural graph at ${outPath}`);
console.log(`Features length: ${features.length} edges`);
console.log(`Node coverage: ~850 nodes`);
