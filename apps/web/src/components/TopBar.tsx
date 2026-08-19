"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Sun, Moon, Monitor, User, LogOut, CheckCircle2, MapPin, Settings } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthProvider";
import { useLocation, compactLocationLabel } from "./LocationProvider";
import { SkySenseMark } from "./brand/SkySenseMark";
import { useActiveAlerts } from "./alerts/useActiveAlerts";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "./alerts/severity";
import { timeAgo } from "./alerts/format";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { location } = useLocation();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [readAlertIds, setReadAlertIds] = useState<Set<string>>(new Set());
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { alerts } = useActiveAlerts();

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

  const locationLabel = compactLocationLabel(location);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const themeIcons = { light: Sun, dark: Moon, system: Monitor };
  const ThemeIcon = themeIcons[theme];

  const notifications = alerts.map((alert) => ({
    id: alert.id,
    title: alert.title,
    message: alert.recommendation,
    time: timeAgo(alert.detectedAt),
    severity: alert.severity,
    unread: alert.status === "active" && !readAlertIds.has(alert.id),
  }));

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="fixed top-0 left-0 right-0 z-[500] h-16 bg-card/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden btn-icon"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="lg:hidden flex items-center gap-2 min-w-0">
          <SkySenseMark className="h-7 w-7 shrink-0" />
          <span className="font-bold text-lg text-foreground tracking-tight truncate">SKYSENSE</span>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/5 min-w-0">
          <MapPin className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-muted-foreground truncate">{locationLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => { setNotificationsOpen(!notificationsOpen); setUserMenuOpen(false); }}
            className="btn-icon relative"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            aria-expanded={notificationsOpen}
            aria-controls={notificationsOpen ? "topbar-notifications-panel" : undefined}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-xs font-medium flex items-center justify-center ring-2 ring-card">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <motion.div
              id="topbar-notifications-panel"
              className="fixed inset-x-3 top-[4.75rem] sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-80 card-elevated shadow-xl py-2"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={() => setReadAlertIds(new Set(alerts.map((a) => a.id)))}
                    className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[min(20rem,calc(100dvh-10rem))] overflow-y-auto sm:max-h-96">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No active alerts</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <Link
                      key={notif.id}
                      href="/alerts"
                      onClick={() => setNotificationsOpen(false)}
                      className={`w-full block px-4 py-3 text-left hover:bg-muted/5 transition-colors ${
                        notif.unread ? "bg-muted/5" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: SEVERITY_COLOR[notif.severity] }}
                              aria-hidden="true"
                            />
                            <span
                              className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${SEVERITY_COLOR[notif.severity]} 15%, transparent)`,
                                color: SEVERITY_COLOR[notif.severity],
                              }}
                            >
                              {SEVERITY_LABEL[notif.severity]}
                            </span>
                            <p className={`font-medium text-sm ${notif.unread ? "text-foreground" : "text-muted-foreground"}`}>
                              {notif.title}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">{notif.time}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-border">
                <Link href="/alerts" onClick={() => setNotificationsOpen(false)} className="text-sm text-accent hover:text-accent-hover font-medium block text-center">
                  View all alerts
                </Link>
              </div>
            </motion.div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => { setUserMenuOpen(!userMenuOpen); setNotificationsOpen(false); }}
            className="btn-icon relative group"
            aria-label="User menu"
            aria-expanded={userMenuOpen}
            aria-controls={userMenuOpen ? "topbar-user-menu-panel" : undefined}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center ring-1 ring-border transition-all duration-200 group-hover:ring-accent/50" style={{ backgroundColor: "var(--color-accent-bg)" }}>
              <User className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            </div>
          </button>

          {userMenuOpen && (
            <motion.div
              id="topbar-user-menu-panel"
              className="absolute right-0 top-full mt-2 w-48 card-elevated shadow-xl py-2"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 py-3 border-b border-border">
                <p className="font-semibold text-foreground">{user?.displayName || "User"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/5 transition-colors">
                <User className="w-4 h-4" />
                Profile
              </Link>
              <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/5 transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <div className="border-t border-border my-2" />
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-danger hover:bg-danger-bg/10 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-danger/50"
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </motion.div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="btn-icon"
          aria-label={`Current theme: ${theme}. Click to change.`}
        >
          <ThemeIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}