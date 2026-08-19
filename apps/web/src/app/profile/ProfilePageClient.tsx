"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, LogOut, Key, Globe, Bell, ChevronRight, CheckCircle, AlertCircle, Sun, Monitor, Camera } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { DashboardShell } from "@/components/DashboardShell";
import { getUserDocument } from "@skysense/api";
import Image from "next/image";

interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt?: { toDate: () => Date } | string;
  updatedAt?: { toDate: () => Date } | string;
  onboardingCompleted?: boolean;
}

export default function ProfilePageClient() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await getUserDocument(user.uid);
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && user) {
      fetchUserProfile();
    }
  }, [user, loading, fetchUserProfile]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/auth/signin");
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setSigningOut(false);
    }
  };

  const getProviderName = (providerId: string) => {
    const providers: Record<string, string> = {
      "password": "Email/Password",
      "google.com": "Google",
      "github.com": "GitHub",
      "facebook.com": "Facebook",
      "twitter.com": "Twitter",
    };
    return providers[providerId] || providerId;
  };

  const formatDate = (date: { toDate: () => Date } | string | undefined) => {
    if (!date) return "Unknown";
    try {
      const d = typeof date === "string" ? new Date(date) : date.toDate();
      return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return "Unknown";
    }
  };

  const displayName = user?.displayName || userProfile?.displayName || "User";
  const email = user?.email || userProfile?.email || "";
  const photoURL = user?.photoURL || userProfile?.photoURL || "";
  const uid = user?.uid || userProfile?.uid || "";
  const createdAt = userProfile?.createdAt;
  const providerData = user?.providerData || [];

  if (loading || profileLoading) {
    return (
      <DashboardShell atmosphere="profile">
        <div className="space-y-6 animate-in">
          <div className="flex items-center gap-4 p-6 card-premium">
            <div className="w-20 h-20 rounded-2xl skeleton-shimmer" />
            <div className="space-y-3 flex-1">
              <div className="h-6 w-48 skeleton-shimmer rounded" />
              <div className="h-4 w-64 skeleton-shimmer rounded" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="h-48 skeleton-shimmer rounded-2xl card-premium" />
            <div className="h-48 skeleton-shimmer rounded-2xl card-premium" />
            <div className="h-48 skeleton-shimmer rounded-2xl card-premium" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  // FIXED: Removed `if (!user) return null;` - ProtectedRoute already guarantees user exists

  return (
    <DashboardShell atmosphere="profile">
      <div className="space-y-6 max-w-4xl">
        {/* Profile Header */}
        <motion.div
          className="card-premium p-6 lg:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {photoURL ? (
                  <Image
                    src={photoURL}
                    alt={displayName}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white"
                    style={{ backgroundColor: "var(--color-accent)" }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <button className="btn-icon absolute -bottom-1 -right-1 bg-accent text-white" aria-label="Change avatar — coming soon" title="Coming soon" disabled>
                  <Camera className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                <p className="text-muted-foreground mt-1 break-all">{email}</p>
                <p className="text-xs text-muted-foreground mt-2 font-mono">UID: {uid.slice(0, 12)}...</p>
              </div>
            </div>
            <div className="flex items-center gap-3 md:ml-auto">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="btn-secondary gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>

          {/* Provider badges */}
          {providerData.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Signed in with:</p>
              <div className="flex flex-wrap gap-2">
                {providerData.map((provider) => (
                  <span
                    key={provider.providerId}
                    className="badge badge-accent flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3 h-3" />
                    {getProviderName(provider.providerId)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Account & Security Section */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="section-title">Account & Security</h2>
          
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Security</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Manage your password and sign-in methods</p>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-accent-bg)" }}>
                    <Key className="w-5 h-5" style={{ color: "var(--color-accent)" }} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Password</p>
                    <p className="text-sm text-muted-foreground">Last changed recently</p>
                  </div>
                </div>
                <button className="btn-ghost text-sm" disabled title="Coming soon">
                  Change
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-info-bg)" }}>
                    <Shield className="w-5 h-5" style={{ color: "var(--color-info)" }} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                </div>
                <button className="btn-ghost text-sm" disabled title="Coming soon">
                  Enable
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-warning-bg)" }}>
                    <Globe className="w-5 h-5" style={{ color: "var(--color-warning)" }} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Connected Accounts</p>
                    <p className="text-sm text-muted-foreground">Manage OAuth providers</p>
                  </div>
                </div>
                <button className="btn-ghost text-sm" disabled title="Coming soon">
                  Manage
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Preferences</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Customize your experience</p>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-sun-bg)" }}>
                    <Sun className="w-5 h-5" style={{ color: "var(--color-sun)" }} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Units</p>
                    <p className="text-sm text-muted-foreground">Metric (°C, km/h, mm)</p>
                  </div>
                </div>
                <Link href="/settings" className="btn-ghost text-sm">
                  Change
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-info-bg)" }}>
                    <Bell className="w-5 h-5" style={{ color: "var(--color-info)" }} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Notifications</p>
                    <p className="text-sm text-muted-foreground">In-app alert preferences</p>
                  </div>
                </div>
                <Link href="/settings" className="btn-ghost text-sm">
                  Manage
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-accent-bg)" }}>
                    <Monitor className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Theme</p>
                    <p className="text-sm text-muted-foreground">System preference</p>
                  </div>
                </div>
                <Link href="/settings" className="btn-ghost text-sm">
                  Change
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Account Info Section */}
        <motion.div
          className="card-premium p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="section-title mb-4">Account Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/5 rounded-xl">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Display Name</p>
                <p className="font-medium text-foreground">{displayName}</p>
              </div>
              <div className="p-4 bg-muted/5 rounded-xl">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Email</p>
                <p className="font-medium text-foreground">{email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/5 rounded-xl">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Account Created</p>
                <p className="font-medium text-foreground">{formatDate(createdAt)}</p>
              </div>
              <div className="p-4 bg-muted/5 rounded-xl">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Email Verified</p>
                <p className="font-medium text-foreground flex items-center gap-2">
                  {user?.emailVerified ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-success" />
                      Verified
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-warning" />
                      Not verified
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="p-4 bg-muted/5 rounded-xl">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">User ID</p>
              <p className="font-mono text-sm text-muted-foreground break-all">{uid}</p>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          className="card-premium p-6 border-danger/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="section-title mb-4 flex items-center gap-2 text-danger">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
            Danger Zone
          </h2>
          <p className="text-muted-foreground mb-4">Irreversible actions. Please proceed with caution.</p>
          <div className="flex items-center justify-between p-4 bg-danger-bg/50 rounded-xl border border-danger/20">
            <div>
              <p className="font-medium text-danger">Delete Account</p>
              <p className="text-sm text-muted-foreground mt-0.5">Permanently delete your account and all associated data</p>
            </div>
            <button className="btn-ghost text-danger hover:bg-danger-bg/10 text-sm" disabled title="Coming soon">
              Delete
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      </div>
    </DashboardShell>
  );
}

