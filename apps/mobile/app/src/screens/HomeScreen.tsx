import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, Leaf, Shield, Sun, Humidity, Wind, Cloud, Droplets, ArrowUp, ArrowDown, Minus } from "lucide-react-native";
import { EnvironmentalScore, MetricCard, StatusBadge, ActivitySuitability } from "@skysense/ui";
import { mockEnvironmentData, calculateScore, mockActivitySuitability, mockAIInsights } from "@skysense/utils";

export default function HomeScreen() {
  const [score, setScore] = useState<number | null>(null);
  const [environment, setEnvironment] = useState<typeof mockEnvironmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      setEnvironment(mockEnvironmentData);
      setScore(calculateScore(mockEnvironmentData, {}));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading environmental data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!environment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Environment Data</Text>
          <Text style={styles.emptyDescription}>
            Connect a weather station to start receiving live environmental data.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const getTrend = (value: number, threshold: number) => {
    if (value > threshold) return "up";
    if (value < threshold * 0.5) return "down";
    return "stable";
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up": return "#d69e2e";
      case "down": return "#e53e3e";
      default: return "#4299e1";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <ArrowUp size={12} color={getTrendColor(trend)} />;
      case "down": return <ArrowDown size={12} color={getTrendColor(trend)} />;
      default: return <Minus size={12} color={getTrendColor(trend)} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good Morning</Text>
            <Text style={styles.location}>Ahmedabad, India</Text>
          </View>
        </View>

        {/* Environmental Score */}
        <EnvironmentalScore score={score} style={styles.scoreCard} />

        {/* Current Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Conditions</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Temperature"
              value={`${environment.temperature}°C`}
              trend={getTrend(environment.temperature, 30)}
              trendColor={getTrendColor(getTrend(environment.temperature, 30))}
              icon={<Sun size={24} color="#d69e2e" />}
            />
            <MetricCard
              label="Humidity"
              value={`${environment.humidity}%`}
              trend={getTrend(environment.humidity, 70)}
              trendColor={getTrendColor(getTrend(environment.humidity, 70))}
              icon={<Droplets size={24} color="#4299e1" />}
            />
            <MetricCard
              label="Wind"
              value={`${environment.windSpeed} km/h`}
              trend={getTrend(environment.windSpeed, 15)}
              trendColor={getTrendColor(getTrend(environment.windSpeed, 15))}
              icon={<Wind size={24} color="#718096" />}
            />
            <MetricCard
              label="UV Index"
              value={environment.uvIndex?.toString() || "N/A"}
              trend={environment.uvIndex && environment.uvIndex > 8 ? "up" : "stable"}
              trendColor={environment.uvIndex && environment.uvIndex > 8 ? "#e53e3e" : "#4299e1"}
              icon={<Cloud size={24} color="#ed8936" />}
            />
          </View>
        </View>

        {/* Air Quality */}
        <View style={styles.section}>
          <View style={styles.aqiCard}>
            <StatusBadge
              status={environment.aqi === "Good" ? "good" : environment.aqi === "Moderate" ? "moderate" : "poor"}
              size="lg"
            >
              AQI {environment.aqi}
            </StatusBadge>
            <View style={styles.aqiInfo}>
              <Text style={styles.aqiLabel}>Air Quality</Text>
              <Text style={styles.aqiDescription}>{environment.aqiDescription}</Text>
            </View>
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <View style={styles.recommendations}>
            <View style={styles.recommendationItem}>
              <Heart size={20} color="#38a169" />
              <Text style={styles.recommendationText}>
                Stay hydrated - drink 2-3 liters of water today
              </Text>
            </View>
            <View style={styles.recommendationItem}>
              <Leaf size={20} color="#4299e1" />
              <Text style={styles.recommendationText}>
                Good time for outdoor activity before 10 AM
              </Text>
            </View>
            <View style={styles.recommendationItem}>
              <Shield size={20} color="#d69e2e" />
              <Text style={styles.recommendationText}>
                UV index high - use sun protection
              </Text>
            </View>
          </View>
        </View>

        {/* AI Daily Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Daily Summary</Text>
          <View style={styles.aiCard}>
            <Text style={styles.aiText}>
              "Warm and moderately humid today. Outdoor activity is most comfortable before 10 AM and after 6 PM. UV exposure is stronger around midday, so consider sun protection."
            </Text>
          </View>
        </View>

        {/* Activity Suitability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Suitability</Text>
          <View style={styles.activityGrid}>
            {mockActivitySuitability.slice(0, 3).map((activity) => (
              <ActivitySuitability
                key={activity.activity}
                icon={activity.activity === "Walking" ? "🚶" : activity.activity === "Running" ? "🏃" : "🚴"}
                title={activity.activity}
                score={activity.score}
                suitability={activity.suitability}
                bestTime={activity.bestTime}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#718096",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
  },
  header: {
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  location: {
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
  scoreCard: {
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  aqiCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#f5f5f7",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e2e7",
  },
  aqiInfo: {
    flex: 1,
  },
  aqiLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a2e",
  },
  aqiDescription: {
    fontSize: 13,
    color: "#718096",
    marginTop: 2,
  },
  recommendations: {
    gap: 12,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e2e7",
  },
  recommendationText: {
    fontSize: 14,
    color: "#1a1a2e",
    flex: 1,
  },
  aiCard: {
    padding: 16,
    backgroundColor: "#f5f5f7",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e2e7",
  },
  aiText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#1a1a2e",
  },
  activityGrid: {
    gap: 12,
  },
});