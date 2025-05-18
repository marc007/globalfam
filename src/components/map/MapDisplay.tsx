
"use client";

import type { Friend, User, UserLocation, StatusUpdate } from '@/types';
import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MapDisplayProps {
  friends: Friend[];
  apiKey: string | undefined;
  currentUser: User | null;
  targetView?: { center: {lat:number, lng:number}, zoom: number, key: number } | null;
  onTargetViewApplied?: () => void;
}

interface MapPinData {
  id: string;
  name: string;
  avatarUrl?: string;
  location: UserLocation;
  latestStatus?: StatusUpdate;
  position: { lat: number; lng: number };
  isCurrentUser: boolean;
  isOnline?: boolean;
}

const geocodeLocation = async (city: string, country: string): Promise<{ lat: number; lng: number } | null> => {
  let hash = 0;
  const combinedString = (city || "") + (country || "");
  for (let i = 0; i < combinedString.length; i++) {
    const char = combinedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const latNoise = ((hash % 1000) / 5000) - 0.1; 
  const lngNoise = ((hash % 2000) / 10000) - 0.1; 

  await new Promise(resolve => setTimeout(resolve, 20 + (30 * Math.random())));

  const cityLower = city ? city.toLowerCase() : "";
  const countryLower = country ? country.toLowerCase() : "";

  // West Coast USA Cities
  if (cityLower === "los angeles") return { lat: 34.0522 + latNoise, lng: -118.2437 + lngNoise };
  if (cityLower === "san francisco") return { lat: 37.7749 + latNoise, lng: -122.4194 + lngNoise };
  if (cityLower === "seattle") return { lat: 47.6062 + latNoise, lng: -122.3321 + lngNoise };
  if (cityLower === "san diego") return { lat: 32.7157 + latNoise, lng: -117.1611 + lngNoise };
  if (cityLower === "portland" && (countryLower === "united states" || countryLower === "usa")) return { lat: 45.5051 + latNoise, lng: -122.6750 + lngNoise };
  
  // Other common mock cities
  if (cityLower === "new york") return { lat: 40.7128 + latNoise, lng: -74.0060 + lngNoise };
  if (cityLower === "london") return { lat: 51.5074 + latNoise, lng: -0.1278 + lngNoise };
  if (cityLower === "tokyo") return { lat: 35.6895 + latNoise, lng: 139.6917 + lngNoise };
  if (cityLower === "paris") return { lat: 48.8566 + latNoise, lng: 2.3522 + lngNoise };
  if (cityLower === "sydney") return { lat: -33.8688 + latNoise, lng: 151.2093 + lngNoise };

  // Fallback
  const lat = (hash % 180000) / 1000 - 90 + latNoise;
  const lng = (hash % 360000) / 1000 - 180 + lngNoise;
  return { lat , lng };
};


export function MapDisplay({ friends, apiKey, currentUser, targetView, onTargetViewApplied }: MapDisplayProps) {
  const [selectedPin, setSelectedPin] = useState<MapPinData | null>(null);
  const [localProcessedPins, setLocalProcessedPins] = useState<MapPinData[]>([]);
  
  const defaultGlobalCenter = { lat: 20, lng: 0 };
  const defaultGlobalZoom = 2;

  const [currentMapCenter, setCurrentMapCenter] = useState(defaultGlobalCenter);
  const [currentMapZoom, setCurrentMapZoom] = useState(defaultGlobalZoom);
  const [currentMapKey, setCurrentMapKey] = useState('initial-map-load');

  const prevTargetViewKeyRef = useRef<number | undefined>();
  const places = useMapsLibrary('places');

  useEffect(() => {
    const processPinsAndDetermineView = async () => {
      const currentPins: MapPinData[] = [];

      if (currentUser?.currentLocation) {
        const userLoc = currentUser.currentLocation;
        let userCoords: { lat: number; lng: number } | null = null;
        if (typeof userLoc.latitude === 'number' && typeof userLoc.longitude === 'number') {
          userCoords = { lat: userLoc.latitude, lng: userLoc.longitude };
        } else if (userLoc.city && userLoc.country && places) {
          userCoords = await geocodeLocation(userLoc.city, userLoc.country);
        }
        if (userCoords && typeof userCoords.lat === 'number' && typeof userCoords.lng === 'number') {
          currentPins.push({
            id: currentUser.uid,
            name: currentUser.name || 'Your Location',
            avatarUrl: currentUser.avatarUrl,
            location: userLoc,
            position: userCoords,
            isCurrentUser: true,
            isOnline: true, 
          });
        }
      }

      for (const friend of friends) {
        if (friend.location) {
          let coords: { lat: number; lng: number } | null = null;
          if (typeof friend.location.latitude === 'number' && typeof friend.location.longitude === 'number') {
            coords = { lat: friend.location.latitude, lng: friend.location.longitude };
          } else if (friend.location.city && friend.location.country && places) {
            coords = await geocodeLocation(friend.location.city, friend.location.country);
          }
          if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
            currentPins.push({
              id: friend.id,
              name: friend.name,
              avatarUrl: (friend.photoURL && friend.photoURL.trim() !== "") ? friend.photoURL : (friend.avatarUrl && friend.avatarUrl.trim() !== "") ? friend.avatarUrl : undefined,
              location: friend.location,
              latestStatus: friend.latestStatus,
              position: coords,
              isCurrentUser: false,
              isOnline: friend.isOnline,
            });
          }
        }
      }
      setLocalProcessedPins(currentPins);
      
      let newCenter = defaultGlobalCenter;
      let newZoom = defaultGlobalZoom;
      let viewDeterminedBy = 'default-load';
      const activeTargetViewKey = targetView?.key;

      if (targetView && activeTargetViewKey !== undefined && activeTargetViewKey !== prevTargetViewKeyRef.current) {
        newCenter = targetView.center;
        newZoom = targetView.zoom;
        viewDeterminedBy = `target-${activeTargetViewKey}`;
        if (onTargetViewApplied) {
          onTargetViewApplied();
        }
        prevTargetViewKeyRef.current = activeTargetViewKey;
      } else {
        if (!targetView || (activeTargetViewKey !== undefined && activeTargetViewKey === prevTargetViewKeyRef.current)) {
            prevTargetViewKeyRef.current = undefined; // Reset if target is null or already processed
        }

        if (currentPins.length > 0 && places) {
          if (currentPins.length === 1) {
            newCenter = currentPins[0].position;
            newZoom = 10;
            viewDeterminedBy = `overview-single-pin-${currentPins[0].id}-${Date.now()}`;
          } else {
            const bounds = new places.LatLngBounds();
            currentPins.forEach(pin => {
              if (pin.position && typeof pin.position.lat === 'number' && typeof pin.position.lng === 'number') {
                bounds.extend(new places.LatLng(pin.position.lat, pin.position.lng));
              }
            });

            if (!bounds.isEmpty()) {
              const ne = bounds.getNorthEast();
              const sw = bounds.getSouthWest();

              if (ne && sw) {
                newCenter = bounds.getCenter().toJSON();
                
                const latSpan = Math.abs(ne.lat() - sw.lat());
                const lngSpan = Math.abs(ne.lng() - sw.lng()); // Use absolute for longitude span
                const maxSpan = Math.max(latSpan, lngSpan);

                if (maxSpan > 90) newZoom = 2;       // Very wide, e.g., multiple continents
                else if (maxSpan > 45) newZoom = 3;  // Continental
                else if (maxSpan > 20) newZoom = 4;  // Large country / Sub-continent
                else if (maxSpan > 10) newZoom = 5;  // Country / Large Region (e.g. West Coast USA to Central USA)
                else if (maxSpan > 5) newZoom = 6;   // Smaller Region / State (e.g. California)
                else if (maxSpan > 2) newZoom = 7;   // Multiple cities in a region (e.g. LA & SF)
                else if (maxSpan > 0.5) newZoom = 8; // City Area
                else if (maxSpan > 0.1) newZoom = 10;// Neighborhood
                else newZoom = 12;                   // Very close points

                viewDeterminedBy = `overview-bounds-${currentPins.length}-${Date.now()}`;
              } else {
                viewDeterminedBy = `overview-bounds-invalid-nesw-${Date.now()}`;
                // Fallback to default if bounds calculation is problematic
                newCenter = defaultGlobalCenter;
                newZoom = defaultGlobalZoom;
              }
            } else {
              viewDeterminedBy = `overview-bounds-empty-${Date.now()}`;
            }
          }
        } else if (currentPins.length === 0) { // No pins at all
          viewDeterminedBy = `overview-no-pins-${Date.now()}`;
        } else if (!places) { // Places library not loaded yet
          viewDeterminedBy = `overview-places-not-loaded-${Date.now()}`;
        }
      }
      
      setCurrentMapCenter(newCenter);
      setCurrentMapZoom(newZoom);
      setCurrentMapKey(`map-${newCenter.lat.toFixed(4)}-${newCenter.lng.toFixed(4)}-${newZoom}-${viewDeterminedBy}`);
    };

    processPinsAndDetermineView();
  }, [friends, currentUser, targetView, places, onTargetViewApplied]);


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
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden shadow-lg border border-border">
      <APIProvider apiKey={apiKey} libraries={['places', 'marker']}>
        <Map
          key={currentMapKey}
          defaultCenter={currentMapCenter}
          defaultZoom={currentMapZoom}
          minZoom={2}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId={'globalvibe_map_dark'}
          className="h-full w-full"
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          zoomControl={true}
        >
          {localProcessedPins.map((pin) => {
            let pinBgColor: string;
            let pinBorderColor: string;
            let pinGlyphColor: string;

            if (pin.isCurrentUser) {
              pinBgColor = 'hsl(var(--accent))';
              pinBorderColor = 'hsl(var(--accent-foreground))';
              pinGlyphColor = 'hsl(var(--accent-foreground))';
            } else if (pin.isOnline === true) {
              pinBgColor = 'hsl(var(--primary))';
              pinBorderColor = 'hsl(var(--primary-foreground))';
              pinGlyphColor = 'hsl(var(--primary-foreground))';
            } else { // Offline friend or undefined status
              pinBgColor = 'hsl(var(--muted))';
              pinBorderColor = 'hsl(var(--muted-foreground))';
              pinGlyphColor = 'hsl(var(--muted-foreground))';
            }

            return (
              <AdvancedMarker
                key={pin.id}
                position={pin.position}
                onClick={() => setSelectedPin(pin)}
                zIndex={pin.isCurrentUser ? 10 : (pin.isOnline ? 5 : 1) }
              >
                <Pin
                  background={pinBgColor}
                  borderColor={pinBorderColor}
                  glyphColor={pinGlyphColor}
                />
              </AdvancedMarker>
            );
          })}

          {selectedPin && selectedPin.position && (
            <InfoWindow
              position={selectedPin.position}
              onCloseClick={() => setSelectedPin(null)}
              pixelOffset={[0,-40]}
            >
              <div className="p-2 text-card-foreground bg-card rounded-md shadow-md max-w-xs">
                <h3 className={`text-md font-semibold ${selectedPin.isCurrentUser ? 'text-accent' : (selectedPin.isOnline ? 'text-primary' : 'text-muted-foreground') }`}>{selectedPin.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedPin.location.city}{selectedPin.location.country ? `, ${selectedPin.location.country}` : ''}
                  {(typeof selectedPin.location.latitude === 'number' && typeof selectedPin.location.longitude === 'number') &&
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
