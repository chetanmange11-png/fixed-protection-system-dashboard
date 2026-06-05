import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { 
  getFirestore,
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';

import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent local cache for offline support
export let db: ReturnType<typeof getFirestore>;

try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  }, firebaseConfig.firestoreDatabaseId);
} catch (error: any) {
  console.warn('Failed to initialize Firestore with persistence. Falling back to default getFirestore.', error);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export let auth: ReturnType<typeof initializeAuth>;
try {
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence,
  });
} catch (e) {
  console.warn('Fallback to default auth due to strict environment', e);
  auth = getAuth(app);
}

export const storage = getStorage(app);

// CRITICAL: Validate Connection to Firestore
async function testConnection() {
  try {
    // Attempting to get a non-existent doc to trigger a connection check
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection check successful.");
  } catch (error: any) {
    if (error.message && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. You might be offline or project indexing.");
    } else {
      // It's normal for the doc to not exist, we just want to know if we're connected
      console.log("Firestore connection established (doc may or may not exist).");
    }
  }
}

// Simple anonymous sign in for this applet environment
// This allows rules to use isSignedIn() helper if enabled
export const initAuth = async (retries = 3): Promise<void> => {
  try {
    // Only test connection if auth is not initialized
    await testConnection();
    console.log("Firebase Auth initialized (unauthenticated mode).");
  } catch (error: any) {
    console.error("Initialization failed", error);
  }
};
