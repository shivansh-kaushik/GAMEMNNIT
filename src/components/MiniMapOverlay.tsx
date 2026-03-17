/**
 * src/components/MiniMapOverlay.tsx
 */
import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MiniMapProps {
  lat: number;
  lon: number;
  destLat?: number;
  destLon?: number;
}

export const MiniMapOverlay: React.FC<MiniMapProps> = ({ lat, lon, destLat, destLon }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const destMarker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    // Check if token exists in env
    const token = import.meta.env.VITE_MAPBOX_TOKEN || '';
    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lon, lat],
      zoom: 17,
      interactive: false, // Prevents interfering with AR swipes
      attributionControl: false
    });

    // Simple tracking marker
    marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat([lon, lat])
      .addTo(map.current);
      
    if (destLat && destLon) {
      destMarker.current = new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([destLon, destLat])
        .addTo(map.current);
    }
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
        destMarker.current = new mapboxgl.Marker({ color: '#ef4444' })
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
        pointerEvents: 'none'
      }}
    >
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
