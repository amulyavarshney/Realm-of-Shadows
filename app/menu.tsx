import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { theme } from '@/src/theme';
import { GoldButton, OrnateTitle, Divider, Content } from '@/src/components/ui';
import { useGame } from '@/src/game/context';
import { HERO_IMAGE } from '@/src/config';
import { useResponsive } from '@/src/hooks/useResponsive';

const PHASE_LABELS: Record<string, string> = {
  team_selection: 'Team selection',
  vote: 'Secret voting',
  vote_reveal: 'Vote results',
  mission: 'Mission in progress',
  mission_reveal: 'Mission reveal',
  assassination: 'Assassination',
  endgame: 'Game over',
};

export default function Menu() {
  const router = useRouter();
  const { haptic, pnpSession, sessionLoaded, resumePnP } = useGame();
  const { pad, titleScale, isCompact } = useResponsive();

  const go = (path: string) => {
    haptic('select');
    router.push(path as any);
  };

  const resume = () => {
    haptic('medium');
    const route = resumePnP();
    if (route) router.push(route as any);
  };

  const hasResume = sessionLoaded && pnpSession != null;
  const resumeLabel = pnpSession
    ? (pnpSession.revealComplete
      ? PHASE_LABELS[pnpSession.game.phase] ?? 'In progress'
      : `Role reveal · player ${pnpSession.revealIndex + 1}/${pnpSession.playerNames.length}`)
    : '';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }} testID="main-menu-screen">
      <Image
        source={HERO_IMAGE}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
      />
      <LinearGradient
        colors={['rgba(13,13,17,0.35)', 'rgba(13,13,17,0.9)', '#0D0D11']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.container, { padding: pad }]}
          showsVerticalScrollIndicator={false}
        >
          <Content pad={0}>
            <View style={styles.header}>
              <MaterialCommunityIcons
                name="shield-crown"
                size={isCompact ? 48 : 56}
                color={theme.colors.gold}
              />
              <OrnateTitle size={34 * titleScale} style={{ marginTop: 8 }}>
                Realm of Shadows
              </OrnateTitle>
              <Text style={styles.subtitle}>Trust none. Suspect all.</Text>
            </View>

            {hasResume ? (
              <View style={{ marginTop: isCompact ? 20 : 28 }}>
                <Pressable
                  testID="resume-pnp-btn"
                  onPress={resume}
                  style={({ pressed }) => [styles.resumeBanner, pressed && { opacity: 0.85 }]}
                >
                  <MaterialCommunityIcons name="play-circle" size={28} color={theme.colors.gold} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.resumeTitle}>Resume Game</Text>
                    <Text style={styles.resumeSub}>{resumeLabel}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.gold} />
                </Pressable>
              </View>
            ) : null}

            <View style={{ marginTop: hasResume ? 14 : (isCompact ? 28 : 40) }}>
              <GoldButton
                testID="pnp-mode-btn"
                title="Pass & Play"
                icon="cellphone"
                onPress={() => go('/pnp/setup')}
              />
              <View style={{ height: 14 }} />
              <GoldButton
                testID="online-create-btn"
                title="Host Online Game"
                icon="crown"
                variant="primary"
                onPress={() => go('/online/create')}
              />
              <View style={{ height: 14 }} />
              <GoldButton
                testID="online-join-btn"
                title="Join Online Game"
                icon="account-multiple-plus"
                variant="ghost"
                onPress={() => go('/online/join')}
              />
            </View>

            <Divider text="The Archives" />

            <View style={styles.grid}>
              <Tile
                testID="rules-btn"
                icon="book-open-page-variant"
                label="Rules & Roles"
                onPress={() => go('/rules')}
              />
              <Tile
                testID="history-btn"
                icon="scroll"
                label="Chronicles"
                onPress={() => go('/history')}
              />
              <Tile
                testID="settings-btn"
                icon="cog"
                label="Settings"
                onPress={() => go('/settings')}
              />
            </View>

            <Text style={styles.footer}>Original design · Inspired by classic hidden-role games</Text>
          </Content>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Tile({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}
    >
      <MaterialCommunityIcons name={icon as any} size={28} color={theme.colors.gold} />
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginTop: 20 },
  subtitle: {
    color: theme.colors.onSurface2,
    fontStyle: 'italic',
    letterSpacing: 2,
    marginTop: 4,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26,26,34,0.92)',
    borderWidth: 1.5,
    borderColor: theme.colors.gold,
    borderRadius: 14,
    padding: 16,
    shadowColor: theme.colors.gold,
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  resumeTitle: { color: theme.colors.gold, fontFamily: 'serif', fontSize: 17, letterSpacing: 0.5 },
  resumeSub: { color: theme.colors.onSurface2, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  tile: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: 'rgba(26,26,34,0.85)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    minHeight: 88,
  },
  tileLabel: { color: theme.colors.parchment, marginTop: 8, fontSize: 12, letterSpacing: 1, textAlign: 'center' },
  footer: {
    color: theme.colors.onSurface3,
    textAlign: 'center',
    marginTop: 24,
    fontSize: 10,
    fontStyle: 'italic',
  },
});
