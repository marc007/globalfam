
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
  EmailAuthProvider, // Import EmailAuthProvider
  reauthenticateWithCredential, // Import reauthenticateWithCredential
  updatePassword as firebaseUpdatePassword, // Import updatePassword
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
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>; // New method
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
          setUser({
            uid: firebaseUser.uid,
            name: firestoreUser.name || firebaseUser.displayName,
            email: firebaseUser.email,
            avatarUrl: firestoreUser.avatarUrl || firebaseUser.photoURL,
            currentLocation: firestoreUser.currentLocation,
            // Add displayName and photoURL from FirebaseUser as fallbacks if needed by other parts of User type
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
        } else {
           const newUserProfileData = { // Use a more descriptive name
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
            email: firebaseUser.email,
            avatarUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(firebaseUser.displayName || 'NU').substring(0,2).toUpperCase()}`,
            // Explicitly include displayName and photoURL if they are part of the User type used in setUser
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };
          await setDoc(doc(db, "users", firebaseUser.uid), {
            uid: newUserProfileData.uid, // ensure uid is written
            name: newUserProfileData.name,
            email: newUserProfileData.email,
            avatarUrl: newUserProfileData.avatarUrl, // Firestore specific avatar
            createdAt: new Date(),
            // ensure UserProfile specific fields like friends, currentLocation are initialized
            friends: [],
            currentLocation: null,
          });
          setUser(newUserProfileData as User); // Cast to User, ensure User type matches
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
        createdAt: new Date(),
        friends: [],
        currentLocation: null,
        // Include FirebaseUser's displayName and photoURL if your User type expects them
        displayName: name,
        photoURL: defaultAvatar,
      };
      await setDoc(userDocRef, newUserProfileData);
      
       setUser(newUserProfileData as User);
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
      throw error; // Re-throw to be caught by the calling form
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, signUp, signIn, logout, changePassword }}>
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
