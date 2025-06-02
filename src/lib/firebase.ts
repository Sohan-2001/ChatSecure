
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.warn(
    "Firebase API Key is missing. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is set in your .env file at the root of your project, and that you've restarted the Next.js development server."
  );
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);

enableIndexedDbPersistence(db)
  .then(() => {
    console.log("Firestore persistence enabled successfully.");
  })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // This can happen if multiple tabs are open, as persistence can only be enabled in one tab at a time.
      console.warn("Firestore persistence failed (failed-precondition). This can happen if you have multiple tabs open. Try closing other tabs or reloading this one.");
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence.
      console.warn("Firestore persistence failed (unimplemented). The browser may not support the required features.");
    } else {
      console.error("Error enabling Firestore persistence:", err);
    }
  });

export { app, auth, db };
