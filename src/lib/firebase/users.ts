
import { db } from './config';
import { doc, updateDoc, arrayUnion, getDoc, setDoc, Timestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';

// Define UserLocation based on your provided structure
export interface UserLocation {
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

// Define User Profile structure (can be expanded)
export interface UserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null; // This field in Firestore can store a copy of Auth photoURL or be a fallback
  avatarUrl?: string | null; // This field in Firestore stores the custom uploaded or initial default avatar
  createdAt?: Timestamp;
  friends?: string[]; // Array of friend UIDs
  currentLocation?: UserLocation | null; // Added currentLocation
  isOnline?: boolean; // Added isOnline
  // Add other fields like status, etc. as needed
}

// Function to create or update a user profile (e.g., on signup/login)
export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        ...data,
        uid,
        createdAt: Timestamp.now(),
        friends: [], // Initialize friends array if new user
        currentLocation: data.currentLocation !== undefined ? data.currentLocation : null, // Initialize currentLocation
      }, { merge: true });
      console.log(`User profile created for ${uid}`);
    } else {
      const updateData = { ...data };
      if (data.currentLocation === null) {
        updateData.currentLocation = null;
      }
      await setDoc(userRef, updateData, { merge: true });
      console.log(`User profile updated for ${uid}`);
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile.');
  }
};

// Specific function to update only the custom avatarUrl in Firestore
export const updateUserAvatarUrlInFirestore = async (uid: string, avatarUrl: string | null): Promise<void> => {
  try {
    await updateUserProfile(uid, { avatarUrl }); // Updates 'avatarUrl' field in Firestore
    console.log(`User avatarUrl updated in Firestore for ${uid}`);
  } catch (error) {
    console.error('Error updating user avatarUrl in Firestore:', error);
    throw new Error('Failed to update user avatarUrl in Firestore.');
  }
};

// Function to get a user profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', uid);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    } else {
      console.log('No such user profile for UID:', uid);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Function to listen to real-time updates on a user profile
export const listenToUserProfile = (
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe => {
  const userRef = doc(db, 'users', uid);
  const unsubscribe = onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as UserProfile);
    } else {
      console.log('No such user profile for UID during listener setup:', uid);
      callback(null);
    }
  }, (error) => {
    console.error("Error listening to user profile:", error);
  });

  return unsubscribe; // Return the unsubscribe function
};


// Client-side addFriendConnection (Cloud Function is primary for DB updates)
export const addFriendConnection = async (userId1: string, userId2: string): Promise<void> => {
  if (userId1 === userId2) {
    console.warn("User cannot add themselves as a friend.");
    return;
  }
  try {
    const user1Profile = await getUserProfile(userId1);
    const user2Profile = await getUserProfile(userId2);
    if (!user1Profile) {
      await updateUserProfile(userId1, { uid: userId1, friends: [], currentLocation: null });
    } else if (!user1Profile.friends) {
        await updateDoc(doc(db, 'users', userId1), { friends: [] });
    }
    if (!user2Profile) {
      await updateUserProfile(userId2, { uid: userId2, friends: [], currentLocation: null });
    } else if (!user2Profile.friends) {
         await updateDoc(doc(db, 'users', userId2), { friends: [] });
    }
    console.log(`Client-side: addFriendConnection called for ${userId1} and ${userId2}. Cloud Function handles main DB updates.`);
  } catch (error) {
    console.error("Error in client-side addFriendConnection:", error);
    throw new Error("Client-side friend setup encountered an issue.");
  }
};
