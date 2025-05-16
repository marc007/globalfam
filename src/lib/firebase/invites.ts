// src/lib/firebase/invites.ts
import { db } from './config';
import { collection, addDoc, getDocs, query, where, updateDoc, Timestamp, doc } from 'firebase/firestore';

// Define the structure for an invite document
export interface InviteDocument {
  id?: string; // Firestore document ID, will be added when fetching
  code: string;
  creatorUid: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  status: 'pending' | 'used' | 'expired';
  usedByUid?: string; // Optional: UID of the user who used the invite
}

// Function to generate a simple random invite code
const generateInviteCode = (length = 8): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

// Function to create a new invite document in Firestore
export const createInviteLinkDocument = async (creatorUid: string): Promise<string> => {
  const code = generateInviteCode();
  const now = Timestamp.now();
  // Set expiry for 7 days from now
  const expiresAt = Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);

  const inviteData: InviteDocument = {
    code: code,
    creatorUid: creatorUid,
    createdAt: now,
    expiresAt: expiresAt,
    status: 'pending',
  };

  try {
    await addDoc(collection(db, 'invites'), inviteData);
    console.log('Invite document created for code:', code);
    return code; // Return the generated code
  } catch (e) {
    console.error('Error adding invite document: ', e);
    throw new Error('Failed to create invite link.');
  }
};

// Function to get an invite document by its code
export const getInviteLinkDocumentByCode = async (code: string): Promise<InviteDocument | null> => {
  try {
    const q = query(collection(db, 'invites'), where('code', '==', code));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No invite document found for code:', code);
      return null;
    }

    if (querySnapshot.docs.length > 1) {
      // This case should ideally not happen if codes are unique and indexed.
      console.warn('Multiple invite documents found for the same code:', code, '. Returning the first one.');
    }
    
    const docSnapshot = querySnapshot.docs[0];
    return { id: docSnapshot.id, ...docSnapshot.data() } as InviteDocument;

  } catch (e) {
    console.error('Error fetching invite document by code:', e);
    // It's better to throw or return a specific error object/type if needed for UI.
    return null; // Or throw new Error('Failed to retrieve invite details.');
  }
};

// Function to update the status of an invite document
export const updateInviteDocumentStatus = async (docId: string, status: 'used' | 'expired', usedByUid?: string): Promise<void> => {
  try {
    const inviteDocRef = doc(db, 'invites', docId);
    const updateData: { status: 'used' | 'expired', usedByUid?: string } = { status };
    if (usedByUid && status === 'used') {
      updateData.usedByUid = usedByUid;
    }
    await updateDoc(inviteDocRef, updateData);
    console.log(`Invite document ${docId} status updated to ${status}`);
  } catch (e) {
    console.error('Error updating invite document status:', e);
    throw new Error('Failed to update invite status.');
  }
};
