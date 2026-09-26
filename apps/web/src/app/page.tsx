import WeatherPageClient from "./WeatherPageClient";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const dynamic = "force-dynamic";

export default function WeatherPage() {
  return (
    <ProtectedRoute>
      <WeatherPageClient />
    </ProtectedRoute>
  );
}