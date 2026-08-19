"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { X, BarChart3, Bot, Bell, Thermometer, User, Settings, Sun } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { SkySenseMark } from "./brand/SkySenseMark";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const navigation = [
  { name: "Weather", href: "/", icon: Sun },
  { name: "My Station", href: "/devices", icon: Thermometer },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "AI", href: "/ai", icon: Bot },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileNavigation({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const drawer = drawerRef.current;
        if (!drawer) return;
        const focusables = drawer.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const within = active !== null && drawer.contains(active);
        if (event.shiftKey && (!within || active === first)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (!within || active === last)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[550] bg-black/50 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            ref={drawerRef}
            className="fixed left-0 top-0 bottom-0 z-[600] w-72 lg:hidden bg-card border-r border-border flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: -288 }}
            animate={{ x: 0 }}
            exit={{ x: -288 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="flex h-16 items-center justify-between px-4 border-b border-border">
              <div className="flex items-center gap-3">
                <SkySenseMark className="h-8 w-8" />
                <span className="font-bold text-xl text-foreground">SKYSENSE</span>
              </div>
              <button
                ref={closeRef}
                onClick={onClose}
                className="btn-icon"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Mobile navigation">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                      isActive
                        ? "bg-accent-bg/70 text-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/5"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent" aria-hidden="true" />
                    )}
                    <Icon className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
                    <span className="font-medium text-base">{item.name}</span>
                    {isActive && (
                      <motion.div
                        className="ml-auto w-2 h-2 rounded-full"
                        style={{ backgroundColor: "var(--color-accent)" }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border p-4">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-accent-bg)" }}>
                  <User className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{user?.displayName || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}