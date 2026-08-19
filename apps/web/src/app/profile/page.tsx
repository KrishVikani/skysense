import { ProtectedRoute } from "@/components/ProtectedRoute";
import ProfilePageClient from "./ProfilePageClient";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageClient />
    </ProtectedRoute>
  );
}