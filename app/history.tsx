import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import { ScreenBg, OrnateTitle, Card } from '@/src/components/ui';
import { useGame } from '@/src/game/context';

export default function History() {
  const router = useRouter();
  const { history } = useGame();

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Pressable testID="back-btn" onPress={() => router.back()} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.gold} />
            </Pressable>
            <OrnateTitle size={22}>Chronicles</OrnateTitle>
            <View style={{ width: 32 }} />
          </View>

          {history.length === 0 ? (
            <View style={styles.empty} testID="history-empty">
              <MaterialCommunityIcons name={"scroll" as any} size={64} color={theme.colors.onSurface3} />
              <Text style={styles.emptyText}>No tales yet.{"\n"}Play a game to begin your saga.</Text>
            </View>
          ) : history.map(h => (
            <Card key={h.id} style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={[styles.pill, { backgroundColor: h.winner === 'good' ? theme.colors.good : theme.colors.evil }]}>
                  <MaterialCommunityIcons name={h.winner === 'good' ? 'shield-crown' : 'skull'} size={14} color={theme.colors.parchment} />
                  <Text style={styles.pillText}>{h.winner === 'good' ? 'THE REALM' : 'SHADOW'}</Text>
                </View>
                <Text style={styles.date}>{new Date(h.date).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.reason}>{h.reason}</Text>
              <View style={styles.missions}>
                {h.missions.map((m, i) => (
                  <View key={i} style={[styles.missionOrb, { borderColor: m === 'success' ? theme.colors.successGlow : m === 'fail' ? theme.colors.errorGlow : theme.colors.onSurface3 }]}>
                    <MaterialCommunityIcons
                      name={m === 'success' ? 'shield-check' : m === 'fail' ? 'skull' : 'minus'}
                      size={14}
                      color={m === 'success' ? theme.colors.successGlow : m === 'fail' ? theme.colors.errorGlow : theme.colors.onSurface3}
                    />
                  </View>
                ))}
              </View>
              <Text style={styles.players}>{h.players.join(' · ')}</Text>
            </Card>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: theme.colors.onSurface3, textAlign: 'center', marginTop: 16, lineHeight: 20 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, gap: 4 },
  pillText: { color: theme.colors.parchment, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  date: { color: theme.colors.onSurface3, fontSize: 12 },
  reason: { color: theme.colors.parchment, marginTop: 8, fontStyle: 'italic', fontSize: 13 },
  missions: { flexDirection: 'row', gap: 6, marginTop: 10 },
  missionOrb: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  players: { color: theme.colors.onSurface3, fontSize: 11, marginTop: 8 },
});
