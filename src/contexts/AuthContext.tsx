
"use client";

import type { User, UserProfileData } from '@/types';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { updateUserProfile as updateUserProfileInFirestore, getUserProfile } from '@/lib/firebase/users';

interface AuthContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  isLoading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<FirebaseUser | null>;
  signIn: (email: string, password: string) => Promise<FirebaseUser | null>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserDisplayName: (newName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Set online status
        try {
          await updateDoc(userDocRef, {
            isOnline: true,
            lastSeen: serverTimestamp(),
          });
        } catch (error) {
          // This might fail if the document doesn't exist yet, will be created below
          console.warn("Could not set online status, user doc might not exist yet:", error);
        }
        
        const userDocSnap = await getDoc(userDocRef);
        
        const fallbackName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'GV';
        const initials = fallbackName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
        const defaultFallbackAvatar = `https://placehold.co/100x100.png?text=${initials || 'GV'}`;

        let appUser: User;

        if (userDocSnap.exists()) {
          const firestoreUser = userDocSnap.data() as UserProfileData;
          
          let finalAvatarUrl;
          if (firebaseUser.photoURL && firebaseUser.photoURL.trim() !== "") {
            finalAvatarUrl = firebaseUser.photoURL;
          } else if (firestoreUser.avatarUrl && firestoreUser.avatarUrl.trim() !== "") {
            finalAvatarUrl = firestoreUser.avatarUrl;
          } else if (firestoreUser.photoURL && firestoreUser.photoURL.trim() !== "") {
            finalAvatarUrl = firestoreUser.photoURL;
          } else {
            finalAvatarUrl = defaultFallbackAvatar;
          }
          
          const finalDisplayName = firestoreUser.name || firebaseUser.displayName || fallbackName;
          const lastSeenDate = firestoreUser.lastSeen instanceof Timestamp ? firestoreUser.lastSeen.toDate() : undefined;

          appUser = {
            uid: firebaseUser.uid,
            name: finalDisplayName,
            email: firebaseUser.email,
            avatarUrl: finalAvatarUrl, 
            currentLocation: firestoreUser.currentLocation,
            displayName: finalDisplayName, 
            photoURL: firebaseUser.photoURL,
            isOnline: true, // User is active
            lastSeen: lastSeenDate,
          };
           // Ensure Firestore has the latest from Auth if changed (e.g. Google photo update)
          const updatesForFirestore: Partial<UserProfileData> = { isOnline: true, lastSeen: serverTimestamp() };
          if (firebaseUser.displayName && firebaseUser.displayName !== firestoreUser.displayName) {
            updatesForFirestore.displayName = firebaseUser.displayName;
            updatesForFirestore.name = firebaseUser.displayName; // Keep name and displayName in sync for simplicity
          }
          if (firebaseUser.photoURL && firebaseUser.photoURL !== firestoreUser.photoURL) {
            updatesForFirestore.photoURL = firebaseUser.photoURL;
            if(!firestoreUser.avatarUrl){ // Don't overwrite custom avatar with auth photo unless custom is missing
                 updatesForFirestore.avatarUrl = firebaseUser.photoURL;
            }
          }
          if(Object.keys(updatesForFirestore).length > 2) { // more than just isOnline and lastSeen
            await updateDoc(userDocRef, updatesForFirestore);
          }

        } else {
           const newUserName = firebaseUser.displayName || fallbackName;
           const initialAvatarForDisplay = (firebaseUser.photoURL && firebaseUser.photoURL.trim() !== "") ? firebaseUser.photoURL : defaultFallbackAvatar;

           const newUserProfileData: UserProfileData = {
            uid: firebaseUser.uid,
            name: newUserName,
            email: firebaseUser.email,
            avatarUrl: initialAvatarForDisplay, 
            photoURL: firebaseUser.photoURL,      
            currentLocation: null,
            displayName: newUserName,
            friends: [],
            createdAt: serverTimestamp(),
            isOnline: true,
            lastSeen: serverTimestamp(),
          };
          await setDoc(userDocRef, newUserProfileData);

          appUser = {
            uid: firebaseUser.uid,
            name: newUserName,
            email: firebaseUser.email,
            avatarUrl: initialAvatarForDisplay, 
            currentLocation: null,
            displayName: newUserName,
            photoURL: firebaseUser.photoURL,
            isOnline: true,
            lastSeen: new Date(), // approx current time
          };
        }
        setUser(appUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (name: string, email: string, password: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const initials = name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
      const defaultAvatar = `https://placehold.co/100x100.png?text=${initials || 'GV'}`; 
      
      await updateProfile(userCredential.user, { displayName: name, photoURL: defaultAvatar });
      
      const updatedFirebaseUser = auth.currentUser!; // Firebase Auth user object

      const userDocRef = doc(db, "users", userCredential.user.uid);
      const newUserProfileData: UserProfileData = {
        uid: userCredential.user.uid,
        name: name,
        email: email,
        avatarUrl: updatedFirebaseUser.photoURL, 
        photoURL: updatedFirebaseUser.photoURL,  
        createdAt: serverTimestamp(),
        friends: [],
        currentLocation: null,
        displayName: name,
        isOnline: true,
        lastSeen: serverTimestamp(),
      };
      await setDoc(userDocRef, newUserProfileData);

      setUser({ 
        uid: userCredential.user.uid,
        name: name,
        email: email,
        avatarUrl: updatedFirebaseUser.photoURL, 
        currentLocation: null,
        displayName: name,
        photoURL: updatedFirebaseUser.photoURL, 
        isOnline: true,
        lastSeen: new Date(),
      });
      setIsLoading(false);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing up:", error);
      setIsLoading(false);
      throw error;
    }
  };

  const signIn = async (email: string, password: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user state and online status
      setIsLoading(false);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing in:", error);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (user && user.uid) {
      const userDocRef = doc(db, "users", user.uid);
      try {
        await updateDoc(userDocRef, {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error setting user offline in Firestore:", error);
      }
    }
    try {
      await firebaseSignOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!auth.currentUser) {
      throw new Error("No user is currently signed in.");
    }
    if (!auth.currentUser.email) {
        throw new Error("User email is not available for re-authentication.");
    }

    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);

    try {
      await reauthenticateWithCredential(auth.currentUser, credential);
      await firebaseUpdatePassword(auth.currentUser, newPassword);
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  };

  const updateUserDisplayName = async (newName: string): Promise<void> => {
    if (!auth.currentUser) {
      throw new Error("No user is currently signed in.");
    }
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      await updateUserProfileInFirestore(auth.currentUser.uid, { name: newName, displayName: newName });

      setUser(prevUser => {
        if (!prevUser) return null;
        return { ...prevUser, name: newName, displayName: newName };
      });
    } catch (error) {
      console.error("Error updating display name:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, signUp, signIn, logout, changePassword, updateUserDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
