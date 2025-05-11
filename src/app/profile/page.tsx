"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LocationForm } from '@/components/forms/LocationForm';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserCircle, MapPin, Edit3, LogOut } from 'lucide-react';
import type { UserLocation } from '@/types';
import { Button } from '@/components/ui/button';

// Mock server action for updating location
async function updateUserLocation(userId: string, location: UserLocation): Promise<void> {
  console.log(`Server Action: Updating location for user ${userId} to`, location);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  // In a real app, update the database here.
  // For demo, we could update localStorage if user object is stored there or rely on AuthContext to refresh
  
  // Example of throwing an error:
  // if (Math.random() < 0.3) {
  //   throw new Error("Simulated server error during location update!");
  // }
}


export default function ProfilePage() {
  const { user, isLoading, logout, setUser } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  const handleUpdateLocation = async (data: UserLocation) => {
    if (!user) return;
    await updateUserLocation(user.id, data);
    // Update user in AuthContext (or refetch user data)
    setUser(prevUser => prevUser ? ({ ...prevUser, currentLocation: data }) : null);
    // If user data is stored in localStorage, update it there too
    const storedUser = localStorage.getItem('globalfam-user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      localStorage.setItem('globalfam-user', JSON.stringify({ ...parsedUser, currentLocation: data }));
    }
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'GF';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading || !isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl text-muted-foreground">Loading Profile...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Or redirect, handled by useEffect
  }

  return (
    <div className="space-y-12">
      <section className="flex flex-col items-center text-center">
        <Avatar className="h-32 w-32 mb-6 border-4 border-primary shadow-lg">
          <AvatarImage src={user.avatarUrl} alt={user.name ?? 'User'} data-ai-hint="profile avatar" />
          <AvatarFallback className="text-5xl bg-primary text-primary-foreground">{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">
          {user.name || 'Your Profile'}
        </h1>
        <p className="text-lg text-muted-foreground mt-1">{user.email}</p>
      </section>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <section id="location">
          <LocationForm currentLocation={user.currentLocation} onUpdateLocation={(data) => handleUpdateLocation(data)} />
        </section>

        <section>
          <Card className="w-full shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-secondary">
                <Edit3 className="mr-2 h-6 w-6" /> Account Settings
              </CardTitle>
              <CardDescription>Manage your GlobalFam account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-accent">Current Location</h4>
                {user.currentLocation ? (
                  <p className="text-foreground">{user.currentLocation.city}, {user.currentLocation.country}</p>
                ) : (
                  <p className="text-muted-foreground">No location set. Update it using the form!</p>
                )}
              </div>
              {/* Placeholder for more settings */}
              <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                Change Avatar (Coming Soon)
              </Button>
               <Button variant="destructive" onClick={logout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" /> Log Out
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
