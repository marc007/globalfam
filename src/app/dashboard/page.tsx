"use client";

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FriendList } from '@/components/friends/FriendList';
import { MapDisplay } from '@/components/map/MapDisplay';
import { StatusForm } from '@/components/forms/StatusForm';
import type { Friend, StatusUpdate, UserLocation } from '@/types';
import { Loader2, Users, Map as MapIcon, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Mock data - replace with actual data fetching
const MOCK_FRIENDS: Friend[] = [
  { id: '1', name: 'Alice Wonderland', avatarUrl: 'https://picsum.photos/seed/alice/200/200', location: { city: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.0060 }, latestStatus: { id: 's1', userId: '1', content: 'Exploring Central Park today! 🌳', createdAt: new Date(Date.now() - 3600000 * 2) } },
  { id: '2', name: 'Bob The Explorer', avatarUrl: 'https://picsum.photos/seed/bob/200/200', location: { city: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278 }, latestStatus: { id: 's2', userId: '2', content: 'Just had amazing fish and chips! 🐟🍟', createdAt: new Date(Date.now() - 3600000 * 5) } },
  { id: '3', name: 'Charlie Nomad', avatarUrl: 'https://picsum.photos/seed/charlie/200/200', location: { city: 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.6917 }, latestStatus: { id: 's3', userId: '3', content: 'Lost in translation, but loving it! 🗼', createdAt: new Date(Date.now() - 3600000 * 24) } },
  { id: '4', name: 'Diana Voyager', avatarUrl: 'https://picsum.photos/seed/diana/200/200', location: { city: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 } },
  { id: '5', name: 'Evan Globetrotter', avatarUrl: 'https://picsum.photos/seed/evan/200/200', location: { city: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093 }, latestStatus: { id: 's4', userId: '5', content: 'Sun, surf, and Sydney Opera House! ☀️🌊', createdAt: new Date(Date.now() - 3600000 * 8) } },
];


export default function DashboardPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!authLoading && !user) {
      router.replace('/');
    } else if (user) {
      // Simulate fetching friends data
      setFriends(MOCK_FRIENDS);
    }
  }, [user, authLoading, router]);

  const handlePostStatus = async (data: { content: string }): Promise<void> => {
    // Server action simulation
    console.log("Posting status:", data.content, "for user:", user?.id);
    // In a real app, this would be a server action call.
    // For demo, add it to the current user's "mock" data or a global mock status list.
    // This won't persist or update friend cards unless you manage a global state for statuses.
    // For simplicity, we just show a toast here.
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    // throw new Error("Simulated server error"); // Uncomment to test error handling
  };
  
  const mapsApiKey = 'AIzaSyCLanYUNjQKgle7pga3nRgOdkuWALzOL6E'; /*process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;*/

  if (authLoading || !isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }

  if (!user) {
     // Should be caught by useEffect, but as a fallback:
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

        <section className="md:col-span-1 space-y-6 md:sticky md:top-24"> {/* Sticky status form */}
           <div className="flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-green-400" />
            <h2 className="text-3xl font-semibold">Share Your Vibe</h2>
          </div>
          <StatusForm onPostStatus={handlePostStatus} />
        </section>
      </div>

    </div>
  );
}
