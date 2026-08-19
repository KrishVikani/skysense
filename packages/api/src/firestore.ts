import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { getFirestoreDb } from "./firebase";
import type { 
  EnvironmentData, 
  WeatherForecast, 
  ActivitySuitability, 
  AIInsight, 
  UserProfile, 
  Alert, 
  AQIData, 
  HistoricalDataPoint,
  EnvironmentalScore 
} from "@skysense/domain-types";

const COLLECTIONS = {
  ENVIRONMENT_DATA: "environmentData",
  WEATHER_FORECAST: "weatherForecast",
  ACTIVITY_SUITABILITY: "activitySuitability",
  AI_INSIGHTS: "aiInsights",
  USER_PROFILES: "userProfiles",
  ALERTS: "alerts",
  AQI_HISTORY: "aqiHistory",
  HISTORICAL_DATA: "historicalData",
  ENVIRONMENTAL_SCORES: "environmentalScores",
} as const;

function convertTimestamps(data: DocumentData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    } else if (value && typeof value === "object" && "toDate" in value) {
      result[key] = (value as Timestamp).toDate().toISOString();
    } else {
      result[key] = value;
    }
  }
  return result;
}

function prepareForFirestore(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      result[key] = Timestamp.fromDate(value);
    } else if (typeof value === "string" && key.endsWith("At")) {
      result[key] = Timestamp.fromDate(new Date(value));
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function createDocument<T extends DocumentData>(
  collectionName: string,
  data: T,
  id?: string
): Promise<string> {
  const db = getFirestoreDb();
  const docRef = id ? doc(db, collectionName, id) : doc(collection(db, collectionName));
  await setDoc(docRef, prepareForFirestore({ ...data, createdAt: new Date(), updatedAt: new Date() }));
  return docRef.id;
}

export async function getDocument<T>(
  collectionName: string,
  id: string
): Promise<T | null> {
  const db = getFirestoreDb();
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as T;
}

export async function getDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  const db = getFirestoreDb();
  const q = query(collection(db, collectionName), ...constraints);
  const querySnap = await getDocs(q);
  
  return querySnap.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as T[];
}

export async function updateDocument(
  collectionName: string,
  id: string,
  data: Partial<DocumentData>
): Promise<void> {
  const db = getFirestoreDb();
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, prepareForFirestore({ ...data, updatedAt: new Date() }));
}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  const db = getFirestoreDb();
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}

/**
 * Creates a document inside a subcollection: `collectionName/{docId}/{subcollection}`.
 *
 * Used by the device-readings storage to keep RAW sensor data separate from
 * derived analytics: `deviceReadings/{deviceId}/readings/{readingId}`.
 * Subcollections also avoid requiring a composite index for
 * `where(deviceId) + orderBy(timestamp)` queries.
 */
export async function createDocumentInSubcollection<T extends DocumentData>(
  collectionName: string,
  docId: string,
  subcollection: string,
  data: T,
  subId?: string
): Promise<string> {
  const db = getFirestoreDb();
  const col = collection(db, collectionName, docId, subcollection);
  const docRef = subId ? doc(col, subId) : doc(col);
  await setDoc(
    docRef,
    prepareForFirestore({ ...data, createdAt: new Date(), updatedAt: new Date() })
  );
  return docRef.id;
}

/** Queries documents inside `collectionName/{docId}/{subcollection}`. */
export async function getDocumentsInSubcollection<T>(
  collectionName: string,
  docId: string,
  subcollection: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  const db = getFirestoreDb();
  const col = collection(db, collectionName, docId, subcollection);
  const q = query(col, ...constraints);
  const querySnap = await getDocs(q);

  return querySnap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...convertTimestamps(docSnap.data()),
  })) as T[];
}

/** Deletes one document inside `collectionName/{docId}/{subcollection}`. */
export async function deleteDocumentInSubcollection(
  collectionName: string,
  docId: string,
  subcollection: string,
  subId: string
): Promise<void> {
  const db = getFirestoreDb();
  const docRef = doc(db, collectionName, docId, subcollection, subId);
  await deleteDoc(docRef);
}

// Re-export the Firestore query primitives so downstream consumers (e.g. the
// device-readings storage layer) can build query constraints without importing
// the firebase SDK directly — keeping Firestore access behind this package.
export { collection, doc, query, where, orderBy, limit, startAfter, Timestamp } from "firebase/firestore";

export function subscribeToDocument<T>(
  collectionName: string,
  id: string,
  callback: (data: T | null) => void
): Unsubscribe {
  const db = getFirestoreDb();
  const docRef = doc(db, collectionName, id);
  
  return onSnapshot(docRef, (docSnap) => {
    if (!docSnap.exists()) {
      callback(null);
      return;
    }
    callback({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as T);
  });
}

export function subscribeToCollection<T>(
  collectionName: string,
  callback: (data: T[]) => void,
  constraints: QueryConstraint[] = []
): Unsubscribe {
  const db = getFirestoreDb();
  const q = query(collection(db, collectionName), ...constraints);
  
  return onSnapshot(q, (querySnap) => {
    const data = querySnap.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data()),
    })) as T[];
    callback(data);
  });
}

