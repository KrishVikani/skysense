import { getFirebaseStorage } from "./firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  const storage = getFirebaseStorage();
  const fileRef = ref(storage, `profile-photos/${userId}/${Date.now()}-${file.name}`);
  
  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);
  return downloadURL;
}

export async function deleteProfilePhoto(photoURL: string): Promise<void> {
  const storage = getFirebaseStorage();
  try {
    const fileRef = ref(storage, photoURL);
    await deleteObject(fileRef);
  } catch (error) {
    console.warn("Failed to delete old profile photo:", error);
  }
}