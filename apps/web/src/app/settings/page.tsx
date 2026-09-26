import { ProtectedRoute } from "@/components/ProtectedRoute";
import SettingsPageClient from "./SettingsPageClient";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsPageClient />
    </ProtectedRoute>
  );
}