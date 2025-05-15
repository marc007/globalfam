import { db } from "./config";
import { doc, updateDoc, onSnapshot, Timestamp } from "firebase/firestore";
import type { User } from "@/types";

export const updateUserAvatarUrl = async (userId: string, avatarUrl: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      avatarUrl: avatarUrl,
    });
    console.log(`User ${userId} avatar URL updated successfully.`);
  } catch (e) {
    console.error("Error updating user avatar URL: ", e);
    throw e;
  }
};

export const updateUserLocation = async (userId: string, location: { city: string; country: string; latitude?: number; longitude?: number }): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      currentLocation: location,
    });
    console.log(`User ${userId} location updated successfully.`);
  } catch (e) {
    console.error("Error updating user location: ", e);
    throw e;
  }
};


export const listenToUserProfile = (
  userId: string,
  onUpdate: (user: User | null) => void
): (() => void) => {
  const userDocRef = doc(db, "users", userId);

  const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const userProfile: User = {
        uid: docSnap.id,
        name: data.name || null,
        email: data.email || null,
        avatarUrl: data.avatarUrl,
        currentLocation: data.currentLocation,
        // If your User type had other date fields that are Timestamps, convert them here:
        // exampleDate: (data.exampleDate as Timestamp)?.toDate(),
      };
      onUpdate(userProfile);
    } else {
      console.warn(`User document ${userId} does not exist.`);
      onUpdate(null);
    }
  }, (error) => {
    console.error(`Error listening to user profile ${userId}:`, error);
    onUpdate(null);
  });

  return unsubscribe;
};
