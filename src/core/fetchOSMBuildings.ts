import osmtogeojson from 'osmtogeojson';

export interface OSMFeatureProperties {
    type?: string;
    id?: number | string;
    tags?: {
        building?: string;
        'building:levels'?: string;
        height?: string;
        name?: string;
        [key: string]: string | undefined;
    };
    height?: number;
    base_height?: number;
    color?: string;
    name?: string;
    building?: string;
    [key: string]: any;
}

export interface OSMGeoJSON {
    type: 'FeatureCollection';
    features: {
        type: 'Feature';
        id: string | number;
        geometry: any;
        properties: OSMFeatureProperties;
    }[];
}

const CACHE_KEY = 'mnnit_osm_buildings';
const CACHE_EXPIRY_KEY = 'mnnit_osm_buildings_expiry';
const EXPIRY_TIME_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function fetchOSMBuildings(): Promise<OSMGeoJSON | null> {
    try {
        // Check cache first
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);

        if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry, 10)) {
            console.log('Using cached OSM building data');
            return JSON.parse(cachedData) as OSMGeoJSON;
        }

        console.log('Fetching fresh OSM building data from Overpass API...');

        // Define MNNIT region: 800m around 25.4924, 81.8639
        const query = `
            [out:json][timeout:25];
            (
              way["building"](around:800,25.4924,81.8639);
              relation["building"](around:800,25.4924,81.8639);
            );
            out body;
            >;
            out skel qt;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.statusText}`);
        }

        const osmData = await response.json();
        const geojson = osmtogeojson(osmData) as unknown as OSMGeoJSON;

        // Process properties to ensure height exists for rendering
        geojson.features = geojson.features.map(feature => {
            const tags = feature.properties?.tags || feature.properties || {};

            let height = 10; // Default height in meters

            if (tags.height) {
                const parsed = parseFloat(String(tags.height));
                if (!isNaN(parsed)) height = parsed;
            } else if (tags['building:levels']) {
                const levels = parseFloat(String(tags['building:levels']));
                if (!isNaN(levels)) height = levels * 3; // Estimate 3m per level
            }

            // Optional: assign colors based on building type or name
            let color = '#d9b38c'; // default beige-ish
            if (tags.name && tags.name.toLowerCase().includes('academic')) {
                color = '#fef3c7';
            } else if (tags.building === 'dormitory') {
                color = '#e2e8f0';
            }

            feature.properties = {
                ...feature.properties,
                height: height,
                base_height: 0,
                color: color
            };

            return feature;
        });

        // Filter out non-polygon features if necessary, or just rely on Mapbox fill-extrusion to ignore lines
        geojson.features = geojson.features.filter(f =>
            f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
        );

        // Cache the result
        localStorage.setItem(CACHE_KEY, JSON.stringify(geojson));
        localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + EXPIRY_TIME_MS).toString());

        return geojson;

    } catch (error) {
        console.error('Failed to fetch OSM buildings:', error);

        // Fallback to cache even if expired if we have it
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            console.log('Using expired cached OSM data as fallback');
            return JSON.parse(cachedData) as OSMGeoJSON;
        }

        return null;
    }
}
