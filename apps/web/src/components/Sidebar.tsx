"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Bot, Bell, Thermometer, User, Settings, LogOut, ChevronLeft, Sun, Moon, Monitor, type LucideIcon } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useTheme } from "./ThemeProvider";
import { SkySenseMark } from "./brand/SkySenseMark";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Featured destinations (the Weather product) get a gradient identity tile. */
  featured?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: "Weather",
    items: [{ name: "Weather", href: "/", icon: Sun, featured: true }],
  },
  {
    label: "System",
    items: [
      { name: "My Station", href: "/devices", icon: Thermometer },
      { name: "Alerts", href: "/alerts", icon: Bell },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
      { name: "AI Intelligence", href: "/ai", icon: Bot },
      { name: "Profile", href: "/profile", icon: User },
    ],
  },
];

const bottomItems: NavItem[] = [
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 rounded-xl py-2.5 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
        collapsed ? "justify-center px-0" : "px-3"
      } ${
        isActive
          ? "bg-accent-bg/70 text-accent"
          : "text-muted-foreground hover:bg-muted/5 hover:text-foreground"
      }`}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.name : undefined}
    >
      {isActive && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          aria-hidden="true"
        />
      )}
      {item.featured ? (
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
            isActive
              ? "bg-gradient-to-br from-accent to-sky text-white shadow-sm"
              : "bg-muted/10 text-accent group-hover:scale-105 group-hover:bg-muted/20"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : (
        <Icon
          className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
            isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
          }`}
          aria-hidden="true"
        />
      )}
      {!collapsed && (
        <span className="whitespace-nowrap text-sm font-medium">{item.name}</span>
      )}
      {isActive && !collapsed && (
        <motion.span
          className="ml-auto h-1.5 w-1.5 rounded-full bg-accent"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  const themeIcons = { light: Sun, dark: Moon, system: Monitor };
  const ThemeIcon = themeIcons[theme];

  return (
    <motion.aside
      className={`fixed left-0 top-0 z-[600] hidden h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-out lg:flex ${
        collapsed ? "w-16" : "w-64"
      }`}
      initial={{ width: collapsed ? 64 : 256 }}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 32 }}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <motion.div
          className="flex items-center gap-3 overflow-hidden"
          animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
          transition={{ duration: 0.2 }}
        >
          <SkySenseMark className="h-8 w-8" />
          <span className="whitespace-nowrap text-xl font-bold text-foreground">SKYSENSE</span>
        </motion.div>
        <button
          onClick={onToggleCollapsed}
          className="btn-icon p-1.5"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={`h-5 w-5 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <nav
        className="flex-1 space-y-4 overflow-y-auto px-3 py-4 scrollbar-hide"
        role="navigation"
        aria-label="Main navigation"
      >
        {navigationGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <NavLink key={item.name} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-border p-3">
        {bottomItems.map((item) => (
          <NavLink key={item.name} item={item} collapsed={collapsed} />
        ))}

        <button
          onClick={toggleTheme}
          className={`group flex w-full items-center gap-3 rounded-xl py-2.5 text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
            collapsed ? "justify-center px-0" : "px-3"
          }`}
          aria-label={`Theme: ${theme}. Click to change.`}
        >
          <ThemeIcon
            className="h-5 w-5 flex-shrink-0 transition-colors duration-200 group-hover:text-foreground"
            aria-hidden="true"
          />
          {!collapsed && (
            <span className="whitespace-nowrap text-sm font-medium">
              Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
            </span>
          )}
        </button>

        <button
          onClick={async () => {
            try {
              await signOut();
              router.replace("/auth/signin");
            } catch (error) {
              console.error("Sign out failed:", error);
            }
          }}
          className={`group flex w-full items-center gap-3 rounded-xl py-2.5 text-muted-foreground transition-colors duration-200 ease-out hover:bg-danger-bg/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 ${
            collapsed ? "justify-center px-0" : "px-3"
          }`}
          aria-label="Sign out"
        >
          <LogOut
            className="h-5 w-5 flex-shrink-0 transition-colors duration-200 group-hover:text-danger"
            aria-hidden="true"
          />
          {!collapsed && <span className="whitespace-nowrap text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
}