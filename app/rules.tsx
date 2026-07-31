import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import { ScreenBg, OrnateTitle, Card, Divider } from '@/src/components/ui';
import { ROLES, COUNT_CONFIG } from '@/src/game/logic';

export default function Rules() {
  const router = useRouter();

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Pressable testID="back-btn" onPress={() => router.back()} style={styles.back}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.gold} />
            </Pressable>
            <OrnateTitle size={22}>Rules & Roles</OrnateTitle>
            <View style={{ width: 32 }} />
          </View>

          <Card style={{ marginTop: 16 }}>
            <Text style={styles.h2}>The Story</Text>
            <Text style={styles.p}>
              A hidden circle of shadow has infiltrated the Realm. Loyal Knights must complete three missions to save it — but among them walk traitors sworn to sabotage.
            </Text>
          </Card>

          <Divider text="How to Play" />

          <Card>
            <Step n={1} t="Roles">Each player secretly receives a role — Good or Evil.</Step>
            <Step n={2} t="Team Proposal">A rotating Leader proposes a team of Champions for the current mission.</Step>
            <Step n={3} t="Vote">All players openly vote to approve or reject the proposed team. Majority approves. Reject 5 times in a row → Evil wins.</Step>
            <Step n={4} t="Mission">Each Champion plays a secret card: SUCCESS or FAIL. Good players must play SUCCESS. Evil may play either.</Step>
            <Step n={5} t="Outcome">Even one FAIL card fails the mission (except mission 4 with 7+ players — requires two FAILs).</Step>
            <Step n={6} t="Victory">First side to reach 3 mission wins is on the brink of victory. If Good wins 3, the Assassin gets one final chance to name the Seer. If correct, Evil steals victory.</Step>
          </Card>

          <Divider text="The Roles" />

          {Object.values(ROLES).map(r => (
            <View key={r.id} style={[styles.roleCard, { borderColor: r.alignment === 'good' ? theme.colors.successGlow : theme.colors.errorGlow }]}>
              <MaterialCommunityIcons name={r.icon as any} size={30} color={r.alignment === 'good' ? theme.colors.successGlow : theme.colors.errorGlow} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.roleName}>{r.name}</Text>
                  <View style={[styles.pill, { backgroundColor: r.alignment === 'good' ? theme.colors.good : theme.colors.evil }]}>
                    <Text style={styles.pillText}>{r.alignment.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.roleDetail}>{r.detail}</Text>
              </View>
            </View>
          ))}

          <Divider text="Mission Sizes" />

          <Card>
            <View style={styles.tblHead}>
              <Text style={styles.tblCellH}>Players</Text>
              {[1,2,3,4,5].map(i => <Text key={i} style={styles.tblCellH}>M{i}</Text>)}
            </View>
            {Object.entries(COUNT_CONFIG).map(([n, cfg]) => (
              <View key={n} style={styles.tblRow}>
                <Text style={styles.tblCell}>{n} ({cfg.good}G / {cfg.evil}E)</Text>
                {cfg.missions.map((m, i) => (
                  <Text key={i} style={[styles.tblCell, cfg.doubleFailMission === i + 1 && { color: theme.colors.warning }]}>
                    {m}{cfg.doubleFailMission === i + 1 ? '*' : ''}
                  </Text>
                ))}
              </View>
            ))}
            <Text style={styles.footnote}>* Requires two FAIL cards to fail the mission.</Text>
          </Card>
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

function Step({ n, t, children }: any) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}><Text style={styles.stepNumText}>{n}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepT}>{t}</Text>
        <Text style={styles.p}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { padding: 4 },
  h2: { color: theme.colors.gold, fontFamily: 'serif', fontSize: 18, marginBottom: 6 },
  p: { color: theme.colors.onSurface2, fontSize: 13, lineHeight: 19 },
  step: { flexDirection: 'row', marginVertical: 6 },
  stepNum: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.gold, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 2 },
  stepNumText: { color: theme.colors.gold, fontFamily: 'serif' },
  stepT: { color: theme.colors.parchment, fontWeight: '600', marginBottom: 2 },
  roleCard: { flexDirection: 'row', backgroundColor: theme.colors.surface2, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, alignItems: 'flex-start' },
  roleName: { color: theme.colors.parchment, fontFamily: 'serif', fontSize: 16 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillText: { color: '#F0EAD6', fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  roleDetail: { color: theme.colors.onSurface2, marginTop: 4, fontSize: 12, lineHeight: 17 },
  tblHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.divider, paddingBottom: 6, marginBottom: 6 },
  tblRow: { flexDirection: 'row', paddingVertical: 4 },
  tblCellH: { flex: 1, color: theme.colors.gold, fontSize: 12, textAlign: 'center', fontWeight: '600' },
  tblCell: { flex: 1, color: theme.colors.parchment, fontSize: 12, textAlign: 'center' },
  footnote: { color: theme.colors.onSurface3, fontSize: 11, marginTop: 8, fontStyle: 'italic' },
});
