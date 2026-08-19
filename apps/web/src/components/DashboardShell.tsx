"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNavigation } from "./MobileNavigation";
import { MobileBottomNav } from "./MobileBottomNav";

interface DashboardShellProps {
  children: React.ReactNode;
  /** Page-specific atmospheric identity. See `.app-ambient[data-atmosphere]` in globals.css. */
  atmosphere?: "weather" | "devices" | "alerts" | "analytics" | "ai" | "profile" | "settings";
}

export function DashboardShell({ children, atmosphere }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <div className="app-ambient" data-atmosphere={atmosphere} aria-hidden="true" />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
      <MobileNavigation isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <MobileBottomNav />

      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`relative z-10 ${
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        } min-h-screen pt-16 pb-20 lg:pb-8 transition-[margin-left] duration-300 ease-out`}
      >
        <div className="mx-auto w-full max-w-7xl p-4 lg:p-6 lg:pb-8">{children}</div>
      </motion.main>
    </div>
  );
}