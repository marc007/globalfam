
import { db } from "./config";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import type { StatusUpdate, UserLocation } from "@/types";

interface AddStatusUpdateData {
  userId: string;
  content: string;
  location?: UserLocation | null; // Add location to the data
}

export const addStatusUpdate = async ({ userId, content, location }: AddStatusUpdateData) => {
  try {
    const statusData: {
      userId: string;
      content: string;
      createdAt: any; // serverTimestamp() type
      location?: UserLocation | null;
    } = {
      userId,
      content,
      createdAt: serverTimestamp(),
    };

    if (location) {
      statusData.location = location;
    }

    const docRef = await addDoc(collection(db, "statusUpdates"), statusData);
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
    
    let createdAtDate = new Date(); 
    if (data.createdAt instanceof Timestamp) {
      createdAtDate = data.createdAt.toDate();
    } else if (data.createdAt) { 
       try {
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
      location: data.location || null, // Include location from Firestore
    };
    onUpdate(status);
  }, (error) => {
    console.error(`Error listening to latest status for user ${userId}:`, error);
    onUpdate(null);
  });

  return unsubscribe;
};
