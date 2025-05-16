
"use client";

import { useEffect, useState, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LocationForm } from '@/components/forms/LocationForm';
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserCircle, MapPin, Edit3, LogOut, Camera, AlertTriangle, KeyRound, Save, X, Edit } from 'lucide-react';
import type { UserLocation } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { uploadAvatar } from '@/lib/firebase/storage';
import { updateUserPhotoURL as updateUserFirestorePhotoURL } from '@/lib/firebase/users'; 
import { APIProvider } from '@vis.gl/react-google-maps';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { updateProfile, getAuth } from 'firebase/auth'; 


async function updateUserLocationClient(userId: string, location: UserLocation): Promise<void> {
  console.log(`Firebase: Updating location for user ${userId} to`, location);
  const db = getFirestore();
  const userDocRef = doc(db, "users", userId);
  await updateDoc(userDocRef, {
    currentLocation: location,
  });
}


export default function ProfilePage() {
  const { user, isLoading, logout, setUser, updateUserDisplayName } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [isEditingName, setIsEditingName] = useState(false);
  const [editableName, setEditableName] = useState(user?.displayName || user?.name || "");
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!isLoading && !user) {
      router.replace('/');
    }
    if (user) {
      setEditableName(user.displayName || user.name || "");
    }
  }, [user, isLoading, router]);

  const handleUpdateLocation = async (data: UserLocation) => {
    if (!user || !user.uid) return;
    setIsUpdatingLocation(true);
    try {
      await updateUserLocationClient(user.uid, data);
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
      
      await updateProfile(firebaseCurrentUser, { photoURL: downloadURL });
      await updateUserFirestorePhotoURL(user.uid, downloadURL); 
      
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

  const handleSaveName = async () => {
    if (!user || !editableName.trim() || editableName.trim() === (user.displayName || user.name)) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      await updateUserDisplayName(editableName.trim());
      toast({
        title: "Display Name Updated!",
        description: `Your display name is now ${editableName.trim()}.`,
      });
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to update display name:", error);
      toast({
        title: "Update Failed",
        description: "Could not update your display name. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
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
  
  const currentDisplayName = user.name || user.displayName || user.email; 
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
              alt={currentDisplayName ?? 'User'}
              className={isUploadingAvatar ? 'opacity-50' : ''}
              data-ai-hint="profile avatar"
            />
            <AvatarFallback className="text-5xl bg-primary text-primary-foreground">{getInitials(currentDisplayName)}</AvatarFallback>
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

        {!isEditingName ? (
          <div className="flex items-center gap-2 group">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">
              {currentDisplayName || 'Your Profile'}
            </h1>
            <Button variant="ghost" size="icon" onClick={() => { setIsEditingName(true); setEditableName(currentDisplayName || ""); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit className="h-6 w-6 text-accent" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full max-w-md">
            <Input
              type="text"
              value={editableName}
              onChange={(e) => setEditableName(e.target.value)}
              className="text-4xl md:text-5xl font-bold tracking-tight text-center bg-transparent border-2 border-accent rounded-md p-2 text-foreground"
              disabled={isSavingName}
            />
            <div className="flex gap-2 mt-2">
              <Button onClick={handleSaveName} disabled={isSavingName || !editableName.trim() || editableName.trim() === (user.displayName || user.name)} className="bg-green-500 hover:bg-green-600 text-white">
                {isSavingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
              <Button variant="outline" onClick={() => setIsEditingName(false)} disabled={isSavingName}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        )}
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
                <p className="text-foreground">{currentDisplayName || 'Not set'}</p>
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

    