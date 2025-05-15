
import type { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string;
  currentLocation?: UserLocation;
  // If you add a createdAt field to User for example:
  // createdAt?: Date | Timestamp; 
}

// This can be used when fetching user profile directly from 'users' collection.
export interface UserProfileData {
  uid: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string;
  currentLocation?: UserLocation;
  // createdAt?: Date; // After conversion
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
  location: UserLocation; // This will be User.currentLocation
  latestStatus?: StatusUpdate;
}

export interface StatusUpdate {
  id: string; // Firestore document ID
  userId: string; // User's UID
  content: string;
  createdAt: Date; // Always Date object in application code after conversion from Timestamp
}

export interface Invite {
  id: string; // Firestore document ID
  code: string;
  createdAt: Date | Timestamp; // Allow Timestamp for Firestore, convert to Date in app
  expiresAt: Date | Timestamp; // Allow Timestamp for Firestore, convert to Date in app
  createdBy: string; // User's UID
  status: 'pending' | 'used' | 'expired';
  usedBy?: string; // User's UID who used the invite
  usedAt?: Date | Timestamp; // Allow Timestamp for Firestore, convert to Date in app
}
