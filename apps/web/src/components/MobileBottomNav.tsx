"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart3, Bell, Settings, Sun, Thermometer } from "lucide-react";

const navigation = [
  { name: "Weather", href: "/", icon: Sun, label: "Weather", featured: true },
  { name: "My Station", href: "/devices", icon: Thermometer, label: "My Station" },
  { name: "Alerts", href: "/alerts", icon: Bell, label: "Alerts" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, label: "Analytics" },
  { name: "Settings", href: "/settings", icon: Settings, label: "Settings" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                isActive
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
            >
              {isActive && (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute -top-2 inset-x-0 bottom-0 -z-10 rounded-2xl bg-accent-bg/70"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  aria-hidden="true"
                />
              )}
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-xl transition-colors duration-200 ${
                  item.featured
                    ? isActive
                      ? "bg-gradient-to-br from-accent to-sky text-white"
                      : "bg-accent-bg/60 text-accent"
                    : ""
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}