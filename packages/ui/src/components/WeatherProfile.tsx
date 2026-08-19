"use client";

import type { FC } from "react";
import { motion } from "framer-motion";
import { Heart, Sun, Wind, Droplets, Shield, Leaf, Sparkles } from "lucide-react";

interface WeatherProfileProps {
  className?: string;
}

const profileItems = [
  { key: "heatTolerance", label: "Heat Tolerance", value: "Moderate", icon: Sun, color: "var(--color-sun)", description: "Comfortable up to 32°C" },
  { key: "uvSensitivity", label: "UV Sensitivity", value: "High", icon: Shield, color: "var(--color-warning)", description: "SPF 50+ recommended" },
  { key: "outdoorActivity", label: "Outdoor Activity", value: "Frequent", icon: Leaf, color: "var(--color-success)", description: "3-4 times per week" },
  { key: "coldTolerance", label: "Cold Tolerance", value: "Low", icon: Wind, color: "var(--color-sky)", description: "Prefers above 15°C" },
  { key: "humidityComfort", label: "Humidity Comfort", value: "40-60%", icon: Droplets, color: "var(--color-info)", description: "Optimal range" },
  { key: "airQualitySensitivity", label: "Air Quality Sensitivity", value: "Moderate", icon: Heart, color: "var(--color-accent)", description: "AQI < 100 preferred" },
];

export const WeatherProfile: FC<WeatherProfileProps> = ({
  className = "",
}) => {
  const suitabilityScore = 82;
  
  const getScoreColor = (s: number) => {
    if (s >= 80) return "var(--color-success)";
    if (s >= 60) return "var(--color-warning)";
    if (s >= 40) return "var(--color-danger)";
    return "var(--color-muted)";
  };
  
  const getSuitabilityLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 60) return "Good";
    if (s >= 40) return "Fair";
    return "Poor";
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            Your Weather Profile
          </h2>
          <p className="section-subtitle">Personalized environmental preferences</p>
        </div>
      </div>

      <motion.div
        className="card-premium p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {profileItems.map((item, index) => (
            <motion.div
              key={item.key}
              className="p-4 rounded-xl bg-muted/5 border border-border/50 hover:border-border-hover transition-colors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="p-2.5 rounded-xl"
                  style={{ backgroundColor: `${item.color}20`, color: item.color }}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.value}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
        
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-foreground">Today's Weather Suitability for You</p>
              <p className="text-xs text-muted-foreground">Based on your profile and current conditions</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-foreground" style={{ color: getScoreColor(suitabilityScore) }}>
                {suitabilityScore} / 100
              </p>
              <p className="text-sm font-medium" style={{ color: getScoreColor(suitabilityScore) }}>
                {getSuitabilityLabel(suitabilityScore)}
              </p>
            </div>
          </div>
          
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${suitabilityScore}%` }}
              transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
              className="h-full rounded-full"
              style={{ backgroundColor: getScoreColor(suitabilityScore) }}
            />
          </div>
          
          <p className="text-sm text-muted-foreground mt-3">
            Today's conditions align well with your preferences. Morning hours are optimal for outdoor activities.
          </p>
        </div>
      </motion.div>

      <motion.div
        className="card-premium p-6 mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          Data Privacy Notice
        </h3>
        <p className="text-sm text-muted-foreground">
          Your weather profile is stored locally on your device and used only to personalize environmental recommendations. 
          This information is not used for medical diagnosis and should not replace professional medical advice. 
          You can update or delete your profile at any time in Settings.
        </p>
      </motion.div>
    </div>
  );
};

export type { WeatherProfileProps };