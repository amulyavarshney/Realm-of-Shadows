import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolate, Extrapolation } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/src/theme';
import { ScreenBg, GoldButton, OrnateTitle, PrivacyOverlay } from '@/src/components/ui';
import { useGame } from '@/src/game/context';
import { ROLES } from '@/src/game/logic';

export default function PnPReveal() {
  const router = useRouter();
  const { game, pnpSession, haptic, sound, setRevealIndex, completeReveal } = useGame();
  const [idx, setIdx] = useState(pnpSession?.revealIndex ?? 0);
  const [revealed, setRevealed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const flip = useSharedValue(0);

  useEffect(() => {
    if (pnpSession?.revealIndex != null && pnpSession.revealIndex !== idx) {
      setIdx(pnpSession.revealIndex);
      setRevealed(false);
      setConfirmed(false);
      flip.value = 0;
    }
  }, [pnpSession?.revealIndex]);

  if (!game) return <ScreenBg><Text style={{ color: 'white', margin: 40 }}>No game</Text></ScreenBg>;

  const player = game.players[idx];
  const role = ROLES[player.role];
  const isEvil = role.alignment === 'evil';

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flip.value, [0, 1], [0, 180], Extrapolation.CLAMP)}deg` }],
    backfaceVisibility: 'hidden',
    opacity: flip.value > 0.5 ? 0 : 1,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flip.value, [0, 1], [180, 360], Extrapolation.CLAMP)}deg` }],
    backfaceVisibility: 'hidden',
    opacity: flip.value > 0.5 ? 1 : 0,
  }));

  const doReveal = () => {
    if (revealed) return;
    haptic('light');
    sound('reveal');
    flip.value = withTiming(1, { duration: 700 });
    setRevealed(true);
  };

  const doHide = () => {
    haptic('select');
    sound('seal');
    flip.value = withTiming(0, { duration: 500 });
    setRevealed(false);
    setConfirmed(true);
  };

  const nextPlayer = () => {
    haptic('medium');
    if (idx + 1 >= game.players.length) {
      completeReveal();
      router.replace('/pnp/game');
      return;
    }
    const next = idx + 1;
    setIdx(next);
    setRevealIndex(next);
    setRevealed(false);
    setConfirmed(false);
    flip.value = 0;
  };

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <PrivacyOverlay message={`Only ${player.name} should view this screen`} />
          <Text style={styles.stepText} testID="reveal-progress">Player {idx + 1} of {game.players.length}</Text>
          <OrnateTitle size={28} style={{ marginTop: 6 }}>{player.name}</OrnateTitle>
          <Text style={styles.instr}>
            {!confirmed
              ? (revealed ? 'Memorize thy fate, then hide before passing the device.' : 'Step away from others, then reveal thy role.')
              : 'Hand the device to the next player — do not show your role.'}
          </Text>

          <View style={styles.cardWrap}>
            <Animated.View style={[styles.card, frontStyle]}>
              <LinearGradient colors={['#2A241A', '#1A1710']} style={StyleSheet.absoluteFill} />
              <MaterialCommunityIcons name="shield-crown" size={80} color={theme.colors.gold} />
              <Text style={styles.cardBackText}>Realm of Shadows</Text>
              <Text style={styles.cardBackSub}>Tap to Reveal</Text>
            </Animated.View>
            <Animated.View style={[styles.card, styles.cardFront, backStyle, isEvil ? styles.cardEvil : styles.cardGood]}>
              <LinearGradient
                colors={isEvil ? ['#3A0A0A', '#1A0505'] : ['#0A2A1A', '#052014']}
                style={StyleSheet.absoluteFill}
              />
              <MaterialCommunityIcons name={role.icon as any} size={72} color={isEvil ? theme.colors.errorGlow : theme.colors.successGlow} />
              <Text style={[styles.roleName, { color: isEvil ? '#FFD6D6' : '#D4F0E0' }]}>{role.name}</Text>
              <View style={[styles.alignBadge, { backgroundColor: isEvil ? theme.colors.evil : theme.colors.good }]}>
                <Text style={styles.alignText}>{isEvil ? 'EVIL' : 'GOOD'}</Text>
              </View>
              <Text style={styles.roleShort}>{role.short}</Text>
              {player.knowledge.length > 0 && (
                <View style={styles.knowledge}>
                  <Text style={styles.knowLabel}>{player.knowledgeHint}</Text>
                  {player.knowledge.map((n, i) => (
                    <Text key={i} style={styles.knowName}>· {n} ·</Text>
                  ))}
                </View>
              )}
              {player.knowledge.length === 0 && (
                <Text style={styles.knowLabel}>{player.knowledgeHint}</Text>
              )}
            </Animated.View>
          </View>

          <View style={{ marginTop: 20 }}>
            {!revealed && !confirmed && (
              <GoldButton testID="reveal-btn" title="Reveal Role" icon="eye" onPress={doReveal} />
            )}
            {revealed && (
              <GoldButton testID="hide-btn" title="Hide Role" icon="eye-off" variant="ghost" onPress={doHide} />
            )}
            {confirmed && (
              <GoldButton
                testID="next-player-btn"
                title={idx + 1 >= game.players.length ? 'Begin The Game' : 'Pass to Next Player'}
                icon="arrow-right"
                onPress={nextPlayer}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

const CARD_H = 380;

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  stepText: { color: theme.colors.onSurface3, letterSpacing: 2, textTransform: 'uppercase', fontSize: 11, marginTop: 8 },
  instr: { color: theme.colors.onSurface2, textAlign: 'center', marginTop: 10, marginBottom: 20, fontStyle: 'italic', paddingHorizontal: 20 },
  cardWrap: { width: '92%', height: CARD_H, alignSelf: 'center' },
  card: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.gold,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    padding: 20,
    shadowColor: theme.colors.gold, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  cardFront: {},
  cardGood: { borderColor: theme.colors.successGlow, shadowColor: theme.colors.successGlow },
  cardEvil: { borderColor: theme.colors.errorGlow, shadowColor: theme.colors.errorGlow },
  cardBackText: { color: theme.colors.gold, fontFamily: 'serif', fontSize: 22, marginTop: 16, letterSpacing: 2 },
  cardBackSub: { color: theme.colors.onSurface3, fontStyle: 'italic', marginTop: 6, letterSpacing: 3, fontSize: 11, textTransform: 'uppercase' },
  roleName: { fontFamily: 'serif', fontSize: 30, marginTop: 12, letterSpacing: 1.2 },
  alignBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginTop: 8 },
  alignText: { color: '#F0EAD6', fontSize: 11, letterSpacing: 3, fontWeight: '700' },
  roleShort: { color: theme.colors.onSurface2, textAlign: 'center', marginTop: 14, paddingHorizontal: 10, fontStyle: 'italic', fontSize: 13 },
  knowledge: { marginTop: 16, alignItems: 'center' },
  knowLabel: { color: theme.colors.gold, fontSize: 12, letterSpacing: 1, marginBottom: 6, textAlign: 'center' },
  knowName: { color: theme.colors.parchment, fontFamily: 'serif', fontSize: 16, marginVertical: 2 },
});
