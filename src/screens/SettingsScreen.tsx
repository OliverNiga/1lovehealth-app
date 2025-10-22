// src/screens/SettingsScreen.tsx
import { View, Text } from 'react-native';

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-bg items-center justify-center">
      <Text className="text-textPrimary text-xl">Settings</Text>
      <Text className="text-textSecondary mt-2">Device: Mock • °F only</Text>
    </View>
  );
}
