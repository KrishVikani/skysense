import { ProtectedRoute } from "@/components/ProtectedRoute";
import AnalyticsPageClient from "./AnalyticsPageClient";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsPageClient />
    </ProtectedRoute>
  );
}