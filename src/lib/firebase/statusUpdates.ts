import { db } from "./config";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import type { StatusUpdate } from "@/types";

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

export const listenToLatestUserStatus = (
  userId: string,
  onUpdate: (status: StatusUpdate | null) => void
): (() => void) => {
  const statusesRef = collection(db, "statusUpdates");
  const q = query(
    statusesRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      onUpdate(null);
      return;
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    let createdAtDate = new Date(); // Default to now if undefined for some reason
    if (data.createdAt instanceof Timestamp) {
      createdAtDate = data.createdAt.toDate();
    } else if (data.createdAt) { // Handle cases where it might already be a JS Date (less likely with serverTimestamp but good for robustness)
       try {
        // Attempt to convert if it's a recognizable date string or number, though Timestamp is expected
        const parsedDate = new Date(data.createdAt);
        if (!isNaN(parsedDate.getTime())) {
          createdAtDate = parsedDate;
        }
      } catch (e) {
        console.warn("Could not parse createdAt from data: ", data.createdAt);
      }
    }

    const status: StatusUpdate = {
      id: doc.id,
      userId: data.userId,
      content: data.content,
      createdAt: createdAtDate,
    };
    onUpdate(status);
  }, (error) => {
    console.error(`Error listening to latest status for user ${userId}:`, error);
    onUpdate(null);
  });

  return unsubscribe;
};
