
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

// Represents any pin on the map, whether current user or a friend
interface MapPinData {
  id: string; // User's UID
  name: string;
  avatarUrl?: string;
  location: UserLocation;
  latestStatus?: StatusUpdate; // Optional, typically for friends
  position: { lat: number; lng: number };
  isCurrentUser: boolean;
}

// Mock geocoding function (in a real app, use Google Geocoding API)
const geocodeLocation = async (city: string, country: string): Promise<{ lat: number; lng: number } | null> => {
  // This is a very basic mock. Real geocoding is complex.
  let hash = 0;
  for (let i = 0; i < city.length; i++) {
    const char = city.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  const lat = (hash % 180000) / 1000 - 90; 
  const lng = (hash % 360000) / 1000 - 180; 
  
  await new Promise(resolve => setTimeout(resolve, 100 * Math.random()));
  
  const cityLower = city.toLowerCase();
  if (cityLower === "new york") return { lat: 40.7128 + (Math.random()-0.5)*0.1, lng: -74.0060 + (Math.random()-0.5)*0.1 };
  if (cityLower === "london") return { lat: 51.5074 + (Math.random()-0.5)*0.1, lng: -0.1278 + (Math.random()-0.5)*0.1 };
  if (cityLower === "tokyo") return { lat: 35.6895 + (Math.random()-0.5)*0.1, lng: 139.6917 + (Math.random()-0.5)*0.1 };
  if (cityLower === "paris") return { lat: 48.8566 + (Math.random()-0.5)*0.1, lng: 2.3522 + (Math.random()-0.5)*0.1 };
  if (cityLower === "sydney") return { lat: -33.8688 + (Math.random()-0.5)*0.1, lng: 151.2093 + (Math.random()-0.5)*0.1 };
  
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

      // Process friends
      for (const friend of friends) {
        if (friend.location && friend.location.city && friend.location.country) {
          let coords: { lat: number; lng: number } | null = null;
          if (friend.location.latitude && friend.location.longitude) {
             coords = { lat: friend.location.latitude, lng: friend.location.longitude };
          } else {
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

      // Process current user
      if (currentUser && currentUser.currentLocation) {
        const userLoc = currentUser.currentLocation;
        if (userLoc.city && userLoc.country) {
          let userCoords: { lat: number; lng: number } | null = null;
          if (userLoc.latitude && userLoc.longitude) {
            userCoords = { lat: userLoc.latitude, lng: userLoc.longitude };
          } else {
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
              // latestStatus: undefined, // Current user's pin doesn't show their own status in this context
            });
          }
        }
      }
      
      setMapPins(newMapPins);

      if (newMapPins.length > 0) {
        // Prioritize current user's location for initial center if available
        const currentUserPin = newMapPins.find(p => p.isCurrentUser);
        const firstPin = currentUserPin || newMapPins[0];
        
        if (firstPin && firstPin.position) {
          setInitialCenter(firstPin.position);
          setInitialZoom(newMapPins.length === 1 ? 6 : 3); // Zoom in more if only one pin
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
              zIndex={pin.isCurrentUser ? 10 : 1} // Current user's pin on top
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
                <p className="text-sm text-muted-foreground">{selectedPin.location.city}, {selectedPin.location.country}</p>
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
