import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// Use the custom firestoreDatabaseId from the config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Simple anonymous sign in for this applet environment
// This allows rules to use isSignedIn() helper
export const initAuth = async () => {
  try {
    // Auth initialization skipped due to admin-restricted-operation
    // The application uses internal custom logic via localStorage.
    console.log("Firebase Auth skipped.");
  } catch (error) {
    console.error("Auth initialization failed:", error);
  }
};
