"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthLoader } from "@/components/auth/AuthLoader";
import { AuthField } from "@/components/auth/AuthField";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthGoogleIcon } from "@/components/auth/AuthGoogleIcon";

export default function SignUpPage() {
  const router = useRouter();

  const {
    signUp,
    signInWithGoogle,
    loading: authLoading,
    user,
    error,
    clearError,
  } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (!name || !email || !password || !confirmPassword) {
      setFormError("Please fill in all fields.");
      return;
    }
    if (!email.includes("@")) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email, password, name);
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
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Weather, forecasts and atmospheric detail — free to start.
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
            label="Full name"
            type="text"
            autoComplete="name"
            placeholder="Alex Johnson"
            required
            icon={<User className="h-4 w-4" />}
            value={name}
            onChange={(v) => {
              setName(v);
              clearError();
              setFormError(null);
            }}
          />
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
            autoComplete="new-password"
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
          <AuthField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            icon={<Lock className="h-4 w-4" />}
            toggleable
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v);
              clearError();
              setFormError(null);
            }}
          />

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              Your data stays protected
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Free to start
            </span>
          </div>

          <AuthButton
            type="submit"
            loading={submitting}
            loadingText="Creating account…"
          >
            Create account
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
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="font-medium text-accent transition-colors duration-200 hover:text-accent-hover"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}