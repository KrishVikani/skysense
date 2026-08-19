import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  UserCredential,
  AuthError,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { getFirestoreDb } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth } from "./firebase";

// Re-export the Firebase auth User type through this package so consumers
// never need to import the firebase SDK directly (Firebase stays behind
// @skysense/api).
export type { User } from "firebase/auth";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export interface AuthErrorCode {
  code: string;
  message: string;
}

export const authErrorMap: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/operation-not-allowed": "This sign-in method is not enabled.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/network-request-failed": "Network error. Please check your connection.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked": "Popup was blocked by browser. Please allow popups for this site.",
  "auth/account-exists-with-different-credential": "An account already exists with a different sign-in method.",
  "auth/credential-already-in-use": "This credential is already linked to another account.",
  "auth/requires-recent-login": "Please sign in again to complete this action.",
};

/**
 * Maps a Firebase auth error code to a friendly message. Accepts any error
 * exposing a `code` (Firebase `AuthError` and bare `{ code: string }` shapes
 * alike) so callers can map unknown catch values without importing Firebase.
 */
export function mapAuthError(error: { code: string }): string {
  return authErrorMap[error.code] || "An unexpected error occurred. Please try again.";
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  if (userCredential.user && displayName) {
    await updateProfile(userCredential.user, { displayName });
  }
  
  await createUserDocument(userCredential.user);
  
  return userCredential;
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const userCredential = await signInWithPopup(auth, googleProvider);
  
  await createUserDocument(userCredential.user);
  
  return userCredential;
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  return firebaseSignOut(auth);
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export async function createUserDocument(user: User): Promise<void> {
  const db = getFirestoreDb();
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      onboardingCompleted: false,
    });
  } else {
    await setDoc(userRef, {
      displayName: user.displayName || userSnap.data().displayName || "",
      email: user.email || userSnap.data().email || "",
      photoURL: user.photoURL || userSnap.data().photoURL || "",
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}

/**
 * Shape of a document in the `users` collection (created by
 * {@link createUserDocument}). Timestamps may arrive as raw Firestore
 * Timestamps (with `toDate`) or ISO strings depending on the read path.
 */
export interface UserDocument {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt?: { toDate: () => Date } | string;
  updatedAt?: { toDate: () => Date } | string;
  onboardingCompleted?: boolean;
}

export async function getUserDocument(uid: string): Promise<(UserDocument & { id: string }) | null> {
  const db = getFirestoreDb();
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return null;

  return { id: userSnap.id, ...userSnap.data() } as UserDocument & { id: string };
}

export async function updateUserProfile(displayName: string, photoURL?: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  await updateProfile(user, { displayName, photoURL });
}

export async function updateUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No authenticated user");
  
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}