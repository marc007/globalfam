
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FriendList } from '@/components/friends/FriendList';
import { MapDisplay } from '@/components/map/MapDisplay';
import { StatusForm } from '@/components/forms/StatusForm';
import type { Friend } from '@/types'; // UserLocation is part of Friend via UserProfileData
import { Loader2, Users, Map as MapIcon, MessageSquare } from 'lucide-react';
// import { useToast } from '@/hooks/use-toast'; // Not used directly anymore for status posting here

import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { listenToUserProfile } from '@/lib/firebase/users';
import { listenToLatestUserStatus } from '@/lib/firebase/statusUpdates';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  // const { toast } = useToast(); // Not used directly anymore
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
      setFriends([]); // Clear friends if user logs out
      activeListeners.forEach(unsub => unsub()); // Unsubscribe from all existing listeners
      setActiveListeners([]);
      return;
    }

    // Clean up previous listeners before starting new ones
    activeListeners.forEach(unsub => unsub());
    const newListenersContainer: (() => void)[] = [];

    const friendsCollectionRef = collection(db, 'users', user.uid, 'friends');
    const friendsListUnsub = onSnapshot(friendsCollectionRef, (friendsSnapshot) => {
      const friendUids = friendsSnapshot.docs.map(doc => doc.id);

      // Further cleanup: Unsubscribe from listeners associated with friends no longer in the list
      // This requires more sophisticated listener management (e.g., storing them in a map by friendUid)
      // For now, we're resubscribing, which is less optimal but simpler for this iteration.
      // The activeListeners array will be rebuilt.

      // Initialize friends array with UIDs, other data will be filled by listeners
      const initialFriendData = friendUids.map(uid => ({
        id: uid,
        name: 'Loading...',
        avatarUrl: undefined,
        location: { city: 'Unknown', country: '' }, // Provide a default structure for location
        latestStatus: undefined,
      }));
      setFriends(initialFriendData);

      const currentPerFriendListeners: (() => void)[] = [];

      friendUids.forEach(friendUid => {
        const profileUnsub = listenToUserProfile(friendUid, (friendProfile) => {
          if (friendProfile) {
            setFriends(prevFriends =>
              prevFriends.map(f =>
                f.id === friendUid
                  ? {
                      ...f,
                      name: friendProfile.name || 'Unknown',
                      avatarUrl: friendProfile.avatarUrl,
                      location: friendProfile.currentLocation || { city: 'Not set', country: '' },
                    }
                  : f
              )
            );
          } else {
             // Handle case where friend profile is null (e.g., document deleted)
             setFriends(prevFriends => prevFriends.filter(f => f.id !== friendUid));
          }
        });
        currentPerFriendListeners.push(profileUnsub);

        const statusUnsub = listenToLatestUserStatus(friendUid, (latestStatus) => {
          setFriends(prevFriends =>
            prevFriends.map(f =>
              f.id === friendUid
                ? { ...f, latestStatus: latestStatus || undefined }
                : f
            )
          );
        });
        currentPerFriendListeners.push(statusUnsub);
      });
      // Combine the main friends list unsub with per-friend unsubs
      setActiveListeners([friendsListUnsub, ...currentPerFriendListeners]);
    }, (error) => {
      console.error("Error listening to friends list:", error);
      // Potentially show a toast or error message to the user
    });

    // Add the main friends list listener to the container initially
    newListenersContainer.push(friendsListUnsub);
    setActiveListeners(newListenersContainer); // This will be updated inside the friendsListUnsub callback too

    return () => {
      // This cleanup runs when user.uid changes or component unmounts
      activeListeners.forEach(unsub => unsub()); // Cleans up all listeners stored
      newListenersContainer.forEach(unsub => unsub()); // Ensure any initially added are also cleaned
    };
  }, [user?.uid]); // Effect dependency

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
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">{user.name || 'Global Explorer'}</span>!
        </h1>
        <p className="text-lg text-muted-foreground">Here's what your GlobalFam is up to.</p>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <MapIcon className="h-8 w-8 text-accent" />
          <h2 className="text-3xl font-semibold">Friends on the Map</h2>
        </div>
        <MapDisplay friends={friends} apiKey={mapsApiKey} />
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
          <StatusForm /> {/* onPostStatus prop was removed previously */}
        </section>
      </div>
    </div>
  );
}
