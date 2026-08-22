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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    const data = await firebaseLogin(idToken);
    localStorage.setItem('pk_token', data.access_token);
    const me = await getMe();
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (name, email, password) => {
    setError(null);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    const idToken = await userCredential.user.getIdToken();
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
    let _name = null;
    
    if (Capacitor.isNativePlatform()) {
      const _result = await FirebaseAuthentication.signIn({
        provider: 'google',
      });
      // _let let _let _name2 = result.user?.displayName || null;
      const tokenResult = await FirebaseAuthentication.getIdToken();
      idToken = tokenResult.token;
    } else {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      _name = result.user?.displayName || null;
      idToken = await result.user.getIdToken();
    }
    
    if (!idToken) {
      throw new Error('Failed to retrieve Firebase ID Token');
    }
    
    const data = await firebaseLogin(idToken, _name);
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

