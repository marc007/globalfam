
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
  onTargetViewApplied?: () => void; // Callback when targetView has been processed
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

export function MapDisplay({ friends, apiKey, currentUser, targetView, onTargetViewApplied }: MapDisplayProps) {
  const [mapPins, setMapPins] = useState<MapPinData[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapPinData | null>(null);
  
  const defaultGlobalCenter = { lat: 20, lng: 0 };
  const defaultGlobalZoom = 2;

  const [currentMapCenter, setCurrentMapCenter] = useState(defaultGlobalCenter);
  const [currentMapZoom, setCurrentMapZoom] = useState(defaultGlobalZoom);
  const [currentMapKey, setCurrentMapKey] = useState('initial-map-load');

  const prevTargetViewKeyRef = useRef<number | undefined>();
  const places = useMapsLibrary('places'); // For bounds calculation

  useEffect(() => {
    const processPinsAndDetermineView = async () => {
      if (!places && friends.some(f => f.location && !(typeof f.location.latitude === 'number' && typeof f.location.longitude === 'number'))) {
        return;
      }

      const processedPins: MapPinData[] = [];
      let currentUserPinData: MapPinData | undefined = undefined;

      // Process current user
      if (currentUser?.currentLocation) {
        const userLoc = currentUser.currentLocation;
        let userCoords: { lat: number; lng: number } | null = null;
        if (typeof userLoc.latitude === 'number' && typeof userLoc.longitude === 'number') {
          userCoords = { lat: userLoc.latitude, lng: userLoc.longitude };
        } else if (userLoc.city && userLoc.country && places) {
          userCoords = await geocodeLocation(userLoc.city, userLoc.country);
        }
        if (userCoords) {
          currentUserPinData = {
            id: currentUser.uid,
            name: currentUser.name || 'Your Location',
            avatarUrl: currentUser.avatarUrl,
            location: userLoc,
            position: userCoords,
            isCurrentUser: true,
            isOnline: true,
          };
          processedPins.push(currentUserPinData);
        }
      }

      // Process friends
      for (const friend of friends) {
        if (friend.location) {
          let coords: { lat: number; lng: number } | null = null;
          if (typeof friend.location.latitude === 'number' && typeof friend.location.longitude === 'number') {
            coords = { lat: friend.location.latitude, lng: friend.location.longitude };
          } else if (friend.location.city && friend.location.country && places) {
            coords = await geocodeLocation(friend.location.city, friend.location.country);
          }
          if (coords) {
            processedPins.push({
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
      setMapPins(processedPins);

      let newCenter = defaultGlobalCenter;
      let newZoom = defaultGlobalZoom;
      let viewDeterminedBy = 'default';

      const activeTargetViewKey = targetView?.key;
      const lastProcessedTargetKey = prevTargetViewKeyRef.current;

      if (targetView && activeTargetViewKey !== undefined && activeTargetViewKey !== lastProcessedTargetKey) {
        newCenter = targetView.center;
        newZoom = targetView.zoom;
        viewDeterminedBy = `target-${activeTargetViewKey}`;
        prevTargetViewKeyRef.current = activeTargetViewKey;
        onTargetViewApplied?.(); // Notify parent that target view was applied
      } else {
         // Clear ref if targetView is no longer active or new, to allow overview recalculation
        if (lastProcessedTargetKey !== undefined && (activeTargetViewKey === undefined || activeTargetViewKey === lastProcessedTargetKey) ) {
             prevTargetViewKeyRef.current = undefined;
        }

        if (processedPins.length === 1 && processedPins[0]?.position) {
          newCenter = processedPins[0].position;
          newZoom = 10;
          viewDeterminedBy = `single-pin-${processedPins[0].id}`;
        } else if (processedPins.length > 1 && places) {
          const bounds = new places.LatLngBounds();
          processedPins.forEach(pin => {
            if (pin.position && typeof pin.position.lat === 'number' && typeof pin.position.lng === 'number') {
              bounds.extend(new places.LatLng(pin.position.lat, pin.position.lng));
            }
          });
          if (!bounds.isEmpty()) {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            if (ne && sw) { // Ensure bounds are valid before using them
              newCenter = { lat: bounds.getCenter().lat(), lng: bounds.getCenter().lng() };
              const latDiff = Math.abs(ne.lat() - sw.lat());
              const lngDiff = Math.abs(ne.lng() - sw.lng());
              if (latDiff > 120 || lngDiff > 240) newZoom = 2;
              else if (latDiff > 60 || lngDiff > 120) newZoom = 3;
              else if (latDiff > 30 || lngDiff > 60) newZoom = 4;
              else if (latDiff > 15 || lngDiff > 30) newZoom = 5;
              else if (latDiff > 5 || lngDiff > 10) newZoom = 6;
              else if (latDiff > 1 || lngDiff > 2) newZoom = 8;
              else newZoom = 10;
              viewDeterminedBy = `bounds-${processedPins.length}-${Date.now()}`; // Add timestamp to ensure key changes
            } else {
              // Fallback if bounds.ne or .sw is null/undefined
              viewDeterminedBy = 'bounds-invalid';
            }
          } else {
            // Fallback if bounds are empty (e.g., no valid pins with coords)
            viewDeterminedBy = 'bounds-empty';
          }
        } else if (currentUserPinData?.position) { // Only current user
            newCenter = currentUserPinData.position;
            newZoom = 10;
            viewDeterminedBy = `current-user-only-${currentUser?.uid}`;
        }
        // If still default, viewDeterminedBy remains 'default'
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
          {mapPins.map((pin) => {
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
            } else { 
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
