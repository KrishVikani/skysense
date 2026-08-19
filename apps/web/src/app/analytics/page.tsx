import { ProtectedRoute } from "@/components/ProtectedRoute";
import AnalyticsPageClient from "./AnalyticsPageClient";

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsPageClient />
    </ProtectedRoute>
  );
}