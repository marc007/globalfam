export interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string;
  currentLocation?: UserLocation;
}

export interface UserLocation {
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface Friend {
  id: string;
  name: string;
  avatarUrl?: string;
  location: UserLocation;
  latestStatus?: StatusUpdate;
}

export interface StatusUpdate {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface Invite {
  id: string;
  code: string;
  createdAt: Date;
  expiresAt: Date;
  createdBy: string; // User ID
  usedBy?: string; // User ID
}
