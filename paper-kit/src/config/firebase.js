import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDMpg4289jTFbZD-PjZrRoqzaJXQV0n0ss",
  authDomain: "paperkit-ai2026.firebaseapp.com",
  projectId: "paperkit-ai2026",
  storageBucket: "paperkit-ai2026.firebasestorage.app",
  messagingSenderId: "370937266250",
  appId: "1:370937266250:web:fa9bc5b510a5c8523026b3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
