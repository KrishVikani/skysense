import { ProtectedRoute } from "@/components/ProtectedRoute";
import SettingsPageClient from "./SettingsPageClient";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsPageClient />
    </ProtectedRoute>
  );
}