import { ProtectedRoute } from "@/components/ProtectedRoute";
import AlertsPageClient from "./AlertsPageClient";

export default function AlertsPage() {
  return (
    <ProtectedRoute>
      <AlertsPageClient />
    </ProtectedRoute>
  );
}