import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView as SafeAreaViewNative } from "react-native-safe-area-context";
import { Bell, AlertCircle, CheckCircle, Filter, Settings, ChevronRight } from "lucide-react-native";
import { mockAlerts } from "@skysense/utils";
import { StatusBadge } from "@skysense/ui";

type FilterType = "all" | "unread" | "weather" | "air-quality" | "uv" | "health";

export default function AlertsScreen() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [alerts] = useState(mockAlerts);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "all") return true;
    if (filter === "unread") return !alert.acknowledged;
    return alert.type === filter;
  });

  const handleAcknowledge = (id: string) => {
    // In a real app, this would call an API
    console.log("Acknowledge alert:", id);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "#e53e3e";
      case "warning": return "#d69e2e";
      case "info": return "#4299e1";
      default: return "#718096";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "weather": return <AlertCircle size={20} color={getSeverityColor("warning")} />;
      case "air-quality": return <Bell size={20} color={getSeverityColor("info")} />;
      case "uv": return <AlertCircle size={20} color={getSeverityColor("critical")} />;
      case "health": return <CheckCircle size={20} color={getSeverityColor("success")} />;
      default: return <Bell size={20} color={getSeverityColor("info")} />;
    }
  };

  return (
    <SafeAreaViewNative style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Alerts</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={24} color="#4a5568" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Stay informed about environmental changes</Text>
      </View>

      {/* Notifications Toggle */}
      <View style={styles.notificationsRow}>
        <View style={styles.notificationItem}>
          <Bell size={24} color="#4a5568" />
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationLabel}>Push Notifications</Text>
            <Text style={styles.notificationDescription}>Receive real-time alerts</Text>
          </View>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{ false: "#e2e2e7", true: "#4299e1" }}
          thumbColor={notificationsEnabled ? "#ffffff" : "#a0aec0"}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
        {(["all", "unread", "weather", "air-quality", "uv", "health"] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterTab,
              filter === f ? styles.filterTabActive : styles.filterTabInactive,
            ]}
          >
            <Text style={[
              styles.filterTabText,
              filter === f ? styles.filterTabTextActive : styles.filterTabTextInactive,
            ]}>
              {f.charAt(0).toUpperCase() + f.slice(1).replace("-", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Alerts List */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color="#a0aec0" />
            <Text style={styles.emptyTitle}>No Alerts</Text>
            <Text style={styles.emptyDescription}>
              {filter === "unread" ? "All caught up! No unread alerts." : "No alerts for this category."}
            </Text>
          </View>
        ) : (
          filteredAlerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              onPress={() => !alert.acknowledged && handleAcknowledge(alert.id)}
              style={[
                styles.alertCard,
                !alert.acknowledged ? styles.alertCardUnread : styles.alertCardRead,
              ]}
            >
              <View style={styles.alertHeader}>
                <View style={[styles.alertIcon, { backgroundColor: `${getSeverityColor(alert.severity)}20` }]}>
                  {getTypeIcon(alert.type)}
                </View>
                <View style={styles.alertTitleContainer}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <View style={styles.alertMeta}>
                    <StatusBadge
                      status={alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "warning" : "info"}
                      size="sm"
                    >
                      {alert.severity}
                    </StatusBadge>
                    <Text style={styles.alertTime}>{new Date(alert.timestamp).toLocaleString()}</Text>
                  </View>
                </View>
                {!alert.acknowledged && (
                  <View style={styles.unreadDot} />
                )}
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              {!alert.acknowledged && (
                <TouchableOpacity onPress={() => handleAcknowledge(alert.id)} style={styles.acknowledgeButton}>
                  <CheckCircle size={16} color="#38a169" />
                  <Text style={styles.acknowledgeText}>Mark as read</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaViewNative>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e2e7",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  settingsButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#718096",
    marginTop: 4,
  },
  notificationsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f5f5f7",
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e2e7",
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationInfo: {},
  notificationLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a2e",
  },
  notificationDescription: {
    fontSize: 13,
    color: "#718096",
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterTabActive: {
    backgroundColor: "#2d3748",
  },
  filterTabInactive: {
    backgroundColor: "#f5f5f7",
    borderWidth: 1,
    borderColor: "#e2e2e7",
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: "#ffffff",
  },
  filterTabTextInactive: {
    color: "#4a5568",
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    padding: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  emptyDescription: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
  },
  alertCard: {
    padding: 16,
    backgroundColor: "#f5f5f7",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e2e7",
    gap: 12,
  },
  alertCardUnread: {
    borderColor: "#4299e1",
    borderWidth: 2,
  },
  alertCardRead: {
    opacity: 0.7,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  alertTitleContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  alertMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  alertTime: {
    fontSize: 12,
    color: "#718096",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4299e1",
    marginTop: 6,
  },
  alertMessage: {
    fontSize: 14,
    color: "#4a5568",
    lineHeight: 20,
  },
  acknowledgeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
    marginLeft: 52,
  },
  acknowledgeText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#38a169",
  },
});