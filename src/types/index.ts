export interface User {
  uid: string; // Changed from id to uid to match Firebase
  name: string | null; // Corresponds to displayName in Firebase
  email: string | null;
  avatarUrl?: string; // Corresponds to photoURL in Firebase, or custom
  currentLocation?: UserLocation; // Will be stored in Firestore
}

export interface UserLocation {
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface Friend {
  id: string; // This would be the friend's UID
  name: string;
  avatarUrl?: string;
  location: UserLocation;
  latestStatus?: StatusUpdate;
}

export interface StatusUpdate {
  id: string; // Firestore document ID
  userId: string; // User's UID
  content: string;
  createdAt: Date; // Or Firebase Timestamp
}

export interface Invite {
  id: string; // Firestore document ID
  code: string;
  createdAt: Date; // Or Firebase Timestamp
  expiresAt: Date; // Or Firebase Timestamp
  createdBy: string; // User's UID
  usedBy?: string; // User's UID
}
