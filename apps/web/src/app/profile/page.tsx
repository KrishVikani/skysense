import { ProtectedRoute } from "@/components/ProtectedRoute";
import ProfilePageClient from "./ProfilePageClient";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageClient />
    </ProtectedRoute>
  );
}