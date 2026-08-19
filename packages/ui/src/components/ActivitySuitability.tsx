"use client";

import type { FC } from "react";
import { motion } from "framer-motion";
import type { ActivitySuitability as ActivitySuitabilityType } from "@skysense/domain-types";

interface ActivitySuitabilityProps {
  activities: ActivitySuitabilityType[];
  className?: string;
}

const activityIcons: Record<string, string> = {
  Walking: "🚶",
  Running: "🏃",
  Cycling: "🚴",
  Yoga: "🧘",
  Swimming: "🏊",
  Hiking: "🥾",
  "Outdoor Work": "🔨",
  Sports: "⚽",
};

const suitabilityColors = {
  Excellent: "var(--color-success)",
  Good: "var(--color-info)",
  Moderate: "var(--color-warning)",
  Poor: "var(--color-danger)",
};

export const ActivitySuitability: FC<ActivitySuitabilityProps> = ({
  activities,
  className = "",
}) => {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title">Activity Suitability</h2>
          <p className="section-subtitle">Best times for outdoor activities based on current conditions</p>
        </div>
      </div>
      
      <div className="overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4">
        <motion.div
          className="flex gap-4 min-w-max"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {activities.map((activity, index) => (
            <motion.div
              key={activity.activity}
              className="flex-shrink-0 w-64 card-premium p-5 flex flex-col"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
              whileHover={{ y: -4 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{activityIcons[activity.activity] || "🏃"}</span>
                  <div>
                    <p className="font-semibold text-foreground">{activity.activity}</p>
                    <p className="text-sm text-muted-foreground">{activity.suitability}</p>
                  </div>
                </div>
                <motion.div
                  className="text-right"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <p className="text-3xl font-bold text-foreground" style={{ color: suitabilityColors[activity.suitability] }}>
                    {activity.score}
                  </p>
                  <p className="text-xs text-muted-foreground">/ 100</p>
                </motion.div>
              </div>
              
              <div className="h-2 bg-border rounded-full overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${activity.score}%` }}
                  transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 + index * 0.05 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: suitabilityColors[activity.suitability] }}
                />
              </div>
              
              <p className="text-xs text-muted-foreground mb-4 flex-1">
                Best time: <span className="text-foreground font-medium">{activity.bestTime}</span>
              </p>
              
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Why this score:</p>
                <ul className="space-y-1">
                  {activity.recommendations.slice(0, 2).map((rec, i) => (
                    <motion.li
                      key={i}
                      className="text-xs text-muted-foreground flex items-start gap-1.5"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: 0.4 + i * 0.1 }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: suitabilityColors[activity.suitability] }} />
                      <span>{rec}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export type { ActivitySuitabilityProps };