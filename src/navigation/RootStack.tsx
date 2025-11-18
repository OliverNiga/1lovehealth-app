// src/navigation/RootStack.tsx
// 2-space indentation
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TabNavigator from './TabNavigator';
import ProfilesScreen from '../screens/ProfilesScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import ScheduleEditScreen from '../screens/ScheduleEditScreen';

export type RootStackParamList = {
  Tabs: undefined;
  ProfilesScreen: undefined;
  ProfileEditScreen: { profileId?: string };
  ScheduleEditScreen: { scheduleId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen 
        name="Tabs" 
        component={TabNavigator} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen
        name="ProfilesScreen"
        component={ProfilesScreen}
        options={{ title: 'Profiles', headerBackTitle: 'Heat' }}
      />
      <Stack.Screen
        name="ProfileEditScreen"
        component={ProfileEditScreen}
        options={{ title: 'Edit Profile', headerBackTitle: 'Profiles' }}
      />
      <Stack.Screen
        name="ScheduleEditScreen"
        component={ScheduleEditScreen}
        options={{ title: 'Edit Schedule', headerBackTitle: 'Schedules' }}
      />
    </Stack.Navigator>
  );
}