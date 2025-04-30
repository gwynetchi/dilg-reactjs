import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Main config
const firebaseConfig = {
  apiKey: 'AIzaSyCpf3KH3Me8Cw3RgJnwJeuihCJXVaTKIm0',
  authDomain: 'dilg-login.firebaseapp.com',
  projectId: 'dilg-login',
  storageBucket: 'dilg-login.appspot.com',
  messagingSenderId: '583764698048',
  appId: '1:583764698048:web:12aba77ab3e8cb06121e25',
  measurementId: 'G-N0WLEQ3VV3',
};

// Initialize default app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ Ensure a truly isolated secondary app
let secondaryApp;
try {
  secondaryApp = getApp("Secondary");
} catch (err) {
  secondaryApp = initializeApp(firebaseConfig, "Secondary");
}
const secondaryAuth = getAuth(secondaryApp);

export { auth, db, storage, secondaryAuth };
