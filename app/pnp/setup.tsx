import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import { ScreenBg, GoldButton, OrnateTitle, Divider, Card } from '@/src/components/ui';
import { useGame, PNP_TIP_KEY } from '@/src/game/context';

const DEFAULT_NAMES = ['Aria', 'Bram', 'Cael', 'Dara', 'Elric', 'Fira', 'Gale', 'Hild', 'Ivor', 'Jora'];

export default function PnPSetup() {
  const router = useRouter();
  const { startPnP, haptic, settings, updateSettings } = useGame();
  const [count, setCount] = useState(5);
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES.slice(0, 5));
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(PNP_TIP_KEY).then((v) => {
      if (!v) setShowTip(true);
    });
  }, []);

  const dismissTip = () => {
    haptic('select');
    setShowTip(false);
    void AsyncStorage.setItem(PNP_TIP_KEY, '1');
  };

  const setPlayerCount = (n: number) => {
    if (n < 5 || n > 10) return;
    haptic('select');
    setCount(n);
    setNames(prev => {
      const next = [...prev];
      while (next.length < n) next.push(DEFAULT_NAMES[next.length] || `Player ${next.length + 1}`);
      return next.slice(0, n);
    });
  };

  const updateName = (i: number, v: string) => {
    const next = [...names];
    next[i] = v.slice(0, 16);
    setNames(next);
  };

  const canStart = names.every(n => n.trim().length > 0) && new Set(names.map(n => n.trim().toLowerCase())).size === names.length;

  const start = () => {
    if (!canStart) return;
    haptic('medium');
    startPnP(names.map(n => n.trim()));
    router.push('/pnp/reveal');
  };

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Pressable testID="back-btn" onPress={() => router.back()} style={styles.back}>
                <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.gold} />
              </Pressable>
              <OrnateTitle size={26}>Assemble Thy Court</OrnateTitle>
              <View style={{ width: 32 }} />
            </View>

            {showTip ? (
              <Card style={styles.tipCard}>
                <View style={styles.tipHeader}>
                  <MaterialCommunityIcons name="cellphone-information" size={22} color={theme.colors.gold} />
                  <Text style={styles.tipTitle}>Pass & Play Tips</Text>
                  <Pressable onPress={dismissTip} hitSlop={12}>
                    <MaterialCommunityIcons name="close" size={20} color={theme.colors.onSurface3} />
                  </Pressable>
                </View>
                <Text style={styles.tipBody}>
                  One device is shared by all players. Each player privately views their role, then passes the device for votes and mission cards. Look away when it is not your turn.
                </Text>
              </Card>
            ) : null}

            <Card style={{ marginTop: 20 }}>
              <Text style={styles.label}>Players</Text>
              <View style={styles.counterRow}>
                <Pressable testID="dec-count-btn" onPress={() => setPlayerCount(count - 1)} style={styles.counterBtn}>
                  <MaterialCommunityIcons name="minus" size={22} color={theme.colors.gold} />
                </Pressable>
                <Text style={styles.counterVal} testID="player-count">{count}</Text>
                <Pressable testID="inc-count-btn" onPress={() => setPlayerCount(count + 1)} style={styles.counterBtn}>
                  <MaterialCommunityIcons name="plus" size={22} color={theme.colors.gold} />
                </Pressable>
              </View>
              <Text style={styles.hint}>5 to 10 players</Text>
            </Card>

            <Card style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.label}>Advanced Roles</Text>
                <Pressable
                  testID="toggle-advanced-roles"
                  onPress={() => { haptic('select'); updateSettings({ advancedRoles: !settings.advancedRoles }); }}
                  style={[styles.toggle, settings.advancedRoles && styles.toggleOn]}
                >
                  <View style={[styles.knob, settings.advancedRoles && styles.knobOn]} />
                </Pressable>
              </View>
              <Text style={styles.hint}>Includes Guardian, Sorceress, Shadow Lord & Rogue</Text>
            </Card>

            <Divider text="Player Names" />

            {names.map((n, i) => (
              <View key={i} style={styles.nameRow} testID={`player-input-${i}`}>
                <View style={styles.nameNum}><Text style={styles.nameNumText}>{i + 1}</Text></View>
                <TextInput
                  value={n}
                  onChangeText={v => updateName(i, v)}
                  style={styles.nameInput}
                  placeholder={`Player ${i + 1}`}
                  placeholderTextColor={theme.colors.onSurface3}
                  maxLength={16}
                />
              </View>
            ))}
            <View style={{ height: 20 }} />
            <GoldButton testID="start-pnp-btn" title="Begin The Ritual" icon="cards-playing" onPress={start} disabled={!canStart} />
            {!canStart ? <Text style={styles.err}>Names must be unique and non-empty.</Text> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { padding: 4 },
  label: { color: theme.colors.parchment, letterSpacing: 1, fontSize: 13, textTransform: 'uppercase' },
  hint: { color: theme.colors.onSurface3, fontSize: 12, marginTop: 4 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  counterBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.gold, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20 },
  counterVal: { color: theme.colors.gold, fontSize: 36, fontFamily: 'serif', minWidth: 60, textAlign: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  nameNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.surface3, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: theme.colors.gold },
  nameNumText: { color: theme.colors.gold, fontFamily: 'serif' },
  nameInput: { flex: 1, backgroundColor: theme.colors.surface2, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: theme.colors.parchment },
  err: { color: theme.colors.errorGlow, textAlign: 'center', marginTop: 8, fontSize: 12 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: theme.colors.surface3, padding: 3, borderWidth: 1, borderColor: theme.colors.border },
  toggleOn: { backgroundColor: theme.colors.goldDark, borderColor: theme.colors.gold },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.onSurface3 },
  knobOn: { backgroundColor: theme.colors.gold, transform: [{ translateX: 18 }] },
  tipCard: { marginTop: 16, borderColor: theme.colors.goldDark },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipTitle: { color: theme.colors.gold, fontFamily: 'serif', fontSize: 15, flex: 1 },
  tipBody: { color: theme.colors.onSurface2, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
});
