import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Placeholder configuration - Replace with your actual Firebase project configuration
// You get this from the Firebase Console when you add a web app to your project
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Intentionally keep placeholders
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional: for Google Analytics
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseInitialized = false;

try {
  // Check if the config values are placeholders (simple check)
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_') && firebaseConfig.projectId && !firebaseConfig.projectId.startsWith('YOUR_')) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseInitialized = true;
    console.log("Firebase initialized successfully.");
  } else {
    console.warn("Firebase configuration appears to be placeholder data. Firebase services will be unavailable. Please update src/config/firebaseConfig.ts.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  console.warn("Firebase services will be unavailable due to initialization error.");
  // Ensure app, auth, db remain null if initialization fails
  app = null;
  auth = null;
  db = null;
}

// Export the potentially null objects and the initialization status
export { app, auth, db, firebaseInitialized };
