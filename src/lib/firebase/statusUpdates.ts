import { db } from "./config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface AddStatusUpdateData {
  userId: string;
  content: string;
}

export const addStatusUpdate = async ({ userId, content }: AddStatusUpdateData) => {
  try {
    const docRef = await addDoc(collection(db, "statusUpdates"), {
      userId,
      content,
      createdAt: serverTimestamp(),
    });
    console.log("Status update written with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding status update: ", e);
    throw e;
  }
};