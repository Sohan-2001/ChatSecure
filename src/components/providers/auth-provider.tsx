
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useEffect, useState, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUserType, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { ref, get, set, serverTimestamp } from 'firebase/database'; // RTDB imports
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import type { LoginFormInputs } from '@/components/auth/login-form';
import type { SignupFormInputs } from '@/components/auth/signup-form';
// ResetPasswordFormInputs not used here, can be removed if not used elsewhere or kept for consistency

export interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUserType | null;
  loading: boolean;
  signUp: (data: SignupFormInputs) => Promise<void>;
  logIn: (data: LoginFormInputs) => Promise<void>;
  logOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  retryFetchProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUserType | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (fbUser: FirebaseUserType) => {
    if (!fbUser) return;
    const userRef = ref(db, `users/${fbUser.uid}`); // RTDB ref
    try {
      console.log(`AuthProvider: Attempting to fetch profile for UID: ${fbUser.uid} from RTDB`);
      const snapshot = await get(userRef); // RTDB get
      if (snapshot.exists()) {
        setUser(snapshot.val() as UserProfile);
        console.log(`AuthProvider: Profile found for UID: ${fbUser.uid} in RTDB`, snapshot.val());
      } else {
        console.log(`AuthProvider: No profile found for UID: ${fbUser.uid} in RTDB. Creating one.`);
        const newUserProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email,
          photoURL: fbUser.photoURL
        };
        await set(userRef, newUserProfile); // RTDB set
        setUser(newUserProfile);
        console.log(`AuthProvider: Profile created for UID: ${fbUser.uid} in RTDB`, newUserProfile);
      }
    } catch (error: any) {
      console.error(`AuthProvider: Error fetching/creating user profile for UID: ${fbUser.uid} from RTDB`, error);
      if (error.message && (error.message.includes("client is offline") || error.message.includes("Failed to fetch") || error.message.includes("NETWORK_ERROR") )) {
        console.error("AuthProvider: Critical - Firebase client is offline or network error. User profile cannot be fetched or created. User experience will be degraded.");
      }
      setUser(null); 
      throw error; 
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          await fetchUserProfile(fbUser);
        } catch (error) {
          // Error is logged in fetchUserProfile
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        console.log("AuthProvider: No Firebase user authenticated.");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  const signUp = async (data: SignupFormInputs) => {
    const { email, password, displayName } = data;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
      const newUserProfile: UserProfile = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: displayName || userCredential.user.email,
        photoURL: userCredential.user.photoURL,
      };
      await set(ref(db, `users/${userCredential.user.uid}`), newUserProfile); // RTDB set
      console.log("AuthProvider: Signup successful, profile created in RTDB.");
    }
  };

  const logIn = async (data: LoginFormInputs) => {
    const { email, password } = data;
    await signInWithEmailAndPassword(auth, email, password);
    console.log("AuthProvider: Login successful.");
  };

  const logOut = async () => {
    await firebaseSignOut(auth);
    console.log("AuthProvider: Logout successful.");
  };

  const sendPasswordResetEmail = async (email: string) => {
    await firebaseSendPasswordResetEmail(auth, email);
  };

  const retryFetchProfile = async () => {
    if (firebaseUser) {
      setLoading(true);
      try {
        await fetchUserProfile(firebaseUser);
      } catch (error) {
        // Error is logged by fetchUserProfile
      } finally {
        setLoading(false);
      }
    } else {
      console.log("AuthProvider: Cannot retry profile fetch, no Firebase user authenticated.");
    }
  };
  
  const value = { user, firebaseUser, loading, signUp, logIn, logOut, sendPasswordResetEmail, retryFetchProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
