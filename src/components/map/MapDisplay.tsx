
"use client";

import type { Friend, User, UserLocation, StatusUpdate } from '@/types';
import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MapDisplayProps {
  friends: Friend[];
  apiKey: string | undefined;
  currentUser: User | null;
}

interface MapPinData {
  id: string;
  name: string;
  avatarUrl?: string;
  location: UserLocation;
  latestStatus?: StatusUpdate;
  position: { lat: number; lng: number };
  isCurrentUser: boolean;
}

const geocodeLocation = async (city: string, country: string): Promise<{ lat: number; lng: number } | null> => {
  let hash = 0;
  for (let i = 0; i < (city + country).length; i++) {
    const char = (city + country).charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const latNoise = ((hash % 1000) / 5000) - 0.1;
  const lngNoise = ((hash % 2000) / 10000) - 0.1;

  await new Promise(resolve => setTimeout(resolve, 50 * Math.random()));

  const cityLower = city.toLowerCase();
  if (cityLower === "new york") return { lat: 40.7128 + latNoise, lng: -74.0060 + lngNoise };
  if (cityLower === "london") return { lat: 51.5074 + latNoise, lng: -0.1278 + lngNoise };
  if (cityLower === "tokyo") return { lat: 35.6895 + latNoise, lng: 139.6917 + lngNoise };
  if (cityLower === "paris") return { lat: 48.8566 + latNoise, lng: 2.3522 + lngNoise };
  if (cityLower === "sydney") return { lat: -33.8688 + latNoise, lng: 151.2093 + lngNoise };

  const lat = (hash % 180000) / 1000 - 90 + latNoise;
  const lng = (hash % 360000) / 1000 - 180 + lngNoise;
  return { lat , lng };
};


export function MapDisplay({ friends, apiKey, currentUser }: MapDisplayProps) {
  const [mapPins, setMapPins] = useState<MapPinData[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapPinData | null>(null);

  const [initialCenter, setInitialCenter] = useState({ lat: 20, lng: 0 });
  const [initialZoom, setInitialZoom] = useState(2);

  useEffect(() => {
    const fetchMapPins = async () => {
      const newMapPins: MapPinData[] = [];

      for (const friend of friends) {
        if (friend.location && (friend.location.city || (typeof friend.location.latitude === 'number' && typeof friend.location.longitude === 'number'))) {
          let coords: { lat: number; lng: number } | null = null;
          if (typeof friend.location.latitude === 'number' && typeof friend.location.longitude === 'number') {
             coords = { lat: friend.location.latitude, lng: friend.location.longitude };
          } else if (friend.location.city && friend.location.country) {
            coords = await geocodeLocation(friend.location.city, friend.location.country);
          }

          if (coords) {
            newMapPins.push({
              ...friend,
              position: coords,
              isCurrentUser: false
            });
          }
        }
      }

      if (currentUser && currentUser.currentLocation) {
        const userLoc = currentUser.currentLocation;
        let userCoords: { lat: number; lng: number } | null = null;
        if (typeof userLoc.latitude === 'number' && typeof userLoc.longitude === 'number') {
          userCoords = { lat: userLoc.latitude, lng: userLoc.longitude };
        } else if (userLoc.city && userLoc.country) {
          userCoords = await geocodeLocation(userLoc.city, userLoc.country);
        }

        if (userCoords) {
          newMapPins.push({
            id: currentUser.uid,
            name: currentUser.name || 'Your Location',
            avatarUrl: currentUser.avatarUrl,
            location: userLoc,
            position: userCoords,
            isCurrentUser: true,
          });
        }
      }

      setMapPins(newMapPins);

      if (newMapPins.length > 0) {
        const currentUserPin = newMapPins.find(p => p.isCurrentUser);
        const firstPin = currentUserPin || newMapPins[0];

        if (firstPin && firstPin.position &&
            typeof firstPin.position.lat === 'number' && typeof firstPin.position.lng === 'number') {
          setInitialCenter(firstPin.position);
          setInitialZoom(newMapPins.length === 1 ? 6 : 3);
        } else {
          setInitialCenter({ lat: 20, lng: 0 });
          setInitialZoom(2);
        }
      } else {
        setInitialCenter({ lat: 20, lng: 0 });
        setInitialZoom(2);
      }
    };
    fetchMapPins();
  }, [friends, currentUser]);

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
            For development, you can obtain a free API key from the Google Cloud Console. Make sure to enable the "Maps JavaScript API", "Geocoding API", and "Places API".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden shadow-lg border border-border">
      <APIProvider apiKey={apiKey} libraries={['places', 'marker']}>
        <Map
          key={`${initialCenter.lat}-${initialCenter.lng}-${initialZoom}`}
          defaultCenter={initialCenter}
          defaultZoom={initialZoom}
          minZoom={2}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId={'globalfam_map_dark'}
          className="h-full w-full"
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          zoomControl={true}
        >
          {mapPins.map((pin) => (
            <AdvancedMarker
              key={pin.id}
              position={pin.position}
              onClick={() => setSelectedPin(pin)}
              zIndex={pin.isCurrentUser ? 10 : 1}
            >
              <Pin
                background={pin.isCurrentUser ? 'hsl(var(--accent))' : 'hsl(var(--primary))'}
                borderColor={pin.isCurrentUser ? 'hsl(var(--accent-foreground))' : 'hsl(var(--primary-foreground))'}
                glyphColor={pin.isCurrentUser ? 'hsl(var(--accent-foreground))' : 'hsl(var(--primary-foreground))'}
              />
            </AdvancedMarker>
          ))}

          {selectedPin && selectedPin.position && (
            <InfoWindow
              position={selectedPin.position}
              onCloseClick={() => setSelectedPin(null)}
              pixelOffset={[0,-40]}
            >
              <div className="p-2 text-card-foreground bg-card rounded-md shadow-md max-w-xs">
                <h3 className={`text-md font-semibold ${selectedPin.isCurrentUser ? 'text-accent' : 'text-primary'}`}>{selectedPin.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedPin.location.city}{selectedPin.location.country ? `, ${selectedPin.location.country}` : ''}
                  {(selectedPin.location.latitude !== undefined && selectedPin.location.longitude !== undefined) &&
                    <span className="block text-xs">({selectedPin.location.latitude.toFixed(4)}, {selectedPin.location.longitude.toFixed(4)})</span>
                  }
                </p>
                {selectedPin.latestStatus && !selectedPin.isCurrentUser && (
                  <p className="text-xs mt-1 italic">&ldquo;{selectedPin.latestStatus.content}&rdquo;</p>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
