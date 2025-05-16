
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FriendList } from '@/components/friends/FriendList';
import { MapDisplay } from '@/components/map/MapDisplay';
import { StatusForm } from '@/components/forms/StatusForm';
import type { Friend, UserLocation } from '@/types'; 
import { Loader2, Users, Map as MapIcon, MessageSquare } from 'lucide-react';

import { listenToUserProfile, UserProfile } from '@/lib/firebase/users'; 
import { listenToLatestUserStatus, StatusUpdate } from '@/lib/firebase/statusUpdates'; 

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [activeListeners, setActiveListeners] = useState<(() => void)[]>([]);
  const [mapTargetView, setMapTargetView] = useState<{ center: {lat:number, lng:number}, zoom: number, key: number } | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user?.uid) {
      setFriends([]);
      activeListeners.forEach(unsub => unsub());
      setActiveListeners([]);
      return;
    }

    activeListeners.forEach(unsub => unsub());
    const newListeners: (() => void)[] = [];

    const userProfileUnsub = listenToUserProfile(user.uid, (currentUserProfile) => {
      if (currentUserProfile?.friends) {
        const friendUids = currentUserProfile.friends;
        const currentFriendIds = new Set(friends.map(f => f.id));
        const newFriendUidsSet = new Set(friendUids);

        // Filter out stale listeners and friends
        const listenersToKeep: (() => void)[] = [];
        const updatedFriendsState = friends.filter(friend => {
          if (newFriendUidsSet.has(friend.id)) {
            // Find existing listeners for this friend and keep them (this part is complex, for now, we're rebuilding)
            return true; 
          }
          // For friends removed, their specific listeners should have been cleaned up by index.
          // This part is simplified: we rebuild listeners based on current friendUids.
          return false; 
        });
        
        setFriends(prevFriends => {
          const existingFriendsMap = new Map(prevFriends.map(f => [f.id, f]));
          const freshFriendsArray: Friend[] = [];

          friendUids.forEach(uid => {
            if (existingFriendsMap.has(uid)) {
              freshFriendsArray.push(existingFriendsMap.get(uid)!);
            } else {
              freshFriendsArray.push({
                id: uid,
                name: 'Loading...',
                avatarUrl: undefined,
                location: { city: 'Unknown', country: '' }, 
                latestStatus: undefined,
              });
            }
          });
          return freshFriendsArray;
        });

        const perFriendListeners: (() => void)[] = [];
        friendUids.forEach(friendUid => {
          const friendProfileUnsub = listenToUserProfile(friendUid, (friendProfile: UserProfile | null) => {
            if (friendProfile) {
              setFriends(prevFriends =>
                prevFriends.map(f =>
                  f.id === friendUid
                    ? {
                        ...f,
                        name: friendProfile.displayName || 'Unknown Name',
                        avatarUrl: friendProfile.photoURL || undefined,
                        location: friendProfile.currentLocation || { city: 'Location not set', country: '' },
                      }
                    : f
                )
              );
            } else {
              setFriends(prevFriends => prevFriends.filter(f => f.id !== friendUid));
            }
          });
          perFriendListeners.push(friendProfileUnsub);

          const friendStatusUnsub = listenToLatestUserStatus(friendUid, (latestStatus: StatusUpdate | null) => {
            setFriends(prevFriends =>
              prevFriends.map(f =>
                f.id === friendUid
                  ? { ...f, latestStatus: latestStatus || undefined }
                  : f
              )
            );
          });
          perFriendListeners.push(friendStatusUnsub);
        });
        newListeners.push(...perFriendListeners); // Add per-friend listeners

      } else if (!currentUserProfile) {
        setFriends([]);
      }
    });
    newListeners.push(userProfileUnsub); // Add the main user profile listener

    setActiveListeners(prev => { // Combine with existing if any, though usually this runs once per user change
        prev.forEach(unsub => unsub()); // Clean up old before setting new
        return newListeners;
    });


    return () => {
      newListeners.forEach(unsub => unsub());
    };
  }, [user?.uid]); // Dependency on user.uid

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleStatusSuccess = () => {
    if (user?.currentLocation?.latitude != null && user?.currentLocation?.longitude != null) {
      setMapTargetView({
        center: { lat: user.currentLocation.latitude, lng: user.currentLocation.longitude },
        zoom: 12, // Desired zoom level after status post
        key: Date.now() // Unique key to trigger update in MapDisplay
      });
    }
  };

  if (authLoading || !isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <p className="text-xl text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">{user.displayName || user.email || 'Global Explorer'}</span>!
        </h1>
        <p className="text-lg text-muted-foreground">Here's what your GlobalFam is up to.</p>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <MapIcon className="h-8 w-8 text-accent" />
          <h2 className="text-3xl font-semibold">Friends on the Map</h2>
        </div>
        <MapDisplay 
          friends={friends} 
          apiKey={mapsApiKey} 
          currentUser={user}
          targetView={mapTargetView} 
        />
      </section>
      
      <div className="grid md:grid-cols-3 gap-8 items-start">
        <section className="md:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <Users className="h-8 w-8 text-secondary" />
            <h2 className="text-3xl font-semibold">Your Fam</h2>
          </div>
          <FriendList friends={friends} />
        </section>

        <section className="md:col-span-1 space-y-6 md:sticky md:top-24">
           <div className="flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-green-400" />
            <h2 className="text-3xl font-semibold">Share Your Vibe</h2>
          </div>
          <StatusForm onStatusPostedSuccess={handleStatusSuccess} /> 
        </section>
      </div>
    </div>
  );
}
