
"use client";

import { useEffect, useState, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LocationForm } from '@/components/forms/LocationForm';
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm'; // Import new form
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserCircle, MapPin, Edit3, LogOut, Camera, AlertTriangle, KeyRound } from 'lucide-react';
import type { UserLocation } from '@/types';
import { Button } from '@/components/ui/button';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { uploadAvatar } from '@/lib/firebase/storage';
import { updateUserPhotoURL as updateUserFirestorePhotoURL } from '@/lib/firebase/users'; 
import { APIProvider } from '@vis.gl/react-google-maps';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { updateProfile, getAuth } from 'firebase/auth'; // Import updateProfile and getAuth from firebase/auth


async function updateUserLocationClient(userId: string, location: UserLocation): Promise<void> {
  console.log(`Firebase: Updating location for user ${userId} to`, location);
  const db = getFirestore();
  const userDocRef = doc(db, "users", userId);
  await updateDoc(userDocRef, {
    currentLocation: location,
  });
}


export default function ProfilePage() {
  const { user, isLoading, logout, setUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;


  useEffect(() => {
    setIsClient(true);
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  const handleUpdateLocation = async (data: UserLocation) => {
    if (!user || !user.uid) return;
    setIsUpdatingLocation(true);
    try {
      await updateUserLocationClient(user.uid, data);
      // Update user context with new location
      setUser(prevUser => {
        if (!prevUser) return null;
        return { ...prevUser, currentLocation: data };
      });
      toast({
        title: "Location Updated!",
        description: `Your location is now set to ${data.city}, ${data.country}.`,
      });
    } catch (error) {
      console.error("Failed to update location:", error);
      toast({
        title: "Update Failed",
        description: "Could not update your location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user || !user.uid) return;
    const firebaseAuth = getAuth();
    const firebaseCurrentUser = firebaseAuth.currentUser;

    if (!firebaseCurrentUser) {
      toast({
        title: "Error",
        description: "No authenticated user found. Please re-login.",
        variant: "destructive",
      });
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const downloadURL = await uploadAvatar(user.uid, file);
      
      // Update Firebase Auth profile
      await updateProfile(firebaseCurrentUser, { photoURL: downloadURL });

      // Update Firestore document
      await updateUserFirestorePhotoURL(user.uid, downloadURL); 
      
      // Update local AuthContext state
      setUser(prevUser => {
        if (!prevUser) return null;
        return { ...prevUser, avatarUrl: downloadURL, photoURL: downloadURL };
      });

      toast({
        title: "Avatar Updated!",
        description: "Your profile picture has been updated.",
      });
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      toast({
        title: "Upload Failed",
        description: "Could not update your avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
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
    return null; 
  }
  
  const displayName = user.name || user.displayName || user.email; 
  const photoURL = user.avatarUrl || user.photoURL; 

  const renderLocationForm = () => {
    if (!mapsApiKey) {
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Location Services Unavailable</AlertTitle>
          <AlertDescription>
            The Google Maps API key is not configured. Location features, including autocomplete, are disabled.
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <APIProvider apiKey={mapsApiKey} libraries={['places']}>
        <LocationForm
          currentLocation={user.currentLocation}
          onUpdateLocation={handleUpdateLocation}
          isPending={isUpdatingLocation}
        />
      </APIProvider>
    );
  };

  return (
    <div className="space-y-12">
      <section className="flex flex-col items-center text-center">
        <label htmlFor="avatar-upload" className="cursor-pointer relative group mb-6">
          <Avatar key={photoURL || user.uid} className="h-32 w-32 border-4 border-primary shadow-lg relative">
             {isUploadingAvatar ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10 rounded-full">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
             ) : null}
            <AvatarImage
              src={photoURL} 
              alt={displayName ?? 'User'}
              className={isUploadingAvatar ? 'opacity-50' : ''}
              data-ai-hint="profile avatar"
            />
            <AvatarFallback className="text-5xl bg-primary text-primary-foreground">{getInitials(displayName)}</AvatarFallback>
          </Avatar>
           <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Camera className="h-8 w-8" />
           </div>
        </label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
          disabled={isUploadingAvatar}
        />

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">
          {displayName || 'Your Profile'}
        </h1>
        <p className="text-lg text-muted-foreground mt-1">{user.email}</p>
      </section>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <section id="location" className="space-y-8">
          {renderLocationForm()}
          <ChangePasswordForm /> 
        </section>

        <section>
          <Card className="w-full shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-secondary">
                <Edit3 className="mr-2 h-6 w-6" /> Account Details
              </CardTitle>
              <CardDescription>Manage your GlobalFam account information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-accent flex items-center">
                    <UserCircle className="mr-2 h-5 w-5" /> Display Name
                </h4>
                <p className="text-foreground">{displayName || 'Not set'}</p>
              </div>
               <div>
                <h4 className="font-semibold text-accent flex items-center">
                    <MapPin className="mr-2 h-5 w-5" /> Current Location
                </h4>
                {user.currentLocation ? (
                  <p className="text-foreground">{user.currentLocation.city}, {user.currentLocation.country}</p>
                ) : (
                  <p className="text-muted-foreground">No location set. Update it using the form!</p>
                )}
              </div>
               <Button variant="destructive" onClick={logout} className="w-full mt-4">
                <LogOut className="mr-2 h-4 w-4" /> Log Out
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
