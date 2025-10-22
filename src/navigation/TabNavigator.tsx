// src/navigation/TabNavigator.tsx

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ScheduleScreen from '../screens/ScheduleScreen';
import HeatScreen from '../screens/HeatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../styles/theme';
import { Calendar, Settings } from 'lucide-react-native';
import { Platform, View, Text } from 'react-native';
import GradientFlameIcon from './icons/GradientFlameIcon';

export type RootTabParamList = {
  Schedule: undefined;
  Heat: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Heat"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          height: 90,
          paddingBottom: Platform.select({ ios: 20, android: 10 }),
          paddingTop: 8,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { 
          fontSize: 12, 
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          headerShown: true,
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Heat"
        component={HeatScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: '500', marginTop: 4 }}>
              Heat
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <View style={{ marginTop: -10 }}>
              <GradientFlameIcon size={48} focused={focused} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}