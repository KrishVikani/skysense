import { ProtectedRoute } from "@/components/ProtectedRoute";
import MyStationPageClient from "./MyStationPageClient";

export default function MyStationPage() {
  return (
    <ProtectedRoute>
      <MyStationPageClient />
    </ProtectedRoute>
  );
}