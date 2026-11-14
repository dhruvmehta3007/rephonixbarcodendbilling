import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyCLVAAJItBCzFuvsQM9yNtuefJaz-iyJlw",
  authDomain: "thecellpointbarcode.firebaseapp.com",
  projectId: "thecellpointbarcode",
  storageBucket: "thecellpointbarcode.firebasestorage.app",
  messagingSenderId: "475394509322",
  appId: "1:475394509322:web:607c0b7be4ca8aec3e6df3",
  measurementId: "G-K2CVXEKLBD"
};

// Initialize Firebase
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
