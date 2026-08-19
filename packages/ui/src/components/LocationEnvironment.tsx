"use client";

import type { FC } from "react";
import { motion } from "framer-motion";
import { MapPin, Thermometer, Droplets, Wind, Sun, Cloud, Leaf, Shield } from "lucide-react";
import type { EnvironmentData } from "@skysense/domain-types";

interface LocationEnvironmentProps {
  environment: EnvironmentData;
  className?: string;
}

const aqiColors = {
  Good: { color: "var(--color-success)", label: "Good", description: "Air quality is satisfactory" },
  Moderate: { color: "var(--color-warning)", label: "Moderate", description: "Acceptable for most" },
  Poor: { color: "var(--color-danger)", label: "Poor", description: "Sensitive groups affected" },
  Hazardous: { color: "var(--color-danger)", label: "Hazardous", description: "Health warnings emergency" },
};

export const LocationEnvironment: FC<LocationEnvironmentProps> = ({
  environment,
  className = "",
}) => {
  const aqiInfo = aqiColors[environment.aqi];
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <MapPin className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            Location & Environment
          </h2>
          <p className="section-subtitle">Current environmental conditions at your location</p>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="card-premium p-6 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-warning)" }} />
                <span>Simulated location</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-1">{environment.location}</h3>
              <p className="text-muted-foreground text-sm">
                Updated {new Date(environment.timestamp).toLocaleTimeString()}
              </p>
            </div>
            
            <motion.div
              className="w-24 h-24 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "var(--color-accent-bg)" }}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              whileHover={{ scale: 1.02 }}
            >
              <Leaf className="w-10 h-10" style={{ color: "var(--color-accent)" }} />
            </motion.div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-border relative">
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: aqiInfo.color }}
              />
              <span className="font-semibold text-foreground">Air Quality Index</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground" style={{ color: aqiInfo.color }}>
                {environment.aqi}
              </span>
              <span className="text-muted-foreground">{aqiInfo.label}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{aqiInfo.description}</p>
          </div>
        </motion.div>

        <motion.div
          className="card-premium p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Thermometer className="w-5 h-5" style={{ color: "var(--color-sun)" }} />
            Current Conditions
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Temperature", value: `${environment.temperature}°C`, icon: Thermometer, color: "var(--color-sun)" },
              { label: "Humidity", value: `${environment.humidity}%`, icon: Droplets, color: "var(--color-sky)" },
              { label: "Wind", value: `${environment.windSpeed} km/h`, icon: Wind, color: "var(--color-muted)" },
              { label: "UV Index", value: environment.uvIndex?.toString() || "—", icon: Sun, color: "var(--color-warning)" },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                className="p-4 rounded-xl bg-muted/5 border border-border/50 hover:border-border-hover transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground ml-10">{item.value}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="card-premium p-6 mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          Environmental Health Summary
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          Current conditions in <span className="text-foreground font-medium">{environment.location}</span> show 
          <span className="font-medium" style={{ color: aqiInfo.color }}>{environment.aqi.toLowerCase()}</span> air quality 
          with a temperature of <span className="font-medium">{environment.temperature}°C</span> and 
          <span className="font-medium">{environment.humidity}%</span> humidity. 
          {environment.uvIndex && environment.uvIndex > 7 && (
            <span className="font-medium" style={{ color: "var(--color-warning)" }}>
              UV index is high ({environment.uvIndex})
            </span>
          )}
          {environment.uvIndex && environment.uvIndex <= 7 && (
            <span className="font-medium" style={{ color: "var(--color-success)" }}>
              UV index is moderate ({environment.uvIndex})
            </span>
          )}
          Conditions are good for outdoor activities during cooler morning hours.
        </p>
      </motion.div>
    </div>
  );
};

export type { LocationEnvironmentProps };