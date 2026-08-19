import * as React from "react";
import { Tab } from "expo-router";
import HomeScreen from "./src/screens/HomeScreen";
import AnalyticsScreen from "./src/screens/AnalyticsScreen";
import AIScreen from "./src/screens/AIScreen";
import AlertsScreen from "./src/screens/AlertsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

export const shouldAdjustScroll = false;

export default function MobileLayout() {
  return (
    <Tab>
      <Tab.Home>
        <HomeScreen />
      </Tab.Home>
      <Tab.Analytics>
        <AnalyticsScreen />
      </Tab.Analytics>
      <Tab.AI>
        <AIScreen />
      </Tab.AI>
      <Tab.Alerts>
        <AlertsScreen />
      </Tab.Alerts>
      <Tab.Profile>
        <ProfileScreen />
      </Tab.Profile>
    </Tab>
  );
}