
import type { Timestamp } from 'firebase/firestore';

// User type for AuthContext and general app use
export interface User {
  uid: string;
  name: string | null; // Primarily from Firestore profile
  email: string | null; // From Firebase Auth
  avatarUrl?: string; // Custom avatar URL from Firestore profile/Storage
  currentLocation?: UserLocation | null; // From Firestore profile
  // Optional fields from FirebaseUser, if needed directly in User type
  displayName?: string | null; // Fallback from Firebase Auth
  photoURL?: string | null; // Fallback from Firebase Auth
}

// Specifically for data structure in 'users' Firestore collection
export interface UserProfileData {
  uid: string;
  name: string | null;
  email: string | null; // Storing email in profile can be useful for some queries
  avatarUrl?: string;   // URL from Firebase Storage, managed by your app
  currentLocation?: UserLocation | null;
  createdAt?: Timestamp; // Firestore Timestamp for creation date
  friends?: string[]; // Array of friend UIDs
  // any other profile-specific fields
}

export interface UserLocation {
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface Friend {
  id: string; // Friend's UID
  name: string;
  avatarUrl?: string;
  location: UserLocation;
  latestStatus?: StatusUpdate;
}

export interface StatusUpdate {
  id: string; // Firestore document ID
  userId: string; // User's UID
  content: string;
  createdAt: Date; // Always Date object in application code after conversion from Timestamp
  location?: UserLocation | null; // Location where the status was posted
}

// Invite as stored in Firestore (uses Timestamp)
export interface InviteDocumentData {
    code: string;
    creatorUid: string;
    createdAt: Timestamp;
    expiresAt: Timestamp;
    status: 'pending' | 'used' | 'expired';
    usedByUid?: string;
    usedAt?: Timestamp;
}

// Invite as used in the application (uses Date)
export interface Invite {
  id: string; // Firestore document ID
  code: string;
  creatorUid: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'used' | 'expired';
  usedByUid?: string;
  usedAt?: Date;
}
