import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import { ScreenBg, OrnateTitle, Card, GoldButton } from '@/src/components/ui';
import { useGame } from '@/src/game/context';
import { playSound } from '@/src/audio';

export default function Settings() {
  const router = useRouter();
  const { settings, updateSettings, clearHistory, haptic } = useGame();

  const Row = ({ label, value, onToggle, testID }: any) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        testID={testID}
        onPress={() => { haptic('select'); onToggle(); }}
        style={[styles.toggle, value && styles.toggleOn]}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel={label}
      >
        <View style={[styles.knob, value && styles.knobOn]} />
      </Pressable>
    </View>
  );

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Pressable
              testID="back-btn"
              onPress={() => router.back()}
              style={{ padding: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.gold} />
            </Pressable>
            <OrnateTitle size={22}>Settings</OrnateTitle>
            <View style={{ width: 32 }} />
          </View>

          <Card style={{ marginTop: 18 }}>
            <Row label="Haptic feedback" value={settings.hapticsEnabled} onToggle={() => updateSettings({ hapticsEnabled: !settings.hapticsEnabled })} testID="toggle-haptics" />
            <View style={styles.sep} />
            <Row label="Sound effects" value={settings.soundEnabled} onToggle={() => { const next = !settings.soundEnabled; updateSettings({ soundEnabled: next }); if (next) void playSound('tap'); }} testID="toggle-sound" />
            <View style={styles.sep} />
            <Row label="Advanced roles by default" value={settings.advancedRoles} onToggle={() => updateSettings({ advancedRoles: !settings.advancedRoles })} testID="toggle-advanced" />
          </Card>

          <View style={{ marginTop: 24 }}>
            <GoldButton testID="clear-history-btn" title="Clear Chronicles" icon="delete-sweep" variant="danger" onPress={() => { haptic('heavy'); clearHistory(); }} />
          </View>

          <Text style={styles.footer}>Realm of Shadows v1.0 · An original fantasy party game inspired by classic hidden-role mechanics.</Text>
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  label: { color: theme.colors.parchment, fontSize: 15 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: theme.colors.surface3, padding: 3, borderWidth: 1, borderColor: theme.colors.border },
  toggleOn: { backgroundColor: theme.colors.goldDark, borderColor: theme.colors.gold },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.onSurface3 },
  knobOn: { backgroundColor: theme.colors.gold, transform: [{ translateX: 18 }] },
  sep: { height: 1, backgroundColor: theme.colors.divider },
  footer: { color: theme.colors.onSurface3, fontSize: 11, marginTop: 30, textAlign: 'center', fontStyle: 'italic', lineHeight: 16 },
});
