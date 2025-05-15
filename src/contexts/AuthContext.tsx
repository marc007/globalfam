
"use client";

import type { User, UserProfileData } from '@/types'; // Added UserProfileData import
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
import { useRouter } from 'next/navigation'; 

interface AuthContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  isLoading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<FirebaseUser | null>;
  signIn: (email: string, password: string) => Promise<FirebaseUser | null>;
  logout: () => Promise<void>;
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
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const firestoreUser = userDocSnap.data() as UserProfileData; // Explicitly cast for clarity
          setUser({
            uid: firebaseUser.uid,
            name: firestoreUser.name || firebaseUser.displayName, // Prioritize Firestore name
            email: firebaseUser.email,
            avatarUrl: firestoreUser.avatarUrl || firebaseUser.photoURL, // Prioritize Firestore avatarUrl
            currentLocation: firestoreUser.currentLocation, 
          });
        } else {
           const newUserProfile: User = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
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
      // Use a placeholder or a default avatar URL logic for new sign-ups
      const defaultAvatar = `https://placehold.co/100x100.png?text=${name.substring(0,2).toUpperCase()}`;
      await updateProfile(userCredential.user, { displayName: name, photoURL: defaultAvatar });
      
      const userDocRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userDocRef, {
        uid: userCredential.user.uid,
        name: name,
        email: email,
        avatarUrl: defaultAvatar, // Store this default avatar in Firestore as well
        createdAt: new Date(),
      });
      
       setUser({ // Update local context state immediately
        uid: userCredential.user.uid,
        name: name,
        email: email,
        avatarUrl: defaultAvatar,
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
    try {
      await firebaseSignOut(auth);
      router.push('/'); 
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
