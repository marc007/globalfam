
import { db } from './config';
import { doc, updateDoc, arrayUnion, getDoc, setDoc, Timestamp, onSnapshot, Unsubscribe } from 'firebase/firestore'; // Added onSnapshot and Unsubscribe

// Define User Profile structure (can be expanded)
export interface UserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  createdAt?: Timestamp;
  friends?: string[]; // Array of friend UIDs
  // Add other fields like lastKnownLocation, status, etc. as needed
}

// Function to create or update a user profile (e.g., on signup/login)
export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  try {
    // Use setDoc with merge: true to create or update, and initialize createdAt only if new
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, { 
        ...data, 
        uid, 
        createdAt: Timestamp.now(),
        friends: [] // Initialize friends array if new user
      }, { merge: true });
      console.log(`User profile created for ${uid}`);
    } else {
      await setDoc(userRef, data, { merge: true });
      console.log(`User profile updated for ${uid}`);
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile.');
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
    // Optionally, you could call the callback with an error indicator or a specific null value
    // callback(null); // Or some error state object
  });

  return unsubscribe; // Return the unsubscribe function
};


// Function to establish a mutual friend connection
// This client-side function is less critical now as the Cloud Function handles the core logic.
// It can be kept for other purposes or simplified if only used by client after Cloud Function.
export const addFriendConnection = async (userId1: string, userId2: string): Promise<void> => {
  if (userId1 === userId2) {
    console.warn("User cannot add themselves as a friend.");
    return; 
  }

  try {
    const user1Profile = await getUserProfile(userId1);
    const user2Profile = await getUserProfile(userId2);

    if (!user1Profile) {
      await updateUserProfile(userId1, { uid: userId1, friends: [] });
       console.log(`Initialized profile for user ${userId1} during friend connection attempt.`);
    } else if (!user1Profile.friends) {
        await updateDoc(doc(db, 'users', userId1), { friends: [] });
    }

    if (!user2Profile) {
      await updateUserProfile(userId2, { uid: userId2, friends: [] });
      console.log(`Initialized profile for user ${userId2} during friend connection attempt.`);
    } else if (!user2Profile.friends) {
         await updateDoc(doc(db, 'users', userId2), { friends: [] });
    }
    
    console.log(`Client-side: addFriendConnection called for ${userId1} and ${userId2}. Cloud Function will handle DB updates.`);

  } catch (error) {
    console.error("Error in client-side addFriendConnection (post-Cloud Function setup):", error);
    throw new Error("Client-side friend setup encountered an issue.");
  }
};

// You can add other user-related functions here, like:
// - removeFriendConnection
// - getUserFriends (to fetch profiles of friends)
// - updateUserLocation
// - updateUserStatus
