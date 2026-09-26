import { ProtectedRoute } from "@/components/ProtectedRoute";
import AlertsPageClient from "./AlertsPageClient";

export const dynamic = "force-dynamic";

export default function AlertsPage() {
  return (
    <ProtectedRoute>
      <AlertsPageClient />
    </ProtectedRoute>
  );
}