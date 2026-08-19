"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthLoader } from "@/components/auth/AuthLoader";
import { AuthField } from "@/components/auth/AuthField";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthGoogleIcon } from "@/components/auth/AuthGoogleIcon";

export default function SignInPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle, loading: authLoading, user, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return <AuthLoader />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError("Please enter your email and password.");
      return;
    }
    if (!email.includes("@")) {
      setFormError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      // error is surfaced from the auth context below
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      // error is surfaced from the auth context below
    } finally {
      setSubmitting(false);
    }
  };

  const authError = error ?? formError;

  return (
    <AuthShell>
      <div className="glass-strong w-full rounded-3xl p-6 shadow-2xl sm:p-8">
        <div className="mb-7">
          <div
            className="mb-6 h-1 w-16 rounded-full bg-gradient-to-r from-accent to-sky"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Weather, alerts and environmental intelligence for any location.
          </p>
        </div>

        {authError && (
          <motion.div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-bg/40 px-4 py-3 text-sm text-danger"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{authError}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <AuthField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(v) => {
              setEmail(v);
              clearError();
              setFormError(null);
            }}
          />
          <AuthField
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            icon={<Lock className="h-4 w-4" />}
            toggleable
            value={password}
            onChange={(v) => {
              setPassword(v);
              clearError();
              setFormError(null);
            }}
          />

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              Protected by secure sign-in
            </span>
          </div>

          <AuthButton
            type="submit"
            loading={submitting}
            loadingText="Signing in…"
            icon={<ArrowRight className="h-4 w-4" />}
          >
            Sign In
          </AuthButton>
        </form>

        <AuthDivider />

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="btn-secondary w-full gap-2.5 py-3 disabled:opacity-50"
        >
          {submitting ? <span className="spinner text-muted-foreground" aria-hidden="true" /> : <AuthGoogleIcon />}
          <span>{submitting ? "Signing in with Google…" : "Continue with Google"}</span>
        </button>

        <p className="mt-7 text-center text-sm text-muted-foreground">
          New to SKYSENSE?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-accent transition-colors duration-200 hover:text-accent-hover"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}