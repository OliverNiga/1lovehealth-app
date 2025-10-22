// 2-space indentation

import React, { useCallback, useLayoutEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Plus, MoreVertical, Timer } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radii, typography } from '../styles/theme';
import { useSaunaController } from '../hooks/useSaunaController';
import type { ZoneProfile } from '../utils/storage';
import type { RootStackParamList } from '../navigation/RootStack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfilesScreen() {
  const nav = useNavigation<NavigationProp>();

  const {
    getZoneProfiles,
    loadZoneProfile,
    deleteZoneProfile,
    saveZoneProfile,
    canControl,
  } = useSaunaController();

  const [profiles, setProfiles] = useState<ZoneProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameOpen, setNameOpen] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const list = await getZoneProfiles();
      list.sort((a, b) => b.createdAt - a.createdAt);
      setProfiles(list);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [getZoneProfiles]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleCreatePress = useCallback(() => {
    setNameValue('');
    setNameOpen(true);
  }, []);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Profiles',
      headerRight: () => (
        <Pressable
          onPress={handleCreatePress}
          accessibilityLabel="Save current settings as a profile"
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Plus size={22} color={colors.textPrimary} />
        </Pressable>
      ),
    });
  }, [nav, handleCreatePress]);

  const applyProfile = useCallback(
    async (id: string, name?: string) => {
      console.log('=== APPLY PROFILE CALLED ===');
      console.log('Profile ID:', id);
      console.log('Profile name:', name);
      console.log('canControl:', canControl);

      if (!canControl) {
        console.log('BLOCKED: Not connected');
        Toast.show({
          type: 'error',
          text1: 'Not connected',
          text2: 'Connect to your sauna to apply a profile.',
        });
        return;
      }

      try {
        console.log('Calling loadZoneProfile...');
        await loadZoneProfile(id);
        console.log('loadZoneProfile returned');

        console.log('Navigating back in 100ms...');
        // Small delay to ensure state updates propagate before navigation
        setTimeout(() => {
          console.log('Executing nav.goBack()');
          nav.goBack();
        }, 100);
      } catch (error) {
        console.error('Error applying profile:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to apply profile',
          text2: 'Please try again',
        });
      }
    },
    [canControl, loadZoneProfile, nav]
  );

  const onDelete = useCallback(
    (id: string, name?: string) => {
      Alert.alert(
        'Delete Profile',
        name ? `Delete "${name}"?` : 'Delete this profile?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteZoneProfile(id);
              Toast.show({ type: 'success', text1: 'Profile deleted' });
              load();
            },
          },
        ],
        { userInterfaceStyle: 'dark' }
      );
    },
    [deleteZoneProfile, load]
  );

  const openActions = useCallback(
    (p: ZoneProfile) => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Apply', 'Edit', 'Delete'],
            destructiveButtonIndex: 3,
            cancelButtonIndex: 0,
            userInterfaceStyle: 'dark',
          },
          (idx) => {
            if (idx === 1) applyProfile(p.id, p.name);
            if (idx === 2) nav.navigate('ProfileEditScreen', { profileId: p.id });
            if (idx === 3) onDelete(p.id, p.name);
          }
        );
      } else {
        Alert.alert(
          p.name,
          undefined,
          [
            { text: 'Apply', onPress: () => applyProfile(p.id, p.name) },
            { text: 'Edit', onPress: () => nav.navigate('ProfileEditScreen', { profileId: p.id }) },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(p.id, p.name) },
            { text: 'Cancel', style: 'cancel' },
          ],
          { userInterfaceStyle: 'dark' }
        );
      }
    },
    [applyProfile, nav, onDelete]
  );

  const renderItem = useCallback(({ item }: { item: ZoneProfile }) => (
    <Pressable
      onPress={() => applyProfile(item.id, item.name)}
      accessibilityLabel={`Apply profile ${item.name}`}
      style={{
        marginBottom: 12,
        backgroundColor: colors.surface,
        borderRadius: radii.card,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.divider,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 }}>
            {item.name}
          </Text>

          {/* Single horizontal card with temperatures and timer */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Temperature card */}
            <View style={{
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 16,
              flexDirection: 'row',
              gap: 14,
            }}>
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, lineHeight: 20 }}>{item.upper}°</Text>
                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textSecondary, marginTop: 1 }}>Upper</Text>
              </View>

              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, lineHeight: 20 }}>{item.middle}°</Text>
                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textSecondary, marginTop: 1 }}>Middle</Text>
              </View>

              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, lineHeight: 20 }}>{item.lower}°</Text>
                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textSecondary, marginTop: 1 }}>Lower</Text>
              </View>
            </View>

            {/* Timer badge */}
            {item.timerMinutes && (
              <View style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                minHeight: 46,
              }}>
                <Timer size={16} color="#15803D" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#15803D' }}>
                  {item.timerMinutes}m
                </Text>
              </View>
            )}
          </View>
        </View>

        <Pressable
          onPress={() => openActions(item)}
          hitSlop={8}
          accessibilityLabel="Open profile actions"
          style={{ padding: 8, marginLeft: 8 }}
        >
          <MoreVertical size={28} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Pressable>
  ), [applyProfile, openActions]);

  const onConfirmCreate = useCallback(async () => {
    const trimmed = nameValue.trim() || 'New Profile';
    await saveZoneProfile(trimmed);
    setNameOpen(false);
    Toast.show({ type: 'success', text1: 'Profile saved', text2: `"${trimmed}"` });
    load();
  }, [nameValue, saveZoneProfile, load]);

  const EmptyComponent = useCallback(() => (
    <View style={{ padding: spacing.outer * 2, alignItems: 'center' }}>
      <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}>
        No profiles yet — Save your current settings to reuse later.
      </Text>
      <Pressable
        onPress={handleCreatePress}
        style={{
          marginTop: 16,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.divider,
          borderRadius: radii.button,
          paddingVertical: 10,
          paddingHorizontal: 16,
        }}
        accessibilityLabel="Save current settings"
      >
        <Text style={{ ...typography.body }}>Save Current Settings</Text>
      </Pressable>
    </View>
  ), [handleCreatePress]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {loading ? (
        <View style={{ padding: spacing.outer }}>
          <Text style={{ ...typography.caption }}>Loading…</Text>
        </View>
      ) : profiles.length === 0 ? (
        <EmptyComponent />
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: spacing.outer,
          }}
        />
      )}

      <Modal visible={nameOpen} animationType="fade" transparent onRequestClose={() => setNameOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: spacing.outer }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.card,
              padding: spacing.outer,
              borderWidth: 1,
              borderColor: colors.divider,
            }}
          >
            <Text style={{ ...typography.h2, marginBottom: 8 }}>Save Profile</Text>
            <Text style={{ ...typography.caption, marginBottom: 8 }}>
              Name this set of temperatures and settings.
            </Text>
            <TextInput
              value={nameValue}
              onChangeText={setNameValue}
              placeholder="e.g., Evening 145°"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: colors.divider,
                borderRadius: radii.chip,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: colors.textPrimary,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <Pressable onPress={() => setNameOpen(false)} style={{ padding: 10, marginRight: 8 }}>
                <Text style={{ ...typography.body, color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onConfirmCreate}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: radii.button,
                  borderWidth: 1,
                  borderColor: colors.divider,
                  backgroundColor: colors.surfaceMuted,
                }}
              >
                <Text style={{ ...typography.body }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}