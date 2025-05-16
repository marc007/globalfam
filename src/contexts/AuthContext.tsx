
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
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'; // Added updateDoc
import { useRouter } from 'next/navigation'; 
import { updateUserProfile as updateUserProfileInFirestore } from '@/lib/firebase/users'; // For clarity

interface AuthContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  isLoading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<FirebaseUser | null>;
  signIn: (email: string, password: string) => Promise<FirebaseUser | null>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserDisplayName: (newName: string) => Promise<void>; // New method
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
          const firestoreUser = userDocSnap.data() as UserProfileData;
          // Prioritize Firestore avatarUrl (updated by app), then Firebase Auth photoURL
          const finalAvatarUrl = firestoreUser.avatarUrl || firebaseUser.photoURL;
          const finalDisplayName = firestoreUser.name || firebaseUser.displayName; // Prioritize Firestore name

          setUser({
            uid: firebaseUser.uid,
            name: finalDisplayName, // Use determined finalDisplayName
            email: firebaseUser.email,
            avatarUrl: finalAvatarUrl, 
            currentLocation: firestoreUser.currentLocation,
            displayName: finalDisplayName, // Reflect in displayName too for consistency
            photoURL: firebaseUser.photoURL, 
          });
        } else {
           const defaultAvatar = `https://placehold.co/100x100.png?text=${(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'NU').substring(0,2).toUpperCase()}`;
           const newUserName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User';
           const newUserProfileData = { 
            uid: firebaseUser.uid,
            name: newUserName,
            email: firebaseUser.email,
            avatarUrl: firebaseUser.photoURL || defaultAvatar,
            photoURL: firebaseUser.photoURL, 
            currentLocation: null,
            displayName: newUserName,
            friends: [],
            createdAt: new Date(),
          };
          await setDoc(doc(db, "users", firebaseUser.uid), newUserProfileData);
          setUser(newUserProfileData as User); 
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
      const defaultAvatar = `https://placehold.co/100x100.png?text=${name.substring(0,2).toUpperCase()}`;
      await updateProfile(userCredential.user, { displayName: name, photoURL: defaultAvatar });
      
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const newUserProfileData = {
        uid: userCredential.user.uid,
        name: name,
        email: email,
        avatarUrl: defaultAvatar, 
        photoURL: defaultAvatar, 
        createdAt: new Date(),
        friends: [],
        currentLocation: null,
        displayName: name, 
      };
      await setDoc(userDocRef, newUserProfileData);
      
      setUser(newUserProfileData as User); // Reflects User type with name and displayName
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
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { displayName: newName });

      // Update Firestore document
      // The `updateUserProfileInFirestore` function in `users.ts` handles merging.
      // We pass `name` for our primary app display and `displayName` for consistency.
      await updateUserProfileInFirestore(auth.currentUser.uid, { name: newName, displayName: newName });

      // Update local AuthContext state
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

    