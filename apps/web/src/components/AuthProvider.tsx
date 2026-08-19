"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@skysense/api";
import { onAuthStateChange, signOut, mapAuthError } from "@skysense/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (_email: string, _password: string) => Promise<void>;
  signUp: (_email: string, _password: string, _displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  updateProfile: (_displayName: string, _photoURL?: string) => Promise<void>;
  updatePassword: (_currentPassword: string, _newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setError(null);

  const handleSignIn = async (email: string, password: string) => {
    setError(null);
    try {
      const { signInWithEmail } = await import("@skysense/api");
      await signInWithEmail(email, password);
    } catch (err) {
      const message = mapAuthError(err as Error & { code: string });
      setError(message);
      throw err;
    }
  };

  const handleSignUp = async (email: string, password: string, displayName: string) => {
    setError(null);
    try {
      const { signUpWithEmail } = await import("@skysense/api");
      await signUpWithEmail(email, password, displayName);
    } catch (err) {
      const message = mapAuthError(err as Error & { code: string });
      setError(message);
      throw err;
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const { signInWithGoogle } = await import("@skysense/api");
      await signInWithGoogle();
    } catch (err) {
      const message = mapAuthError(err as Error & { code: string });
      setError(message);
      throw err;
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOut();
    } catch (err) {
      const message = mapAuthError(err as Error & { code: string });
      setError(message);
      throw err;
    }
  };

  const handleUpdateProfile = async (displayName: string, photoURL?: string) => {
    setError(null);
    try {
      const { updateUserProfile } = await import("@skysense/api");
      await updateUserProfile(displayName, photoURL);
    } catch (err) {
      const message = mapAuthError(err as Error & { code: string });
      setError(message);
      throw err;
    }
  };

  const handleUpdatePassword = async (currentPassword: string, newPassword: string) => {
    setError(null);
    try {
      const { updateUserPassword } = await import("@skysense/api");
      await updateUserPassword(currentPassword, newPassword);
    } catch (err) {
      const message = mapAuthError(err as Error & { code: string });
      setError(message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signInWithGoogle: handleGoogleSignIn,
        signOut: handleSignOut,
        updateProfile: handleUpdateProfile,
        updatePassword: handleUpdatePassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}