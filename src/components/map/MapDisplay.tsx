
"use client";

import type { Friend, User, UserLocation, StatusUpdate } from '@/types';
import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Globe, Expand } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface MapDisplayProps {
  friends: Friend[];
  apiKey: string | undefined;
  currentUser: User | null;
  targetView?: { center: {lat:number, lng:number}, zoom: number, key: number } | null;
}

interface MapPinData {
  id: string;
  name: string;
  avatarUrl?: string | null;
  location: UserLocation;
  latestStatus?: StatusUpdate;
  position: { lat: number; lng: number };
  isCurrentUser: boolean;
  isOnline?: boolean; // Added to ensure it's part of the type for clarity
}

interface MapControlsProps {
  mapPins: MapPinData[];
}

function MapControls({ mapPins }: MapControlsProps) {
  const map = useMap();

  const centerMapOnFriends = () => {
    if (!map || mapPins.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    mapPins.forEach(pin => {
      bounds.extend(pin.position);
    });

    map.fitBounds(bounds);
  };

  return (
    <div className="absolute top-4 right-4 z-10"> {/* Positioned and layered */}
      <Button variant="default" size="icon" onClick={centerMapOnFriends}>
         <Expand className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function MapDisplay({ friends, apiKey, currentUser, targetView }: MapDisplayProps) {
  const [mapPins, setMapPins] = useState<MapPinData[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapPinData | null>(null);

  const [initialCenter, setInitialCenter] = useState({ lat: 20, lng: 0 });
  const [initialZoom, setInitialZoom] = useState(2);
  
  const prevTargetViewKeyRef = useRef<number | undefined>();

  useEffect(() => {
    const fetchMapPins = async () => {
      const newMapPins: MapPinData[] = [];

      for (const friend of friends) {
        if (friend.location && ((typeof friend.location.latitude === 'number' && typeof friend.location.longitude === 'number'))) {
          let coords: { lat: number; lng: number } | null = null;
          if (typeof friend.location.latitude === 'number' && typeof friend.location.longitude === 'number') {
             coords = { lat: friend.location.latitude, lng: friend.location.longitude };
          } 
          if (coords) {
            newMapPins.push({
              ...friend,
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
        } 
        if (userCoords) {
          currentUserPinData = {
            id: currentUser.uid,
            name: currentUser.name || 'Your Location',
            avatarUrl: currentUser.avatarUrl,
            location: userLoc,
            position: userCoords,
            isCurrentUser: true,
            isOnline: true, // Current user is always "online" for their own map view
          };
          newMapPins.push(currentUserPinData);
        }
      }
      setMapPins(newMapPins); 

      let newCenter = { lat: 20, lng: 0 };
      let newZoom = 2;
      const currentTargetViewKey = targetView?.key;

      if (targetView && currentTargetViewKey !== prevTargetViewKeyRef.current) {
        newCenter = targetView.center;
        newZoom = targetView.zoom;
      } else {
        if (currentUserPinData?.position && typeof currentUserPinData.position.lat === 'number' && typeof currentUserPinData.position.lng === 'number') {
            newCenter = currentUserPinData.position;
            newZoom = newMapPins.length === 1 ? 8 : 4; 
        } 
        //else if (newMapPins.length > 0 && newMapPins[0]?.position && typeof newMapPins[0].position.lat === 'number' && typeof newMapPins[0].position.lng === 'number') {
        //    newCenter = newMapPins[0].position;
        //    newZoom = 3;
        //}
      }
      setInitialCenter(newCenter);
      setInitialZoom(newZoom);
      prevTargetViewKeyRef.current = currentTargetViewKey;
    };
    fetchMapPins();
  }, [friends, currentUser, targetView]); 

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
    <div className="h-[500px] w-full rounded-lg overflow-hidden shadow-lg border border-border relative"> {/* Added relative positioning */}
      <APIProvider apiKey={apiKey} libraries={['places', 'marker']}>
        <Map
          key={`${initialCenter.lat}-${initialCenter.lng}-${initialZoom}-${targetView?.key || 'default'}`} 
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
          {mapPins.map((pin) => {
            let pinBgColor: string;
            let pinBorderColor: string;
            let pinGlyphColor: string;

            if (pin.isCurrentUser) {
              pinBgColor = 'hsl(var(--accent))';
              pinBorderColor = 'hsl(var(--accent-foreground))';
              pinGlyphColor = 'hsl(var(--accent-foreground))';
            } else if (pin.isOnline === true) { // Vibing friend
              pinBgColor = 'hsl(var(--primary))';
              pinBorderColor = 'hsl(var(--primary-foreground))';
              pinGlyphColor = 'hsl(var(--primary-foreground))';
            } else { // Contemplating friend (isOnline is false or undefined)
              pinBgColor = 'hsl(var(--muted))';
              pinBorderColor = 'hsl(var(--muted-foreground))';
              pinGlyphColor = 'hsl(var(--muted-foreground))';
            }

            return (
              <AdvancedMarker
                key={pin.id}
                position={pin.position}
                onClick={() => setSelectedPin(pin)}
                zIndex={pin.isCurrentUser ? 10 : (pin.isOnline ? 5 : 1) } // Current user highest, then online friends, then offline
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
          <MapControls mapPins={mapPins} />
        </Map>
      </APIProvider>
    </div>
  );
}

