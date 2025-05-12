"use client";

import type { User } from '@/types';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation'; // Import useRouter

interface AuthContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>; // Kept for direct manipulation if needed, though mostly driven by onAuthStateChanged
  isLoading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<FirebaseUser | null>;
  signIn: (email: string, password: string) => Promise<FirebaseUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter(); // Initialize router

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        // Fetch additional user data from Firestore if necessary
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const firestoreUser = userDocSnap.data();
          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firestoreUser.name,
            email: firebaseUser.email,
            avatarUrl: firebaseUser.photoURL || firestoreUser.avatarUrl,
            currentLocation: firestoreUser.currentLocation, // Assuming this structure in Firestore
          });
        } else {
          // User exists in Auth but not Firestore, create a basic profile
           const newUserProfile: User = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User', // Default name
            email: firebaseUser.email,
            avatarUrl: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
          };
          await setDoc(doc(db, "users", firebaseUser.uid), {
            name: newUserProfile.name,
            email: newUserProfile.email,
            avatarUrl: newUserProfile.avatarUrl,
            createdAt: new Date(),
          });
          setUser(newUserProfile);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signUp = async (name: string, email: string, password: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name, photoURL: `https://picsum.photos/seed/${userCredential.user.uid}/100/100` });
      
      // Create user document in Firestore
      const userDocRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userDocRef, {
        uid: userCredential.user.uid,
        name: name,
        email: email,
        avatarUrl: userCredential.user.photoURL,
        createdAt: new Date(),
        // currentLocation can be added later by the user
      });
      
      // onAuthStateChanged will handle setting the user state
      // Manually set user here to reflect name/avatar changes immediately before onAuthStateChanged fires with potentially old data
       setUser({
        uid: userCredential.user.uid,
        name: name,
        email: email,
        avatarUrl: userCredential.user.photoURL,
      });
      setIsLoading(false);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing up:", error);
      setIsLoading(false);
      throw error; // Re-throw to be caught by the form
    }
  };

  const signIn = async (email: string, password: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the user state
      setIsLoading(false);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing in:", error);
      setIsLoading(false);
      throw error; // Re-throw to be caught by the form
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set user to null
      // No need to manually set user to null here, onAuthStateChanged handles it
      router.push('/'); // Redirect to home page after logout
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, signUp, signIn, logout }}>
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
