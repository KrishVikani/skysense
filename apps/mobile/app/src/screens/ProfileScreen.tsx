import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Switch, TextInput } from "react-native";
import { SafeAreaView as SafeAreaViewNative } from "react-native-safe-area-context";
import { User, MapPin, Bell, Moon, Sun, Palette, Shield, LogOut, ChevronRight, Edit, Settings } from "lucide-react-native";
import { StatusBadge } from "@skysense/ui";

export default function ProfileScreen() {
  const [profile, setProfile] = useState({
    name: "Alex Johnson",
    email: "alex@example.com",
    location: "Ahmedabad, India",
    units: "metric",
    notifications: true,
    theme: "system",
  });
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    setEditing(false);
    // In a real app, this would save to backend
    console.log("Profile saved:", profile);
  };

  return (
    <SafeAreaViewNative style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <User size={48} color="#ffffff" />
          </View>
          {editing ? (
            <View style={styles.editFields}>
              <TextInput
                style={styles.editInput}
                value={profile.name}
                onChangeText={(text) => setProfile({ ...profile, name: text })}
                placeholder="Name"
              />
              <TextInput
                style={styles.editInput}
                value={profile.email}
                onChangeText={(text) => setProfile({ ...profile, email: text })}
                placeholder="Email"
                keyboardType="email-address"
              />
            </View>
          ) : (
            <>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
            </>
          )}
          <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.editButton}>
            <Edit size={18} color="#4299e1" />
            <Text style={styles.editButtonText}>{editing ? "Save" : "Edit Profile"}</Text>
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TouchableOpacity style={styles.sectionAction}>
              <Settings size={18} color="#4299e1" />
            </TouchableOpacity>
          </View>
          <View style={styles.locationCard}>
            <MapPin size={24} color="#4299e1" />
            <Text style={styles.locationText}>{profile.location}</Text>
            <ChevronRight size={20} color="#a0aec0" />
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.prefItem}>
            <View style={styles.prefIcon}>
              <Palette size={22} color="#805ad5" />
            </View>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>Theme</Text>
              <Text style={styles.prefValue}>{profile.theme.charAt(0).toUpperCase() + profile.theme.slice(1)}</Text>
            </View>
            <ChevronRight size={20} color="#a0aec0" />
          </View>

          <View style={styles.prefItem}>
            <View style={styles.prefIcon}>
              <Sun size={22} color="#ed8936" />
            </View>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>Units</Text>
              <Text style={styles.prefValue}>{profile.units === "metric" ? "Metric (°C, km/h)" : "Imperial (°F, mph)"}</Text>
            </View>
            <ChevronRight size={20} color="#a0aec0" />
          </View>

          <View style={styles.prefItem}>
            <View style={styles.prefIcon}>
              <Bell size={22} color="#4299e1" />
            </View>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>Notifications</Text>
              <Text style={styles.prefValue}>{profile.notifications ? "Enabled" : "Disabled"}</Text>
            </View>
            <Switch
              value={profile.notifications}
              onValueChange={(value) => setProfile({ ...profile, notifications: value })}
              trackColor={{ false: "#e2e2e7", true: "#4299e1" }}
              thumbColor={profile.notifications ? "#ffffff" : "#a0aec0"}
            />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.accountItem}>
            <View style={styles.prefIcon}>
              <Shield size={22} color="#38a169" />
            </View>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>Privacy & Security</Text>
              <Text style={styles.prefValue}>Manage your data and privacy settings</Text>
            </View>
            <ChevronRight size={20} color="#a0aec0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.accountItem}>
            <View style={styles.prefIcon}>
              <Settings size={22} color="#4a5568" />
            </View>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>App Settings</Text>
              <Text style={styles.prefValue}>Language, accessibility, and more</Text>
            </View>
            <ChevronRight size={20} color="#a0aec0" />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutItem}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>Version</Text>
              <Text style={styles.prefValue}>1.0.0</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.aboutItem}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>Terms of Service</Text>
            </View>
            <ChevronRight size={20} color="#a0aec0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutItem}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>Privacy Policy</Text>
            </View>
            <ChevronRight size={20} color="#a0aec0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutItem}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>Licenses</Text>
            </View>
            <ChevronRight size={20} color="#a0aec0" />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton}>
          <LogOut size={20} color="#e53e3e" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>SKYSENSE v1.0.0</Text>
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
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#2d3748",
    justifyContent: "center",
    alignItems: "center",
  },
  editFields: {
    width: "100%",
    gap: 8,
    alignItems: "center",
  },
  editInput: {
    width: "100%",
    maxWidth: 300,
    padding: 12,
    backgroundColor: "#f5f5f7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e2e7",
    fontSize: 16,
    color: "#1a1a2e",
    textAlign: "center",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  profileEmail: {
    fontSize: 15,
    color: "#718096",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#4299e1",
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  sectionAction: {
    padding: 4,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e2e7",
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a2e",
  },
  prefItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e2e7",
    marginBottom: 8,
  },
  prefIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  prefInfo: {
    flex: 1,
  },
  prefLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1a1a2e",
  },
  prefValue: {
    fontSize: 13,
    color: "#718096",
    marginTop: 2,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e2e7",
    marginBottom: 8,
  },
  aboutItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e2e7",
    marginBottom: 8,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    marginTop: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e53e3e",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#a0aec0",
    marginTop: 24,
  },
});