"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/AuthProvider";
import { hasCompletedOnboarding } from "@/lib/onboarding/storage";

// The wizard is only needed for accounts that haven't finished setup, so it is
// code-split out of the shared bundle. It renders client-side only.
const Onboarding = dynamic(() => import("./Onboarding").then((m) => m.Onboarding), {
  ssr: false,
  loading: () => null,
});

/**
 * Shows the first-run onboarding wizard once per account.
 *
 * Signed-out visitors never see it (they are handled by the auth flow), and
 * accounts that have finished (or deliberately skipped) setup pass straight
 * through. The underlying app still mounts so routes load without flashes;
 * the wizard overlays it at the top of the stacking order.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const uid = user?.uid ?? null;
  const [complete, setComplete] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!uid) {
      setComplete(true);
      setChecked(true);
      return;
    }
    setComplete(hasCompletedOnboarding(uid));
    setChecked(true);
  }, [uid]);

  if (loading || !checked) return <>{children}</>;
  if (!uid || complete) return <>{children}</>;

  return (
    <>
      {children}
      <Onboarding onComplete={() => setComplete(true)} />
    </>
  );
}