export async function getEnvironmentData(userId: string): Promise<EnvironmentData | null> {
  return getDocument<EnvironmentData>(COLLECTIONS.ENVIRONMENT_DATA, userId);
}

export async function saveEnvironmentData(userId: string, data: EnvironmentData): Promise<void> {
  await createDocument(COLLECTIONS.ENVIRONMENT_DATA, data, userId);
}

export async function updateEnvironmentData(userId: string, data: Partial<EnvironmentData>): Promise<void> {
  await updateDocument(COLLECTIONS.ENVIRONMENT_DATA, userId, data);
}

export function subscribeToEnvironmentData(
  userId: string,
  callback: (data: EnvironmentData | null) => void
): Unsubscribe {
  return subscribeToDocument(COLLECTIONS.ENVIRONMENT_DATA, userId, callback);
}

export async function getWeatherForecast(location: string, days = 7): Promise<WeatherForecast[]> {
  return getDocuments<WeatherForecast>(COLLECTIONS.WEATHER_FORECAST, [
    where("location", "==", location),
    orderBy("date", "asc"),
    limit(days),
  ]);
}

export async function saveWeatherForecast(forecasts: WeatherForecast[]): Promise<void> {
  const db = getFirestoreDb();
  const batch = forecasts.map(forecast => 
    createDocument(COLLECTIONS.WEATHER_FORECAST, forecast)
  );
  await Promise.all(batch);
}

export async function getActivitySuitability(userId: string): Promise<ActivitySuitability[]> {
  return getDocuments<ActivitySuitability>(COLLECTIONS.ACTIVITY_SUITABILITY, [
    where("userId", "==", userId),
    orderBy("score", "desc"),
  ]);
}

export async function saveActivitySuitability(userId: string, activities: ActivitySuitability[]): Promise<void> {
  const promises = activities.map(activity => 
    createDocument(COLLECTIONS.ACTIVITY_SUITABILITY, { ...activity, userId })
  );
  await Promise.all(promises);
}

export async function getAIInsights(userId: string, limitCount = 10): Promise<AIInsight[]> {
  return getDocuments<AIInsight>(COLLECTIONS.AI_INSIGHTS, [
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(limitCount),
  ]);
}

export async function saveAIInsight(userId: string, insight: AIInsight): Promise<string> {
  return createDocument(COLLECTIONS.AI_INSIGHTS, { ...insight, userId });
}

export async function markInsightRead(insightId: string): Promise<void> {
  await updateDocument(COLLECTIONS.AI_INSIGHTS, insightId, { read: true });
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  return getDocument<UserProfile>(COLLECTIONS.USER_PROFILES, userId);
}

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
  await createDocument(COLLECTIONS.USER_PROFILES, profile, userId);
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  await updateDocument(COLLECTIONS.USER_PROFILES, userId, data);
}

export async function getAlerts(userId: string, unreadOnly = false): Promise<Alert[]> {
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(50),
  ];
  
  if (unreadOnly) {
    constraints.unshift(where("acknowledged", "==", false));
  }
  
  return getDocuments<Alert>(COLLECTIONS.ALERTS, constraints);
}

export async function saveAlert(userId: string, alert: Alert): Promise<string> {
  return createDocument(COLLECTIONS.ALERTS, { ...alert, userId });
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  await updateDocument(COLLECTIONS.ALERTS, alertId, { acknowledged: true });
}

export async function getAQIHistory(location: string, days = 30): Promise<AQIData[]> {
  return getDocuments<AQIData>(COLLECTIONS.AQI_HISTORY, [
    where("location", "==", location),
    orderBy("timestamp", "desc"),
    limit(days),
  ]);
}

export async function saveAQIData(data: AQIData): Promise<string> {
  return createDocument(COLLECTIONS.AQI_HISTORY, data);
}

export async function getHistoricalData(location: string, hours = 24): Promise<HistoricalDataPoint[]> {
  return getDocuments<HistoricalDataPoint>(COLLECTIONS.HISTORICAL_DATA, [
    where("location", "==", location),
    orderBy("timestamp", "desc"),
    limit(hours),
  ]);
}

export async function saveHistoricalData(data: HistoricalDataPoint): Promise<string> {
  return createDocument(COLLECTIONS.HISTORICAL_DATA, data);
}

export async function getEnvironmentalScore(userId: string): Promise<EnvironmentalScore | null> {
  return getDocument<EnvironmentalScore>(COLLECTIONS.ENVIRONMENTAL_SCORES, userId);
}

export async function saveEnvironmentalScore(userId: string, score: EnvironmentalScore): Promise<void> {
  await createDocument(COLLECTIONS.ENVIRONMENTAL_SCORES, { ...score, userId }, userId);
}

export function subscribeToAlerts(
  userId: string,
  callback: (alerts: Alert[]) => void
): Unsubscribe {
  return subscribeToCollection<Alert>(COLLECTIONS.ALERTS, callback, [
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(20),
  ]);
}

export function subscribeToAIInsights(
  userId: string,
  callback: (insights: AIInsight[]) => void
): Unsubscribe {
  return subscribeToCollection<AIInsight>(COLLECTIONS.AI_INSIGHTS, callback, [
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(10),
  ]);
}