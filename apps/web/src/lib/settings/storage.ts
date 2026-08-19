import { createDocumentInSubcollection, getDocumentsInSubcollection } from "@skysense/api";
import type { UserSettings } from "./types";

/**
 * Settings persistence.
 *
 * The canonical store is a Firestore document at `users/{uid}/settings/app` —
 * a subcollection under the existing per-user document, so the current
 * firestore.rules guard (`request.auth.uid == userId` on
 * `users/{userId}/{document=**}`) covers it with NO rule change and settings
 * are naturally namespaced per authenticated user.
 *
 * A localStorage fallback (keyed per user id) keeps the app fully usable when
 * the account store is unreachable; the SettingsProvider reports whether the
 * last save landed in the account or only locally.
 */

export const SETTINGS_COLLECTION = "users";
export const SETTINGS_SUBCOLLECTION = "settings";
export const SETTINGS_DOC_ID = "app";

export function localSettingsKey(uid: string): string {
  return `skysense.settings.${uid}`;
}

export interface SettingsPersistence {
  load(_uid: string): Promise<UserSettings | null>;
  save(_uid: string, _settings: UserSettings): Promise<void>;
}

/** Account persistence through the browser SDK (respects Firestore rules). */
export const firestoreSettingsPersistence: SettingsPersistence = {
  async load(uid: string): Promise<UserSettings | null> {
    const rows = await getDocumentsInSubcollection<UserSettings & { id: string }>(
      SETTINGS_COLLECTION,
      uid,
      SETTINGS_SUBCOLLECTION
    );
    return rows.find((r) => r.id === SETTINGS_DOC_ID) ?? null;
  },

  async save(uid: string, settings: UserSettings): Promise<void> {
    await createDocumentInSubcollection(
      SETTINGS_COLLECTION,
      uid,
      SETTINGS_SUBCOLLECTION,
      settings as unknown as Record<string, unknown>,
      SETTINGS_DOC_ID
    );
  },
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Best-effort local fallback, namespaced per user to preserve isolation. */
export const localSettingsPersistence: SettingsPersistence = {
  async load(uid: string): Promise<UserSettings | null> {
    if (!isBrowser()) return null;
    try {
      const raw = window.localStorage.getItem(localSettingsKey(uid));
      return raw ? (JSON.parse(raw) as UserSettings) : null;
    } catch {
      return null;
    }
  },

  async save(uid: string, settings: UserSettings): Promise<void> {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(localSettingsKey(uid), JSON.stringify(settings));
    } catch {
      // Best-effort; quota/private-mode failures are non-fatal.
    }
  },
};

export interface LoadResult {
  settings: UserSettings | null;
  source: "account" | "local" | "defaults";
}

/**
 * Loads settings for a user: account store first, then the per-user local
 * fallback. Returns null (with source "defaults") when nothing is stored; the
 * service layer merges with defaults to guarantee a complete, valid object.
 */
export async function loadUserSettings(
  uid: string,
  persistence: SettingsPersistence = firestoreSettingsPersistence,
  local: SettingsPersistence = localSettingsPersistence
): Promise<LoadResult> {
  try {
    const fromAccount = await persistence.load(uid);
    if (fromAccount) {
      return { settings: fromAccount, source: "account" };
    }
  } catch {
    // Fall through to the local store.
  }
  try {
    const fromLocal = await local.load(uid);
    if (fromLocal) {
      return { settings: fromLocal, source: "local" };
    }
  } catch {
    // Fall through to defaults.
  }
  return { settings: null, source: "defaults" };
}

export interface SaveOutcome {
  savedToAccount: boolean;
  savedLocally: boolean;
  savedAt: string;
}

/**
 * Saves settings for a user. The account store is authoritative; if it fails,
 * the per-user local store is used so the change is never lost silently.
 */
export async function saveUserSettings(
  uid: string,
  settings: UserSettings,
  persistence: SettingsPersistence = firestoreSettingsPersistence,
  local: SettingsPersistence = localSettingsPersistence
): Promise<SaveOutcome> {
  const savedAt = new Date().toISOString();
  let savedToAccount = false;
  let savedLocally = false;

  try {
    await persistence.save(uid, settings);
    savedToAccount = true;
  } catch {
    savedToAccount = false;
  }

  if (!savedToAccount) {
    try {
      await local.save(uid, settings);
      savedLocally = true;
    } catch {
      savedLocally = false;
    }
  }

  return { savedToAccount, savedLocally, savedAt };
}
