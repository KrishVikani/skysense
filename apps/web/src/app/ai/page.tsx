import { ProtectedRoute } from "@/components/ProtectedRoute";
import AIIntelligenceClient from "./AIIntelligenceClient";

export default function AIIntelligencePage() {
  return (
    <ProtectedRoute>
      <AIIntelligenceClient />
    </ProtectedRoute>
  );
}