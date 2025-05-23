
"use client";

import type { User, UserProfileData } from '@/types';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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

const INACTIVITY_TIMEOUT = 60 * 1000; // 30 seconds

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userRef = useRef(user); // Ref to access current user in timer/event handlers

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const updateUserOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (userRef.current && userRef.current.uid) {
      const userDocRef = doc(db, "users", userRef.current.uid);
      try {
        await updateDoc(userDocRef, {
          isOnline: isOnline,
          lastSeen: serverTimestamp(),
        });
        setUser(currentUser => currentUser ? { ...currentUser, isOnline, lastSeen: new Date() } : null);
      } catch (error: any) { // Added :any type for error to inspect it
        console.warn("Error updating online status. UserID:", userRef.current?.uid, "Attempted to set isOnline:", isOnline);
        console.warn("Error object type:", typeof error);
        console.warn("Error object toString():", String(error));
        if (error && typeof error === 'object') {
          console.warn("Error object keys:", Object.keys(error).join(', ') || 'No enumerable keys');
          console.warn("Error object JSON:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        }
        // If it is a FirebaseError, it should have code and message properties
        if (error?.code && error?.message) {
            console.warn(`Firebase Error Code: ${error.code}, Message: ${error.message}`);
        } else {
            console.warn("The error object does not appear to be a standard FirebaseError.");
        }
      }
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (userRef.current && userRef.current.isOnline === false && document.visibilityState === 'visible') {
        updateUserOnlineStatus(true);
    }
    inactivityTimerRef.current = setTimeout(() => {
      updateUserOnlineStatus(false);
    }, INACTIVITY_TIMEOUT);
  }, [updateUserOnlineStatus]);

  useEffect(() => {
    const handleActivity = () => {
        if (document.visibilityState === 'visible') {
            resetInactivityTimer();
        }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateUserOnlineStatus(true);
        resetInactivityTimer();
      } else {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        updateUserOnlineStatus(false);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('scroll', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resetInactivityTimer, updateUserOnlineStatus]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          await updateDoc(userDocRef, {
            isOnline: true,
            lastSeen: serverTimestamp(),
          });
        } catch (error) {
          console.warn("Could not set online status on auth change, user doc might not exist yet:", error);
        }
        
        const userDocSnap = await getDoc(userDocRef);
        
        const fallbackName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'GV';
        const initials = fallbackName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
        const defaultFallbackAvatar = `https://placehold.co/100x100.png?text=${initials || 'GV'}`;

        let appUser: User;

        if (userDocSnap.exists()) {
          const firestoreUser = userDocSnap.data() as UserProfileData;
          let finalAvatarUrl = firebaseUser.photoURL || firestoreUser.avatarUrl || firestoreUser.photoURL || defaultFallbackAvatar;
          const finalDisplayName = firestoreUser.name || firebaseUser.displayName || fallbackName;
          const lastSeenDate = firestoreUser.lastSeen instanceof Timestamp ? firestoreUser.lastSeen.toDate() : new Date();

          appUser = {
            uid: firebaseUser.uid,
            name: finalDisplayName,
            email: firebaseUser.email,
            avatarUrl: finalAvatarUrl, 
            currentLocation: firestoreUser.currentLocation,
            displayName: finalDisplayName, 
            photoURL: firebaseUser.photoURL,
            isOnline: true, 
            lastSeen: lastSeenDate,
          };

          const updatesForFirestore: Partial<UserProfileData> = { isOnline: true, lastSeen: serverTimestamp() };
          if (firebaseUser.displayName && firebaseUser.displayName !== firestoreUser.displayName) {
            updatesForFirestore.displayName = firebaseUser.displayName;
            updatesForFirestore.name = firebaseUser.displayName;
          }
          if (firebaseUser.photoURL && firebaseUser.photoURL !== firestoreUser.photoURL) {
            updatesForFirestore.photoURL = firebaseUser.photoURL;
            if(!firestoreUser.avatarUrl){ 
                 updatesForFirestore.avatarUrl = firebaseUser.photoURL;
            }
          }
          if(Object.keys(updatesForFirestore).length > 2) { // Check if there are updates beyond isOnline and lastSeen
            await updateDoc(userDocRef, updatesForFirestore).catch(err => console.warn("Error updating user doc on auth change", err));
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
            lastSeen: new Date(), 
          };
        }
        setUser(appUser);
        userRef.current = appUser; 
        resetInactivityTimer();
      } else {
        if (userRef.current) { 
            updateUserOnlineStatus(false);
        }
        setUser(null);
        userRef.current = null;
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
      }
      setIsLoading(false);
    });

    return () => {
        unsubscribe();
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        // Ensure user is marked offline if they close the tab/browser directly
        if (userRef.current) {
            updateUserOnlineStatus(false);
        }
    }
  }, [resetInactivityTimer, updateUserOnlineStatus]);

  const signUp = async (name: string, email: string, password: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const initials = name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
      const defaultAvatar = `https://placehold.co/100x100.png?text=${initials || 'GV'}`; 
      
      await updateProfile(userCredential.user, { displayName: name, photoURL: defaultAvatar });
      
      const updatedFirebaseUser = auth.currentUser!;

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

      const appUser = { 
        uid: userCredential.user.uid,
        name: name,
        email: email,
        avatarUrl: updatedFirebaseUser.photoURL, 
        currentLocation: null,
        displayName: name,
        photoURL: updatedFirebaseUser.photoURL, 
        isOnline: true,
        lastSeen: new Date(),
      };
      setUser(appUser);
      userRef.current = appUser;
      setIsLoading(false);
      resetInactivityTimer();
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
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Use userRef.current.uid for safety, as user state might be nullifying during async operations
    if (userRef.current && userRef.current.uid) { 
      await updateUserOnlineStatus(false);
    } else {
      console.warn("Logout: No user or user UID to mark offline. This might be normal if user was already signed out.");
    }
    try {
      await firebaseSignOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
      setUser(null); 
      userRef.current = null;
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
        const updatedU = { ...prevUser, name: newName, displayName: newName };
        userRef.current = updatedU;
        return updatedU;
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
