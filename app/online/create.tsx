import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import { ScreenBg, GoldButton, OrnateTitle, Card, Content } from '@/src/components/ui';
import { useGame } from '@/src/game/context';
import { apiFetch } from '@/src/api';
import { useResponsive } from '@/src/hooks/useResponsive';

export default function CreateRoom() {
  const router = useRouter();
  const { haptic, settings } = useGame();
  const { pad } = useResponsive();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const create = async () => {
    const nm = name.trim();
    if (nm.length < 2) {
      setErr('Name must be at least 2 characters.');
      return;
    }
    setLoading(true);
    setErr('');
    haptic('medium');
    try {
      const r = await apiFetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_name: nm, advanced_roles: settings.advancedRoles }),
      });
      if (!r.ok) throw new Error('Room creation failed');
      const j = await r.json();
      router.replace({
        pathname: '/online/lobby',
        params: { code: j.code, playerId: j.host_id, name: nm, isHost: '1' },
      });
    } catch (e: any) {
      const msg =
        e?.name === 'AbortError'
          ? 'Request timed out. Is the server running?'
          : e?.message || 'Failed to create room. Check connection.';
      setErr(msg);
      setLoading(false);
    }
  };

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Content pad={pad} style={styles.container}>
            <View style={styles.header}>
              <Pressable testID="back-btn" onPress={() => router.back()} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.gold} />
              </Pressable>
              <OrnateTitle size={22}>Host a Game</OrnateTitle>
              <View style={{ width: 32 }} />
            </View>
            <View style={{ alignItems: 'center', marginTop: 30 }}>
              <MaterialCommunityIcons name="crown" size={64} color={theme.colors.gold} />
              <Text style={styles.sub}>Others will join with your 4-digit code.</Text>
            </View>
            <Card style={{ marginTop: 30 }}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                testID="host-name-input"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="e.g. Aria"
                placeholderTextColor={theme.colors.onSurface3}
                maxLength={16}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => void create()}
              />
            </Card>
            {err ? (
              <Text style={styles.err} testID="create-error">
                {err}
              </Text>
            ) : null}
            <View style={{ marginTop: 24 }}>
              <GoldButton
                testID="create-room-btn"
                title={loading ? 'Summoning...' : 'Open the Gates'}
                icon="door-open"
                onPress={() => void create()}
                disabled={loading}
              />
            </View>
          </Content>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sub: { color: theme.colors.onSurface2, marginTop: 10, fontStyle: 'italic', textAlign: 'center' },
  label: {
    color: theme.colors.parchment,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surface3,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.parchment,
    fontSize: 16,
    minHeight: 48,
  },
  err: { color: theme.colors.errorGlow, marginTop: 10, textAlign: 'center' },
});
