
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FriendList } from '@/components/friends/FriendList';
import { MapDisplay } from '@/components/map/MapDisplay';
import { StatusForm } from '@/components/forms/StatusForm';
import type { Friend } from '@/types'; 
import { Loader2, Users, Map as MapIcon, MessageSquare } from 'lucide-react';

import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { listenToUserProfile, UserProfile } from '@/lib/firebase/users'; // Import UserProfile type
import { listenToLatestUserStatus, StatusUpdate } from '@/lib/firebase/statusUpdates'; // Import StatusUpdate type

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [activeListeners, setActiveListeners] = useState<(() => void)[]>([]);

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

    // Clean up previous top-level listener and per-friend listeners
    activeListeners.forEach(unsub => unsub());
    const newTopLevelListeners: (() => void)[] = [];

    // Listener for the current user's friends list (their UIDs)
    // Assuming friends UIDs are stored directly in the user's profile `friends` array.
    const userProfileUnsub = listenToUserProfile(user.uid, (currentUserProfile) => {
      if (currentUserProfile && currentUserProfile.friends) {
        const friendUids = currentUserProfile.friends;

        // Unsubscribe from listeners for friends who are no longer in the list
        // This part requires careful management. For now, we are rebuilding all per-friend listeners.
        // A more optimized approach would selectively unsubscribe.
        
        // Set initial state for friends or update existing ones
        setFriends(prevFriends => {
          const existingFriendIds = new Set(prevFriends.map(f => f.id));
          const newFriendUids = new Set(friendUids);
          
          // Remove friends no longer in the list
          const updatedFriends = prevFriends.filter(f => newFriendUids.has(f.id));
          
          // Add new friends or update existing ones (initially with loading state)
          friendUids.forEach(uid => {
            if (!existingFriendIds.has(uid)) {
              updatedFriends.push({
                id: uid,
                name: 'Loading...',
                avatarUrl: undefined,
                location: { city: 'Unknown', country: '' }, 
                latestStatus: undefined,
              });
            }
          });
          return updatedFriends;
        });


        const currentPerFriendListeners: (() => void)[] = [];
        friendUids.forEach(friendUid => {
          // Listener for each friend's profile
          const friendProfileUnsub = listenToUserProfile(friendUid, (friendProfile: UserProfile | null) => {
            if (friendProfile) {
              setFriends(prevFriends =>
                prevFriends.map(f =>
                  f.id === friendUid
                    ? {
                        ...f,
                        name: friendProfile.displayName || 'Unknown Name', // Use displayName
                        avatarUrl: friendProfile.photoURL || undefined,    // Use photoURL
                        // currentLocation is now part of UserProfile from users.ts
                        location: friendProfile.currentLocation || { city: 'Location not set', country: '' },
                      }
                    : f
                )
              );
            } else {
              // If a friend's profile is removed or doesn't exist, remove them from the list
              setFriends(prevFriends => prevFriends.filter(f => f.id !== friendUid));
            }
          });
          currentPerFriendListeners.push(friendProfileUnsub);

          // Listener for each friend's latest status
          const friendStatusUnsub = listenToLatestUserStatus(friendUid, (latestStatus: StatusUpdate | null) => {
            setFriends(prevFriends =>
              prevFriends.map(f =>
                f.id === friendUid
                  ? { ...f, latestStatus: latestStatus || undefined }
                  : f
              )
            );
          });
          currentPerFriendListeners.push(friendStatusUnsub);
        });
        // Combine the main user profile listener with per-friend listeners
        setActiveListeners([userProfileUnsub, ...currentPerFriendListeners]);

      } else if (!currentUserProfile) {
        // Current user's profile doesn't exist or was removed
        setFriends([]);
        // activeListeners already cleared at top or by previous iteration
      }
    });
    newTopLevelListeners.push(userProfileUnsub);
    setActiveListeners(newTopLevelListeners); // Set initial listener(s)

    return () => {
      // This will now include userProfileUnsub and all per-friend listeners from the latest execution
      activeListeners.forEach(unsub => unsub());
    };
  }, [user?.uid]);

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
          {/* Use user.displayName from AuthContext if available, or fallback */}
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">{user.displayName || user.email || 'Global Explorer'}</span>!
        </h1>
        <p className="text-lg text-muted-foreground">Here's what your GlobalFam is up to.</p>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <MapIcon className="h-8 w-8 text-accent" />
          <h2 className="text-3xl font-semibold">Friends on the Map</h2>
        </div>
        <MapDisplay friends={friends} apiKey={mapsApiKey} currentUser={user} />
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
          <StatusForm /> 
        </section>
      </div>
    </div>
  );
}
