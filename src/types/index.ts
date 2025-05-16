
import type { Timestamp } from 'firebase/firestore';

// User type for AuthContext and general app use
export interface User {
  uid: string;
  name: string | null; // Primarily from Firestore profile
  email: string | null; // From Firebase Auth
  avatarUrl?: string | null; // The URL to be used for display (determined by AuthContext logic)
  currentLocation?: UserLocation | null; // From Firestore profile
  displayName?: string | null; // Fallback from Firebase Auth, or same as name
  photoURL?: string | null; // Canonical photoURL from Firebase Auth
}

// Specifically for data structure in 'users' Firestore collection
export interface UserProfileData {
  uid: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string | null;   // URL for custom uploaded avatar or initial default
  photoURL?: string | null;    // Can store a copy of Firebase Auth photoURL
  currentLocation?: UserLocation | null;
  createdAt?: Date | Timestamp; // Firestore Timestamp for creation date, allow Date for easier use
  friends?: string[]; // Array of friend UIDs
  displayName?: string | null;
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
