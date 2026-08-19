"use client";

import { useAuth } from "@/components/AuthProvider";
import { motion } from "framer-motion";
import { Skeleton } from "@skysense/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <motion.div
        className="min-h-screen bg-background flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-64">
          <Skeleton className="h-12 rounded-xl mb-4" />
          <Skeleton className="h-4 rounded mb-2" />
          <Skeleton className="h-4 rounded mb-2 width-3/4" />
        </div>
      </motion.div>
    );
  }

  if (!user) {
    return fallback || null;
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <motion.div
        className="min-h-screen bg-background flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-64">
          <Skeleton className="h-12 rounded-xl mb-4" />
          <Skeleton className="h-4 rounded mb-2" />
          <Skeleton className="h-4 rounded mb-2 width-3/4" />
        </div>
      </motion.div>
    );
  }

  if (user) {
    return null;
  }

  return <>{children}</>;
}