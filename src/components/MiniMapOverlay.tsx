/**
 * src/components/MiniMapOverlay.tsx
 */
import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { ARNavWaypoint } from '../ar/arNavigation';

interface MiniMapProps {
  lat: number;
  lon: number;
  destLat?: number;
  destLon?: number;
  waypoints?: ARNavWaypoint[];
  trajectory?: { lat: number, lon: number }[];
}

export const MiniMapOverlay: React.FC<MiniMapProps> = ({ lat, lon, destLat, destLon, waypoints, trajectory }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const destMarker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    // Check if token exists in env
    const token = import.meta.env.VITE_MAPBOX_TOKEN || '';
    mapboxgl.accessToken = token;

    // Helper to create glowing dot marker
    const createDotMarker = (color: string, glowColor: string) => {
      const el = document.createElement('div');
      el.className = 'radar-dot';
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.backgroundColor = color;
      el.style.borderRadius = '50%';
      el.style.border = '2px solid #fff';
      el.style.boxShadow = `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`;
      return el;
    };

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark themed tech map
      center: [lon, lat],
      zoom: 17,
      interactive: true, // Enabled zoom & pan
      attributionControl: false
    });

    // Custom glowing tracking marker
    marker.current = new mapboxgl.Marker({ element: createDotMarker('#00ff88', '#00ff88') })
      .setLngLat([lon, lat])
      .addTo(map.current);
      
    if (destLat && destLon) {
      destMarker.current = new mapboxgl.Marker({ element: createDotMarker('#ef4444', '#ef4444') })
        .setLngLat([destLon, destLat])
        .addTo(map.current);
    }
    
    // Setup geojson sources for paths
    map.current.on('load', () => {
      if(!map.current) return;
      
      // Target Planned Route
      map.current.addSource('planned-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      map.current.addLayer({
        id: 'planned-route-line',
        type: 'line',
        source: 'planned-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#00ff88', 'line-width': 5, 'line-opacity': 0.8 } // High visibility path
      });

      // Target Nodes along route
      map.current.addSource('route-nodes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.current.addLayer({
        id: 'route-nodes-points',
        type: 'circle',
        source: 'route-nodes',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // User's Real Trajectory
      map.current.addSource('user-trajectory', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      map.current.addLayer({
        id: 'user-trajectory-line',
        type: 'line',
        source: 'user-trajectory',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#10b981', 'line-width': 4, 'line-dasharray': [1, 2] } // Dotted Green Trace
      });
    });
  }, []);

  // Update map center seamlessly and markers
  useEffect(() => {
    if (map.current) {
      map.current.easeTo({ center: [lon, lat], duration: 1000 });
      if (marker.current) {
        marker.current.setLngLat([lon, lat]);
      }
    }
  }, [lat, lon]);

  useEffect(() => {
    if (map.current && destLat && destLon) {
      if (!destMarker.current) {
        const el = document.createElement('div');
        el.style.width = '14px'; el.style.height = '14px';
        el.style.backgroundColor = '#ef4444';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid #fff';
        el.style.boxShadow = '0 0 10px #ef4444, 0 0 20px #ef4444';

        destMarker.current = new mapboxgl.Marker({ element: el })
          .setLngLat([destLon, destLat])
          .addTo(map.current);
      } else {
        destMarker.current.setLngLat([destLon, destLat]);
      }
    } else if (destMarker.current) {
      destMarker.current.remove();
      destMarker.current = null;
    }
  }, [destLat, destLon]);

  // Sync polyline lines
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    // Draw planned path
    if (waypoints && waypoints.length > 0) {
      const coords = waypoints.map(w => [w.gpsLon, w.gpsLat]);
      (map.current.getSource('planned-route') as mapboxgl.GeoJSONSource)?.setData({
        type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords }
      });

      // Highlight Next Node (index 1) and Final Node (last)
      const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
      if (waypoints.length > 1) {
          features.push({
              type: 'Feature',
              properties: { color: '#eab308', radius: 6 }, // Next Node: Yellow
              geometry: { type: 'Point', coordinates: [waypoints[1].gpsLon, waypoints[1].gpsLat] }
          });
      }
      features.push({
          type: 'Feature',
          properties: { color: '#ef4444', radius: 8 }, // Final Node: Red
          geometry: { type: 'Point', coordinates: [waypoints[waypoints.length - 1].gpsLon, waypoints[waypoints.length - 1].gpsLat] }
      });
      (map.current.getSource('route-nodes') as mapboxgl.GeoJSONSource)?.setData({
          type: 'FeatureCollection', features
      });

    } else {
      (map.current.getSource('route-nodes') as mapboxgl.GeoJSONSource)?.setData({
          type: 'FeatureCollection', features: []
      });
    }

    // Draw history trace
    if (trajectory && trajectory.length > 0) {
      const coords = trajectory.map(t => [t.lon, t.lat]);
      (map.current.getSource('user-trajectory') as mapboxgl.GeoJSONSource)?.setData({
        type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords }
      });
    }
  }, [waypoints, trajectory]);

  return (
    <div 
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        width: '128px',
        height: '128px',
        borderRadius: '50%',
        border: '2px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 0 15px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        zIndex: 100,
        pointerEvents: 'auto'
      }}
    >
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
