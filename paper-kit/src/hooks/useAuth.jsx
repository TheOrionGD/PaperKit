/* eslint-disable react-refresh/only-export-components */
/* useAuth.jsx — AuthContext + provider + hook.
   Handles Firebase Authentication (Google, Email/Password), JWT exchange,
   and automatic session restore. */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { firebaseLogin, getMe, logout as apiLogout } from '../services/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* On mount: try to restore session from stored token */
  useEffect(() => {
    const token = localStorage.getItem('pk_token');
    if (!token) { setLoading(false); return; }
    getMe()
      .then(u => setUser(u))
      .catch(() => localStorage.removeItem('pk_token'))
      .finally(() => setLoading(false));
  }, []);

  /* Listen for 401 events from API interceptor */
  useEffect(() => {
    function handleUnauthorized() { setUser(null); }
    window.addEventListener('pk:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('pk:unauthorized', handleUnauthorized);
  }, []);

  /* Sync user preferences dark mode theme */
  useEffect(() => {
    if (user?.preferences?.dark_mode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user]);

  const login = useCallback(async (email, password) => {
    setError(null);
    let idToken;
    let name = null;
    if (Capacitor.isNativePlatform()) {
      const res = await FirebaseAuthentication.signInWithEmailAndPassword({
        email,
        password,
      });
      name = res.user?.displayName || null;
      const tokenResult = await FirebaseAuthentication.getIdToken();
      idToken = tokenResult.token;
    } else {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      name = userCredential.user.displayName || null;
      idToken = await userCredential.user.getIdToken();
    }
    const data = await firebaseLogin(idToken, name);
    localStorage.setItem('pk_token', data.access_token);
    const me = await getMe();
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (name, email, password) => {
    setError(null);
    let idToken;
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.createUserWithEmailAndPassword({
        email,
        password,
      });
      if (name) {
        try {
          await FirebaseAuthentication.updateProfile({ displayName: name });
        } catch (e) {
          console.warn('Failed to update native profile name:', e);
        }
      }
      const tokenResult = await FirebaseAuthentication.getIdToken();
      idToken = tokenResult.token;
    } else {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      idToken = await userCredential.user.getIdToken();
    }
    const data = await firebaseLogin(idToken, name);
    localStorage.setItem('pk_token', data.access_token);
    const me = await getMe();
    setUser(me);
    return me;
  }, []);

  const loginWithFirebaseToken = useCallback(async (idToken, name = null) => {
    setError(null);
    const data = await firebaseLogin(idToken, name);
    localStorage.setItem('pk_token', data.access_token);
    const me = await getMe();
    setUser(me);
    return me;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    let idToken;
    let name = null;
    
    if (Capacitor.isNativePlatform()) {
      let result;
      try {
        result = await FirebaseAuthentication.signInWithGoogle();
      } catch (nativeErr) {
        console.warn('Credential manager sign-in failed, trying fallback:', nativeErr);
        // Fallback to legacy Google Sign-In intent if Credential Manager fails
        result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
      }
      name = result.user?.displayName || null;
      const tokenResult = await FirebaseAuthentication.getIdToken();
      idToken = tokenResult.token;
    } else {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      name = result.user?.displayName || null;
      idToken = await result.user.getIdToken();
    }
    
    if (!idToken) {
      throw new Error('Failed to retrieve Firebase ID Token');
    }
    
    const data = await firebaseLogin(idToken, name);
    localStorage.setItem('pk_token', data.access_token);
    const me = await getMe();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await FirebaseAuthentication.signOut();
      } catch (err) {
        console.error('Failed to sign out from native Firebase:', err);
      }
    }
    await signOut(auth);
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, loginWithFirebaseToken, loginWithGoogle, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

