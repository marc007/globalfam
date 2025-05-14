import { db } from "./config";
import { doc, updateDoc } from "firebase/firestore";

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