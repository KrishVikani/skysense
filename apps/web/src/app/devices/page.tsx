import { ProtectedRoute } from "@/components/ProtectedRoute";
import MyStationPageClient from "./MyStationPageClient";

export const dynamic = "force-dynamic";

export default function MyStationPage() {
  return (
    <ProtectedRoute>
      <MyStationPageClient />
    </ProtectedRoute>
  );
}