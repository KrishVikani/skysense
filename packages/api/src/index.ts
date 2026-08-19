export * from "./firebase";
export * from "./firestore";
export * from "./auth";
export * from "./storage";

// `updateUserProfile` exists in both ./auth (updates the Firebase Auth
// profile — displayName/photoURL) and ./firestore (updates the userProfiles
// document). The auth-bound implementation is the canonical public API (it is
// what the web AuthProvider consumes); explicitly re-exporting it resolves the
// ambiguous star export so consumers resolve a single, correctly-typed
// implementation. The firestore variant remains available via its module.
export { updateUserProfile } from "./auth";