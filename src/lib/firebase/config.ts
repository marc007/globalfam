
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// import { getStorage } from 'firebase/storage'; // If you plan to use Firebase Storage

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const firebaseMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

if (!firebaseApiKey) {
  throw new Error(
    'Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or empty. Please check your environment variables. This key is required to initialize Firebase.'
  );
}
if (!firebaseAuthDomain) {
    throw new Error(
      'Firebase Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing or empty. Please check your environment variables. This is required for authentication.'
    );
}
if (!firebaseProjectId) {
    throw new Error(
      'Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing or empty. Please check your environment variables. This ID is required.'
    );
}
// While the other keys might also be important depending on usage,
// apiKey, authDomain, and projectId are fundamental for basic initialization and auth.

const firebaseConfig: FirebaseOptions = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
  measurementId: firebaseMeasurementId, // Optional
};

// Initialize Firebase
// Ensure that an app is not initialized more than once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
// const storage = getStorage(app); // If you plan to use Firebase Storage

export { app, auth, db /*, storage */ };
