
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


export function MapDisplay({ friends, apiKey, currentUser, targetView }: MapDisplayProps) {
  const [mapPins, setMapPins] = useState<MapPinData[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapPinData | null>(null);

  const [effectiveCenter, setEffectiveCenter] = useState({ lat: 20, lng: 0 });
  const [effectiveZoom, setEffectiveZoom] = useState(2);

  const prevTargetViewKeyRef = useRef<number | undefined>();
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (!places) return; 

    const processPinsAndSetView = async () => {
      const newProcessedPins: MapPinData[] = [];

      for (const friend of friends) {
        if (friend.location && (typeof friend.location.latitude === 'number' && typeof friend.location.longitude === 'number' || (friend.location.city && friend.location.country))) {
          let coords: { lat: number; lng: number } | null = null;
          if (typeof friend.location.latitude === 'number' && typeof friend.location.longitude === 'number') {
             coords = { lat: friend.location.latitude, lng: friend.location.longitude };
          } else if (friend.location.city && friend.location.country) {
            coords = await geocodeLocation(friend.location.city, friend.location.country);
          }

          if (coords) {
            newProcessedPins.push({
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

      let currentUserPinData: MapPinData | undefined = undefined;
      if (currentUser && currentUser.currentLocation) {
        const userLoc = currentUser.currentLocation;
        let userCoords: { lat: number; lng: number } | null = null;
        if (typeof userLoc.latitude === 'number' && typeof userLoc.longitude === 'number') {
          userCoords = { lat: userLoc.latitude, lng: userLoc.longitude };
        } else if (userLoc.city && userLoc.country) {
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
          newProcessedPins.push(currentUserPinData);
        }
      }
      setMapPins(newProcessedPins); 

      let newCenter = { lat: 20, lng: 0 };
      let newZoom = 2;
      
      const currentTargetViewKey = targetView?.key;
      const prevKey = prevTargetViewKeyRef.current;
      prevTargetViewKeyRef.current = currentTargetViewKey;


      if (targetView && currentTargetViewKey !== prevKey) {
        newCenter = targetView.center;
        newZoom = targetView.zoom;
      } else {
        if (newProcessedPins.length > 0) {
          if (newProcessedPins.length === 1 && newProcessedPins[0]?.position) {
            newCenter = newProcessedPins[0].position;
            newZoom = 10; 
          } else {
            const bounds = new places.LatLngBounds();
            let validPinsForBounds = 0;
            newProcessedPins.forEach(pin => {
              if (pin.position && typeof pin.position.lat === 'number' && typeof pin.position.lng === 'number') {
                bounds.extend(new places.LatLng(pin.position.lat, pin.position.lng));
                validPinsForBounds++;
              }
            });

            if (validPinsForBounds > 0 && !bounds.isEmpty()) {
              newCenter = bounds.getCenter().toJSON();
              const northEast = bounds.getNorthEast();
              const southWest = bounds.getSouthWest();
              const latSpan = Math.abs(northEast.lat() - southWest.lat());
              const lngSpan = Math.abs(northEast.lng() - southWest.lng());

              if (latSpan === 0 && lngSpan === 0 && validPinsForBounds > 0) { 
                newZoom = 12; 
              } else if (latSpan > 90 || lngSpan > 180) { newZoom = 2; }
              else if (latSpan > 30 || lngSpan > 60) { newZoom = 3; }
              else if (latSpan > 10 || lngSpan > 20) { newZoom = 4; }
              else if (latSpan > 1 || lngSpan > 1) { newZoom = 6; }
              else { newZoom = 8; }
            } else { 
              newCenter = { lat: 20, lng: 0 };
              newZoom = 2;
            }
          }
        } else {
          newCenter = { lat: 20, lng: 0 };
          newZoom = 2;
        }
      }
      
      setEffectiveCenter(newCenter);
      setEffectiveZoom(newZoom);
    };

    processPinsAndSetView();
  }, [friends, currentUser, targetView, places]); 


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
          key={`${effectiveCenter.lat}-${effectiveCenter.lng}-${effectiveZoom}-${targetView?.key || 'default'}`} 
          defaultCenter={effectiveCenter}
          defaultZoom={effectiveZoom}
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
