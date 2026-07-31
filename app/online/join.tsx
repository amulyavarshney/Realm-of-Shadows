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
import { apiFetch, BackendNotConfiguredError } from '@/src/api';
import { BACKEND_CONFIG_MESSAGE, isBackendConfigured } from '@/src/config';
import { useResponsive } from '@/src/hooks/useResponsive';

export default function JoinRoom() {
  const router = useRouter();
  const { haptic } = useGame();
  const { pad } = useResponsive();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const join = async () => {
    setErr('');
    if (!isBackendConfigured()) {
      setErr(BACKEND_CONFIG_MESSAGE);
      return;
    }
    if (name.trim().length < 2) {
      setErr('Enter your name.');
      return;
    }
    if (!/^\d{4}$/.test(code)) {
      setErr('Enter the 4-digit code.');
      return;
    }
    setLoading(true);
    haptic('medium');
    try {
      const r = await apiFetch(`/api/rooms/${code}`);
      if (!r.ok) throw new Error('Room not found');
      router.replace({
        pathname: '/online/lobby',
        params: { code, name: name.trim(), isHost: '0' },
      });
    } catch (e: any) {
      const msg =
        e instanceof BackendNotConfiguredError
          ? BACKEND_CONFIG_MESSAGE
          : e?.name === 'AbortError'
            ? 'Request timed out. Is the server running?'
            : e?.message || 'Failed to join';
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
              <Pressable
                testID="back-btn"
                onPress={() => router.back()}
                style={{ padding: 4 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.gold} />
              </Pressable>
              <OrnateTitle size={22}>Join a Game</OrnateTitle>
              <View style={{ width: 32 }} />
            </View>
            {!isBackendConfigured() ? (
              <Text style={styles.configWarn} accessibilityRole="alert">
                {BACKEND_CONFIG_MESSAGE}
              </Text>
            ) : null}
            <View style={{ alignItems: 'center', marginTop: 30 }}>
              <MaterialCommunityIcons
                name="account-multiple-plus"
                size={64}
                color={theme.colors.gold}
              />
              <Text style={styles.sub}>Ask the host for the 4-digit code.</Text>
            </View>
            <Card style={{ marginTop: 30 }}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                testID="join-name-input"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="e.g. Bram"
                placeholderTextColor={theme.colors.onSurface3}
                maxLength={16}
                autoCorrect={false}
                accessibilityLabel="Your name"
                accessibilityHint="Enter the name other players will see"
              />
              <Text style={[styles.label, { marginTop: 14 }]}>Room Code</Text>
              <TextInput
                testID="join-code-input"
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 4))}
                style={[styles.input, styles.codeInput]}
                placeholder="0000"
                placeholderTextColor={theme.colors.onSurface3}
                keyboardType="number-pad"
                maxLength={4}
                onSubmitEditing={() => void join()}
                accessibilityLabel="Room code"
                accessibilityHint="Enter the four digit code from the host"
              />
            </Card>
            {err ? (
              <Text style={styles.err} testID="join-error" accessibilityRole="alert">
                {err}
              </Text>
            ) : null}
            <View style={{ marginTop: 24 }}>
              <GoldButton
                testID="join-room-btn"
                title={loading ? 'Entering...' : 'Enter the Realm'}
                icon="door"
                onPress={() => void join()}
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
  codeInput: {
    fontSize: 30,
    textAlign: 'center',
    letterSpacing: 14,
    fontFamily: 'serif',
    color: theme.colors.gold,
  },
  err: { color: theme.colors.errorGlow, marginTop: 10, textAlign: 'center' },
  configWarn: {
    color: theme.colors.warning,
    marginTop: 16,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
});
