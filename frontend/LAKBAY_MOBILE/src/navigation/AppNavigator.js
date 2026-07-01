import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import VintaStripe from '../components/VintaStripe';

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

const TABS = [
  { name: 'Explore', label: 'Explore' },
  { name: 'Badges',  label: 'Badges'  },
  { name: 'Profile', label: 'Profile' },
];

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          tabStyles.tabBar,
          { 
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom,
          }
        ],
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: COLORS.navy }}>
            <VintaStripe height={3} />
          </View>
        ),
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find(t => t.name === route.name);
          return (
            <View style={[tabStyles.pill, focused && tabStyles.pillActive]}>
              <Text style={[tabStyles.pillText, focused && tabStyles.pillTextActive]}>
                {tab?.label ?? route.name}
              </Text>
              {focused && <View style={tabStyles.activeDot} />}
            </View>
          );
        },
        tabBarIconStyle: {
          height: '100%',
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarItemStyle: {
          padding: 0,
          margin: 0,
        },
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
    borderTopWidth: 0,
    paddingHorizontal: 12,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 80,
  },
  pillActive: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderColor: 'rgba(251,191,36,0.40)',
  },
  pillText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  pillTextActive: {
    color: '#FBBF24',
    fontFamily: FONTS.bold,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FBBF24',
    marginTop: 4,
  },
});
