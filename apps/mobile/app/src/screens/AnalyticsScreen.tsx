import React from "react";
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from "react-native";
import { SafeAreaView as SafeAreaViewNative } from "react-native-safe-area-context";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { mockWeatherForecast, mockHistoricalData } from "@skysense/utils";
import { MetricCard } from "@skysense/ui";

export default function AnalyticsScreen() {
  const forecast = mockWeatherForecast;
  const historical = mockHistoricalData.slice(-24);

  return (
    <SafeAreaViewNative style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Environmental trends & forecasts</Text>
        </View>

        {/* 7-Day Forecast */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7-Day Forecast</Text>
          <View style={styles.forecastScroll}>
            {forecast.map((day) => (
              <View key={day.date} style={styles.forecastCard}>
                <Text style={styles.forecastDate}>{new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</Text>
                <Text style={styles.forecastTemp}>{day.temperature.min}° / {day.temperature.max}°C</Text>
                <Text style={styles.forecastCondition}>{day.condition}</Text>
                <Text style={styles.forecastRain}>{day.precipitationChance}% rain</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Temperature Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Temperature (24h)</Text>
          <View style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={historical} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e7" />
                <XAxis type="number" domain={["dataMin - 5", "dataMax + 5"]} tick={{ fill: "#718096", fontSize: 10 }} />
                <YAxis dataKey="timestamp" type="category" tick={{ fill: "#718096", fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="temperature" fill="#ed8936" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </View>
        </View>

        {/* AQI Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Air Quality Index (24h)</Text>
          <View style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={historical} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e7" />
                <XAxis type="number" domain={[0, 150]} tick={{ fill: "#718096", fontSize: 10 }} />
                <YAxis dataKey="timestamp" type="category" tick={{ fill: "#718096", fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="aqi" fill="#4299e1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Avg Temperature"
              value={`${Math.round(historical.reduce((a, b) => a + b.temperature, 0) / historical.length)}°C`}
              icon="🌡️"
            />
            <MetricCard
              label="Avg Humidity"
              value={`${Math.round(historical.reduce((a, b) => a + b.humidity, 0) / historical.length)}%`}
              icon="💧"
            />
            <MetricCard
              label="Peak AQI"
              value={`${Math.max(...historical.map(h => h.aqi))}`}
              icon="🌬️"
            />
            <MetricCard
              label="Max UV"
              value={`${Math.max(...historical.map(h => h.uvIndex))}`}
              icon="☀️"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaViewNative>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  subtitle: {
    fontSize: 14,
    color: "#718096",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 12,
  },
  forecastScroll: {
    flexDirection: "row",
    gap: 12,
  },
  forecastCard: {
    width: 80,
    padding: 12,
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e2e7",
    alignItems: "center",
  },
  forecastDate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  forecastTemp: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ed8936",
    marginBottom: 2,
  },
  forecastCondition: {
    fontSize: 11,
    color: "#718096",
    marginBottom: 2,
  },
  forecastRain: {
    fontSize: 11,
    color: "#4299e1",
  },
  chartContainer: {
    backgroundColor: "#f5f5f7",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e2e7",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});