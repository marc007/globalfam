
import { db } from "./config";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import type { StatusUpdate, UserLocation } from "@/types";

interface AddStatusUpdateData {
  userId: string;
  text: string; // Changed from content to text to match StatusUpdate type
  location?: UserLocation | null; 
}

export const addStatusUpdate = async ({ userId, text, location }: AddStatusUpdateData) => {
  try {
    const statusData: {
      userId: string;
      text: string;
      timestamp: any; // serverTimestamp() type, changed from createdAt
      location?: UserLocation | null;
    } = {
      userId,
      text, // Changed from content
      timestamp: serverTimestamp(), // Changed from createdAt
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

const processStatusSnapshot = (doc: any): StatusUpdate => {
  const data = doc.data();
  let timestampDate = new Date();
  if (data.timestamp instanceof Timestamp) {
    timestampDate = data.timestamp.toDate();
  } else if (data.timestamp && typeof data.timestamp.seconds === 'number' && typeof data.timestamp.nanoseconds === 'number') {
    // Handle cases where it might come as a plain object (e.g. from REST or certain cache scenarios)
    timestampDate = new Timestamp(data.timestamp.seconds, data.timestamp.nanoseconds).toDate();
  } else if (data.timestamp) {
    try {
      const parsedDate = new Date(data.timestamp);
      if (!isNaN(parsedDate.getTime())) {
        timestampDate = parsedDate;
      }
    } catch (e) {
      console.warn("Could not parse timestamp from data: ", data.timestamp);
    }
  }

  return {
    id: doc.id,
    userId: data.userId,
    text: data.text, // Changed from content
    timestamp: timestampDate, // Changed from createdAt
    location: data.location || null,
  };
};

export const listenToLatestUserStatus = (
  userId: string,
  onUpdate: (status: StatusUpdate | null) => void
): (() => void) => {
  const statusesRef = collection(db, "statusUpdates");
  const q = query(
    statusesRef,
    where("userId", "==", userId),
    orderBy("timestamp", "desc"), // Changed from createdAt
    limit(1)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      onUpdate(null);
      return;
    }
    const doc = snapshot.docs[0];
    const status = processStatusSnapshot(doc);
    onUpdate(status);
  }, (error) => {
    console.error(`Error listening to latest status for user ${userId}:`, error);
    onUpdate(null);
  });

  return unsubscribe;
};

// New function to listen to a limited number of past status updates
export const listenToUserStatusHistory = (
  userId: string,
  limitCount: number,
  onUpdate: (statuses: StatusUpdate[]) => void
): (() => void) => {
  const statusesRef = collection(db, "statusUpdates");
  const q = query(
    statusesRef,
    where("userId", "==", userId),
    orderBy("timestamp", "desc"), // Changed from createdAt
    limit(limitCount)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      onUpdate([]);
      return;
    }
    const statuses = snapshot.docs.map(doc => processStatusSnapshot(doc));
    onUpdate(statuses);
  }, (error) => {
    console.error(`Error listening to status history for user ${userId}:`, error);
    onUpdate([]);
  });

  return unsubscribe;
};
