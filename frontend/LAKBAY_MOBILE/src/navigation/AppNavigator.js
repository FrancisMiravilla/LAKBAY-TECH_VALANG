import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import QRScreen from '../screens/QRScreen';
import CatchScreen from '../screens/CatchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DetailsScreen from '../screens/DetailsScreen';
import ARScreen from '../screens/ARScreen';
import ARScannedScreen from '../screens/ARScannedScreen';
import QRScannedScreen from '../screens/QRScannedScreen';
import NotificationScreen from '../screens/NotificationScreen';
import BadgesScreen from '../screens/BadgesScreen';
import LoginScreen from '../screens/LoginScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import CharacterSelectScreen from '../screens/CharacterSelectScreen';
import CatchDetailsScreen from '../screens/CatchDetailsScreen';
import QuizScreen from '../screens/QuizScreen';
import MapScreen from '../screens/MapScreen'; 

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICON = {
  Explore: { active: 'compass', inactive: 'compass-outline', label: 'Explore' },
  Badges:  { active: 'ribbon',  inactive: 'ribbon-outline',  label: 'Badges' },
  Profile: { active: 'person',  inactive: 'person-outline',  label: 'Profile' },
};

function TabIcon({ name, focused }) {
  const cfg = TAB_ICON[name];
  const iconName = focused ? cfg.active : cfg.inactive;
  const iconColor = focused ? COLORS.accent : 'rgba(255,255,255,0.55)';
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
      <Ionicons name={iconName} size={22} color={iconColor} />
      {focused && <View style={tabStyles.activeDot} />}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: tabStyles.tabBar,
        tabBarLabel: ({ focused }) => (
          <Text style={[tabStyles.tabLabel, focused && tabStyles.tabLabelActive]}>
            {TAB_ICON[route.name]?.label ?? route.name}
          </Text>
        ),
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Explore" component={HomeScreen} />
      <Tab.Screen name="Badges"  component={BadgesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
{/* ── Auth ── */}
      <Stack.Screen name="Login"           component={LoginScreen} />
      <Stack.Screen name="CreateAccount"   component={CreateAccountScreen} />
      <Stack.Screen name="CharacterSelect" component={CharacterSelectScreen} />
      
      {/* ── Main App ── */}
      <Stack.Screen name="MainTabs"      component={MainTabs} />
      
      {/* ── Standalone Screens (No Tabs) ── */}
      <Stack.Screen name="Details"       component={DetailsScreen} />
      <Stack.Screen name="AR"            component={ARScreen} />
      <Stack.Screen name="ARScanned"     component={ARScannedScreen} />
      <Stack.Screen name="QRScanned"     component={QRScannedScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="QR"            component={QRScreen} />
      <Stack.Screen name="Catch"         component={CatchScreen} />
      <Stack.Screen name="CatchDetails"  component={CatchDetailsScreen} />
      <Stack.Screen name="QuizScreen"    component={QuizScreen} />
      <Stack.Screen name="Map"           component={MapScreen} />
      
      {/* REMOVED: Profile and Badges aliases because they are in MainTabs */}
    </Stack.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.navy,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    height: 72,
    paddingBottom: 10,
    paddingTop: 6,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(26,86,219,0.22)',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.semiBold,
  },
});
