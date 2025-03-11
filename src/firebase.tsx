import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCpf3KH3Me8Cw3RgJnwJeuihCJXVaTKIm0',
  authDomain: 'dilg-login.firebaseapp.com',
  projectId: 'dilg-login',
  storageBucket: 'dilg-login.appspot.com',
  messagingSenderId: '583764698048',
  appId: '1:583764698048:web:12aba77ab3e8cb06121e25',
  measurementId: 'G-N0WLEQ3VV3',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


export { auth, db, storage};
