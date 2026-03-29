import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyAkyER4ce_Tby4Ya4m5e7C60Jhycs2kEbI",
    authDomain: "pkdw-3f3b3.firebaseapp.com",
    projectId: "pkdw-3f3b3",
    storageBucket: "pkdw-3f3b3.firebasestorage.app",
    messagingSenderId: "157710255421",
    appId: "1:157710255421:web:b1ba28a4c9a639a6993154"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
