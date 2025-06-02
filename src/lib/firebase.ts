
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

let criticalConfigError = false;

if (!firebaseConfig.apiKey) {
  console.error(
    "CRITICAL FIREBASE CONFIG ERROR: Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing. Please set it in your .env file and restart the server."
  );
  criticalConfigError = true;
}

if (!firebaseConfig.projectId) {
  console.error(
    "CRITICAL FIREBASE CONFIG ERROR: Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing. This is required. Please set it in your .env file and restart the server."
  );
  criticalConfigError = true;
}

if (firebaseConfig.databaseURL) {
  // If databaseURL is provided, validate its format
  if (!firebaseConfig.databaseURL.startsWith('https://') || !firebaseConfig.databaseURL.endsWith('.firebaseio.com')) {
    console.error(
      `CRITICAL FIREBASE CONFIG ERROR: The provided Firebase Database URL (NEXT_PUBLIC_FIREBASE_DATABASE_URL: "${firebaseConfig.databaseURL}") is malformed. It must start with "https://"" and end with ".firebaseio.com". Please correct it in your .env file and restart the server.`
    );
    criticalConfigError = true;
  }
} else if (firebaseConfig.projectId) {
  // If databaseURL is NOT provided, try to construct it from projectId
  firebaseConfig.databaseURL = `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
  console.warn(
    `Firebase Database URL (NEXT_PUBLIC_FIREBASE_DATABASE_URL) was not explicitly set. Defaulting to: "${firebaseConfig.databaseURL}" based on your project ID. For best results, explicitly set NEXT_PUBLIC_FIREBASE_DATABASE_URL in your .env file.`
  );
} else {
  // If databaseURL is NOT provided AND projectId is also missing
  console.error(
    "CRITICAL FIREBASE CONFIG ERROR: Firebase Database URL (NEXT_PUBLIC_FIREBASE_DATABASE_URL) is missing, and Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is also missing, so a default URL cannot be constructed. Please set at least NEXT_PUBLIC_FIREBASE_PROJECT_ID (and preferably NEXT_PUBLIC_FIREBASE_DATABASE_URL) in your .env file and restart the server."
  );
  criticalConfigError = true;
}


let app: FirebaseApp;
let auth: Auth;
let db: Database;

// Initialize Firebase App
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth and Database
// These will likely throw errors if criticalConfigError is true and config is bad,
// which is desired behavior as the app cannot function.
auth = getAuth(app);
db = getDatabase(app);


export { app, auth, db };
