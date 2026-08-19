import WeatherPageClient from "./WeatherPageClient";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function WeatherPage() {
  return (
    <ProtectedRoute>
      <WeatherPageClient />
    </ProtectedRoute>
  );
}