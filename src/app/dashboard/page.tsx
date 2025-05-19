
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
import { Timestamp } from 'firebase/firestore';

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

  const handleTargetViewApplied = () => {
    setMapTargetView(null);
  };

  useEffect(() => {
    if (!user?.uid) {
      setFriends([]);
      activeListeners.forEach(unsub => unsub());
      setActiveListeners([]);
      return;
    }

    // Clean up previous listeners
    activeListeners.forEach(unsub => unsub());
    const newListeners: (() => void)[] = [];

    const userProfileUnsub = listenToUserProfile(user.uid, (currentUserProfile) => {
      if (currentUserProfile?.friends) {
        const friendUids = currentUserProfile.friends;
        
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
                isOnline: false, // Default to offline until profile loads
              });
            }
          });
          // Filter out friends that are no longer in friendUids but keep existing data for those that are
          return freshFriendsArray.filter(f => friendUids.includes(f.id));
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
                        avatarUrl: (friendProfile.photoURL && friendProfile.photoURL.trim() !== "") ? friendProfile.photoURL : (friendProfile.avatarUrl && friendProfile.avatarUrl.trim() !== "") ? friendProfile.avatarUrl : undefined,
                        location: friendProfile.currentLocation || { city: 'Location not set', country: '' },
                        isOnline: friendProfile.isOnline || false, // Ensure isOnline is a boolean
                      }
                    : f
                )
              );
            } else {
              // If a friend's profile is removed or inaccessible, remove them from the list
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
            if (latestStatus && latestStatus.userId !== user?.uid && latestStatus.location && typeof latestStatus.location.latitude === 'number' && typeof latestStatus.location.longitude === 'number') {
              setMapTargetView({
                center: { lat: latestStatus.location.latitude, lng: latestStatus.location.longitude },
                zoom: 12, 
                key: Date.now() 
              });
            }
          });
          perFriendListeners.push(friendStatusUnsub);
        });
        newListeners.push(...perFriendListeners);

      } else if (!currentUserProfile) { // User profile doesn't exist or no friends field
        setFriends([]);
      }
    });
    newListeners.push(userProfileUnsub);

    setActiveListeners(newListeners);

    return () => {
      newListeners.forEach(unsub => unsub());
    };
  }, [user?.uid]); // Re-run if user.uid changes

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleCurrentUserStatusSuccess = () => {
    if (user?.currentLocation && typeof user.currentLocation.latitude === 'number' && typeof user.currentLocation.longitude === 'number') {
      setMapTargetView({
        center: { lat: user.currentLocation.latitude, lng: user.currentLocation.longitude },
        zoom: 12, 
        key: Date.now() 
      });
    }
  };

  const handleFriendCardClick = (clickedFriend: Friend) => {
    if (clickedFriend.location && typeof clickedFriend.location.latitude === 'number' && typeof clickedFriend.location.longitude === 'number') {
      setMapTargetView({
        center: { lat: clickedFriend.location.latitude, lng: clickedFriend.location.longitude },
        zoom: 12, 
        key: Date.now() 
      });
    } else if (clickedFriend.location && clickedFriend.location.city) {
      console.log("Friend location has city/country but no explicit lat/lng for direct focus via card click.");
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

  const sortedFriends = [...friends].sort((a, b) => {
    const aOnline = a.isOnline === true;
    const bOnline = b.isOnline === true;
    if (aOnline && !bOnline) return -1; // a comes first
    if (!aOnline && bOnline) return 1;  // b comes first
    // Optional: secondary sort by name if online status is the same
    return (a.name || '').localeCompare(b.name || '');
  });
  
  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">{user.displayName || user.email || 'Global Explorer'}</span>!
        </h1>
        <p className="text-lg text-muted-foreground">Here's what your GlobalVibe is up to.</p>
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
          onTargetViewApplied={handleTargetViewApplied}
        />
      </section>
      
      <div className="grid md:grid-cols-3 gap-8 items-start">
        <section className="md:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <Users className="h-8 w-8 text-secondary" />
            <h2 className="text-3xl font-semibold">Your Fam</h2>
          </div>
          <FriendList friends={sortedFriends} onFriendCardClick={handleFriendCardClick} />
        </section>

        <section className="md:col-span-1 space-y-6 md:sticky md:top-24">
           <div className="flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-green-400" />
            <h2 className="text-3xl font-semibold">Share Your Vibe</h2>
          </div>
          <StatusForm onStatusPostedSuccess={handleCurrentUserStatusSuccess} /> 
        </section>
      </div>
    </div>
  );
}

    