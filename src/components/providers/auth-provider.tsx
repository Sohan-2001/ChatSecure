"use client";

import type { ReactNode } from 'react';
import React, { createContext, useEffect, useState } from 'react';
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUserType | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUser(userDocSnap.data() as UserProfile);
        } else {
          // This case might happen if user record deleted from Firestore but auth remains
          // Or, if profile creation failed during signup. For robustness, can create one here.
          const newUserProfile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email,
          };
          await setDoc(userDocRef, newUserProfile);
          setUser(newUserProfile);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUp = async (data: SignupFormInputs) => {
    const { email, password, displayName } = data;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
      const newUserProfile: UserProfile = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: displayName || userCredential.user.email,
      };
      await setDoc(doc(db, 'users', userCredential.user.uid), newUserProfile);
      setUser(newUserProfile); // Optimistically set user
    }
  };

  const logIn = async (data: LoginFormInputs) => {
    const { email, password } = data;
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle setting the user
  };

  const logOut = async () => {
    await firebaseSignOut(auth);
    // onAuthStateChanged will handle setting user to null
  };

  const sendPasswordResetEmail = async (email: string) => {
    await firebaseSendPasswordResetEmail(auth, email);
  };
  
  const value = { user, firebaseUser, loading, signUp, logIn, logOut, sendPasswordResetEmail };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
