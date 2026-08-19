"use client";

import type { FC } from "react";
import { motion } from "framer-motion";
import { Bell, AlertCircle, CheckCircle, Info, ChevronRight } from "lucide-react";
import type { Alert } from "@skysense/domain-types";

interface AlertsPreviewProps {
  alerts: Alert[];
  className?: string;
  maxItems?: number;
}

const severityConfig = {
  info: { icon: Info, color: "var(--color-info)", bg: "var(--color-info-bg)", label: "Info" },
  warning: { icon: AlertCircle, color: "var(--color-warning)", bg: "var(--color-warning-bg)", label: "Warning" },
  critical: { icon: AlertCircle, color: "var(--color-danger)", bg: "var(--color-danger-bg)", label: "Critical" },
};

const typeIcons = {
  weather: Bell,
  "air-quality": AlertCircle,
  uv: AlertCircle,
  health: CheckCircle,
};

export const AlertsPreview: FC<AlertsPreviewProps> = ({
  alerts,
  className = "",
  maxItems = 3,
}) => {
  const displayAlerts = alerts.slice(0, maxItems);
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Bell className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            Active Alerts
          </h2>
          <p className="section-subtitle">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""} active
          </p>
        </div>
        {alerts.length > maxItems && (
          <button className="btn-ghost text-sm">
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {displayAlerts.length === 0 ? (
        <motion.div
          className="card-premium p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--color-success-bg)" }}>
            <CheckCircle className="w-8 h-8" style={{ color: "var(--color-success)" }} />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">All Clear</h3>
          <p className="text-muted-foreground">No active environmental alerts at this time.</p>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {displayAlerts.map((alert, index) => {
            const config = severityConfig[alert.severity];
            const TypeIcon = typeIcons[alert.type];
            
            return (
              <motion.div
                key={alert.id}
                className="card-premium p-4 relative overflow-hidden"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: config.color }} />
                
                <div className="flex items-start gap-3">
                  <div 
                    className="p-2.5 rounded-xl flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${config.color}15`, color: config.color }}
                  >
                    <config.icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2">
                        <div 
                          className="p-1.5 rounded-lg"
                          style={{ backgroundColor: `${config.color}15`, color: config.color }}
                        >
                          <TypeIcon className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="font-semibold text-foreground text-sm">{alert.title}</h4>
                      </div>
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                        style={{ 
                          backgroundColor: `${config.color}20`, 
                          color: config.color 
                        }}
                      >
                        {config.label}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      {!alert.acknowledged && (
                        <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
                          Unread
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export type { AlertsPreviewProps };