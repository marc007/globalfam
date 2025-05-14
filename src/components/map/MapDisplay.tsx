
"use client";

import type { Friend } from '@/types';
import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MapDisplayProps {
  friends: Friend[];
  apiKey: string | undefined;
}

interface MapMarker extends Friend {
  position: { lat: number; lng: number };
}

// Mock geocoding function (in a real app, use Google Geocoding API)
const geocodeLocation = async (city: string, country: string): Promise<{ lat: number; lng: number } | null> => {
  // This is a very basic mock. Real geocoding is complex.
  // For demo purposes, returning slightly randomized coordinates around known cities or fixed points.
  // In a production app, call a geocoding service here.
  // console.log(`Geocoding (mock): ${city}, ${country}`);
  // Example: Use a hash of city name to generate somewhat consistent mock coords.
  let hash = 0;
  for (let i = 0; i < city.length; i++) {
    const char = city.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  // Ensure coordinates are within valid ranges
  const lat = (hash % 180000) / 1000 - 90; // Range -90 to 90
  const lng = (hash % 360000) / 1000 - 180; // Range -180 to 180
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100 * Math.random()));
  
  // For some known cities, provide more realistic (but still mock) coordinates
  const cityLower = city.toLowerCase();
  if (cityLower === "new york") return { lat: 40.7128 + (Math.random()-0.5)*0.1, lng: -74.0060 + (Math.random()-0.5)*0.1 };
  if (cityLower === "london") return { lat: 51.5074 + (Math.random()-0.5)*0.1, lng: -0.1278 + (Math.random()-0.5)*0.1 };
  if (cityLower === "tokyo") return { lat: 35.6895 + (Math.random()-0.5)*0.1, lng: 139.6917 + (Math.random()-0.5)*0.1 };
  if (cityLower === "paris") return { lat: 48.8566 + (Math.random()-0.5)*0.1, lng: 2.3522 + (Math.random()-0.5)*0.1 };
  if (cityLower === "sydney") return { lat: -33.8688 + (Math.random()-0.5)*0.1, lng: 151.2093 + (Math.random()-0.5)*0.1 };
  
  // Fallback to random if not a known city
  return { lat , lng };
};


export function MapDisplay({ friends, apiKey }: MapDisplayProps) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  
  // State for initial map center and zoom. These values will be used for defaultCenter/defaultZoom
  // and will update if the 'friends' prop changes, re-keying the map.
  const [initialCenter, setInitialCenter] = useState({ lat: 20, lng: 0 });
  const [initialZoom, setInitialZoom] = useState(2);

  useEffect(() => {
    const fetchMarkers = async () => {
      const newMarkers: MapMarker[] = [];
      for (const friend of friends) {
        if (friend.location && friend.location.city && friend.location.country) {
          if (friend.location.latitude && friend.location.longitude) {
             newMarkers.push({ ...friend, position: { lat: friend.location.latitude, lng: friend.location.longitude } });
          } else {
            const coords = await geocodeLocation(friend.location.city, friend.location.country);
            if (coords) {
              newMarkers.push({ ...friend, position: coords });
            }
          }
        }
      }
      setMarkers(newMarkers);
      if (newMarkers.length > 0) {
        const firstValidMarker = newMarkers.find(m => m.position);
        if (firstValidMarker) {
          setInitialCenter(firstValidMarker.position);
          setInitialZoom(newMarkers.length === 1 ? 6 : 3);
        }
      } else {
        // Reset to a default world view if no markers
        setInitialCenter({ lat: 20, lng: 0 });
        setInitialZoom(2);
      }
    };
    fetchMarkers();
  }, [friends]);

  if (!apiKey) {
    return (
      <Card className="bg-muted/30 border-dashed border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <Globe className="mr-2 h-6 w-6" /> Map Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive-foreground">
            Google Maps API key is not configured. Please set the <code className="bg-destructive/20 px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> environment variable.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            For development, you can obtain a free API key from the Google Cloud Console. Make sure to enable the "Maps JavaScript API" and "Geocoding API".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden shadow-lg border border-border">
      <APIProvider apiKey={apiKey}>
        <Map
          key={`${initialCenter.lat}-${initialCenter.lng}-${initialZoom}`} // Re-mount map if initial center/zoom changes
          defaultCenter={initialCenter}
          defaultZoom={initialZoom}
          // By removing 'center' and 'zoom' props here, we make them uncontrolled after initial render.
          // The map will manage its own state for panning and zooming.
          gestureHandling={'greedy'}
          disableDefaultUI={true} // Keep this true if you want to selectively enable controls
          mapId={'globalfam_map_dark'}
          className="h-full w-full"
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          zoomControl={true} // This enables zoom controls (+/- buttons)
        >
          {markers.map((marker) => (
            <AdvancedMarker
              key={marker.id}
              position={marker.position}
              onClick={() => setSelectedMarker(marker)}
            >
              <Pin
                background={'hsl(var(--primary))'}
                borderColor={'hsl(var(--primary-foreground))'}
                glyphColor={'hsl(var(--primary-foreground))'}
              />
            </AdvancedMarker>
          ))}

          {selectedMarker && selectedMarker.position && (
            <InfoWindow
              position={selectedMarker.position}
              onCloseClick={() => setSelectedMarker(null)}
              pixelOffset={[0,-40]}
            >
              <div className="p-2 text-card-foreground bg-card rounded-md shadow-md max-w-xs">
                <h3 className="text-md font-semibold text-primary">{selectedMarker.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedMarker.location.city}, {selectedMarker.location.country}</p>
                {selectedMarker.latestStatus && (
                  <p className="text-xs mt-1 italic">&ldquo;{selectedMarker.latestStatus.content}&rdquo;</p>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}

    