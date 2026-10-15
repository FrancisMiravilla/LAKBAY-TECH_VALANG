import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { TAB_BAR_HEIGHT, TAB_BAR_PADDING, TAB_BAR_SIDE_MARGIN, TAB_ICON_SIZE, useTabBarBottom } from './tabBarLayout';

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
import LoadingScreen from '../screens/LoadingScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import CharacterSelectScreen from '../screens/CharacterSelectScreen';
import CatchDetailsScreen from '../screens/CatchDetailsScreen';
import QuizScreen from '../screens/QuizScreen';
import MapScreen from '../screens/MapScreen'; 
import EditProfileScreen from '../screens/EditProfileScreen';
import ViroARScanner from '../screens/ViroARScanner';
import StoreScreen from '../screens/StoreScreen';
import PromoteScreen from '../screens/PromoteScreen';
import MyPromotionsScreen from '../screens/MyPromotionsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TABS = [
  { name: 'Explore', label: 'Explore', icon: 'compass' },
  { name: 'Promote', label: 'Promote', icon: 'megaphone' },
  { name: 'Store',   label: 'Store',   icon: 'storefront' },
  { name: 'Badges',  label: 'Badges',  icon: 'medal' },
  { name: 'Profile', label: 'Profile', icon: 'person' },
];

function MainTabs({ route }) {
  const tabBarBottom = useTabBarBottom();
  const showOnboarding = route?.params?.showOnboarding;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        // Screens draw behind the floating bar; they pad their own scroll content.
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarStyle: [tabStyles.tabBar, { bottom: tabBarBottom }],
        tabBarBackground: () => (
          <View style={tabStyles.glass}>
            <View style={tabStyles.glassSheen} />
          </View>
        ),
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find(t => t.name === route.name);
          const iconName = focused ? tab?.icon : `${tab?.icon}-outline`;
          const color = focused ? '#FBBF24' : '#94A3B8';
          
          return (
            <View
              style={[tabStyles.pill, focused && tabStyles.pillActive]}
              accessibilityLabel={tab?.label ?? route.name}
            >
              <Ionicons name={iconName} size={26} color={color} />
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
          height: TAB_BAR_HEIGHT,
        },
      })}
    >
      <Tab.Screen
        name="Explore"
        component={HomeScreen}
        initialParams={{ showOnboarding }}
      />
      <Tab.Screen name="Promote" component={PromoteScreen} />
      <Tab.Screen name="Store"   component={StoreScreen} />
      <Tab.Screen name="Badges"  component={BadgesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Loading"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      {/* ── Loading / Splash ── */}
      <Stack.Screen name="Loading"         component={LoadingScreen} />

      {/* ── Auth ── */}
      <Stack.Screen name="Welcome"         component={WelcomeScreen} />
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
      <Stack.Screen name="EditProfile"   component={EditProfileScreen} />
      <Stack.Screen name="MindAR"        component={ViroARScanner} />
      <Stack.Screen name="Promote"       component={PromoteScreen} />
      <Stack.Screen name="MyPromotions"  component={MyPromotionsScreen} />
      <Stack.Screen name="Store"         component={StoreScreen} />
      
      {/* REMOVED: Profile and Badges aliases because they are in MainTabs */}
    </Stack.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  // Floating oval glass bar
  tabBar: {
    position: 'absolute',
    left: TAB_BAR_SIDE_MARGIN,
    right: TAB_BAR_SIDE_MARGIN,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: TAB_BAR_PADDING,
    paddingTop: 0,
    paddingBottom: 0,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  glass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_BAR_HEIGHT / 2,
    backgroundColor: 'rgba(6, 14, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    overflow: 'hidden',
  },
  glassSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    borderRadius: TAB_ICON_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: 'rgba(251,191,36,0.20)',
    borderColor: '#FBBF24',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FBBF24',
    marginTop: 4,
  },
});
