
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
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import type { LoginFormInputs } from '@/components/auth/login-form';
import type { SignupFormInputs } from '@/components/auth/signup-form';
import type { ResetPasswordFormInputs } from '@/components/auth/reset-password-form';

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
    const userDocRef = doc(db, 'users', fbUser.uid);
    try {
      console.log(`AuthProvider: Attempting to fetch profile for UID: ${fbUser.uid}`);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setUser(userDocSnap.data() as UserProfile);
        console.log(`AuthProvider: Profile found for UID: ${fbUser.uid}`, userDocSnap.data());
      } else {
        console.log(`AuthProvider: No profile found for UID: ${fbUser.uid}. Creating one.`);
        const newUserProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email,
          photoURL: fbUser.photoURL
        };
        await setDoc(userDocRef, newUserProfile);
        setUser(newUserProfile);
        console.log(`AuthProvider: Profile created for UID: ${fbUser.uid}`, newUserProfile);
      }
    } catch (error: any) {
      console.error(`AuthProvider: Error fetching/creating user profile for UID: ${fbUser.uid}`, error);
      if (error.message && error.message.includes("client is offline")) {
        console.error("AuthProvider: Critical - Firestore client is offline. User profile cannot be fetched or created. User experience will be degraded.");
      }
      setUser(null); // Set user to null if profile fetch fails
      throw error; // Re-throw to indicate failure
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
          // Error is already logged in fetchUserProfile
          // setUser(null) is also handled there.
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
      await setDoc(doc(db, 'users', userCredential.user.uid), newUserProfile);
      // onAuthStateChanged will handle setting the user and fetching the profile
      console.log("AuthProvider: Signup successful, profile created in Firestore.");
    }
  };

  const logIn = async (data: LoginFormInputs) => {
    const { email, password } = data;
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle setting the user and fetching profile
    console.log("AuthProvider: Login successful.");
  };

  const logOut = async () => {
    await firebaseSignOut(auth);
    // onAuthStateChanged will handle setting user to null
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
