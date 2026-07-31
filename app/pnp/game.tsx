import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { theme } from '@/src/theme';
import { ScreenBg, GoldButton, OrnateTitle, Card, Divider } from '@/src/components/ui';
import { useGame } from '@/src/game/context';
import { ROLES, goodSuccesses, evilSuccesses } from '@/src/game/logic';

export default function PnPGame() {
  const router = useRouter();
  const { game, haptic, toggleTeamMember, confirmTeam, castVote, nextVoter, playMissionCard, nextMissionActor, resolveMission, advanceAfterMission, chooseAssassinationTarget, confirmAssassination, resetGame, continueAfterVoteReveal } = useGame();

  const [handoff, setHandoff] = useState(false); // shows "pass device" screen between secret actions
  const [showVoteChoice, setShowVoteChoice] = useState<'approve'|'reject'|null>(null);
  const [missionChoice, setMissionChoice] = useState<'success'|'fail'|null>(null);

  if (!game) return (
    <ScreenBg>
      <SafeAreaView><Text style={{ color: theme.colors.parchment, margin: 20 }}>No game in progress.</Text></SafeAreaView>
    </ScreenBg>
  );

  const good = goodSuccesses(game);
  const evil = evilSuccesses(game);
  const teamSize = game.config.missions[game.currentMission];
  const leader = game.players[game.currentLeader];

  const backToMenu = () => { resetGame(); router.replace('/menu'); };

  // ---------- MissionTracker ----------
  const Tracker = () => (
    <View style={styles.tracker}>
      {game.config.missions.map((size, i) => {
        const res = game.missionResults[i];
        const isCurrent = i === game.currentMission && !game.winner;
        const isDoubleFail = game.config.doubleFailMission === i + 1;
        const color = res
          ? (res.outcome === 'success' ? theme.colors.successGlow : theme.colors.errorGlow)
          : (isCurrent ? theme.colors.gold : theme.colors.onSurface3);
        return (
          <View key={i} style={[styles.trackerNode, { borderColor: color, shadowColor: color, shadowOpacity: isCurrent ? 0.8 : 0.2 }]} testID={`mission-node-${i}`}>
            <Text style={[styles.trackerNum, { color }]}>{size}</Text>
            {res && <MaterialCommunityIcons name={res.outcome === 'success' ? 'shield-check' : 'skull'} size={14} color={color} style={{ marginTop: 2 }} />}
            {isDoubleFail && <Text style={styles.doubleFail}>2×</Text>}
          </View>
        );
      })}
    </View>
  );

  // ---------- Team Selection ----------
  if (game.phase === 'team_selection') {
    const done = game.currentTeam.length === teamSize;
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 18 }}>
            <TopBar onBack={backToMenu} good={good} evil={evil} mission={game.currentMission + 1} rejects={game.proposeVoteCount} />
            <Tracker />
            <View style={styles.leaderBanner}>
              <MaterialCommunityIcons name="crown" size={22} color={theme.colors.gold} />
              <Text style={styles.leaderText}>{leader.name} proposes a team of {teamSize}</Text>
            </View>
            <Text style={styles.phaseTitle}>Select {teamSize} Champions</Text>
            <View style={styles.playerGrid}>
              {game.players.map((p, i) => {
                const on = game.currentTeam.includes(p.id);
                return (
                  <Pressable
                    key={p.id}
                    testID={`select-player-${i}`}
                    onPress={() => { haptic('select'); toggleTeamMember(p.id); }}
                    style={[styles.pTile, on && styles.pTileOn]}
                  >
                    <View style={[styles.avatar, on && { borderColor: theme.colors.gold }]}>
                      <Text style={styles.avatarText}>{p.name[0].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.pName}>{p.name}</Text>
                    {i === game.currentLeader && <MaterialCommunityIcons name="crown" size={14} color={theme.colors.gold} />}
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: 20 }}>
              <GoldButton testID="confirm-team-btn" title="Propose Team" icon="hand-heart" onPress={() => { haptic('medium'); confirmTeam(); }} disabled={!done} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  // ---------- Vote (per player, pass device) ----------
  if (game.phase === 'vote') {
    const voter = game.players[game.currentVoter];
    if (!handoff && game.currentVoter > 0) {
      return <Handoff who={voter.name} onReady={() => setHandoff(true)} label="cast their vote" />;
    }
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 20, flex: 1 }}>
            <TopBar onBack={backToMenu} good={good} evil={evil} mission={game.currentMission + 1} rejects={game.proposeVoteCount} />
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <OrnateTitle size={22}>{voter.name}'s Vote</OrnateTitle>
              <Text style={styles.sub}>Proposed team:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                {game.currentTeam.map(pid => {
                  const p = game.players.find(x => x.id === pid)!;
                  return <View key={pid} style={styles.teamChip}><Text style={styles.teamChipText}>{p.name}</Text></View>;
                })}
              </View>
            </View>
            {!showVoteChoice ? (
              <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
                <Pressable testID="vote-approve-btn" onPress={() => { haptic('heavy'); castVote('approve'); setShowVoteChoice('approve'); }} style={[styles.bigChoice, { borderColor: theme.colors.successGlow }]}>
                  <LinearGradient colors={['#0A2A1A', '#052014']} style={StyleSheet.absoluteFill} />
                  <MaterialCommunityIcons name="shield-check" size={56} color={theme.colors.successGlow} />
                  <Text style={[styles.bigChoiceText, { color: theme.colors.successGlow }]}>APPROVE</Text>
                </Pressable>
                <Pressable testID="vote-reject-btn" onPress={() => { haptic('heavy'); castVote('reject'); setShowVoteChoice('reject'); }} style={[styles.bigChoice, { borderColor: theme.colors.errorGlow }]}>
                  <LinearGradient colors={['#3A0A0A', '#1A0505']} style={StyleSheet.absoluteFill} />
                  <MaterialCommunityIcons name="skull" size={56} color={theme.colors.errorGlow} />
                  <Text style={[styles.bigChoiceText, { color: theme.colors.errorGlow }]}>REJECT</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name={showVoteChoice === 'approve' ? 'shield-check' : 'skull'} size={80} color={showVoteChoice === 'approve' ? theme.colors.successGlow : theme.colors.errorGlow} />
                <Text style={styles.voteConfirmed}>Vote sealed.</Text>
                <View style={{ marginTop: 20, width: '80%' }}>
                  <GoldButton testID="next-voter-btn" title={game.currentVoter + 1 >= game.players.length ? 'Reveal Votes' : 'Pass to Next'} icon="arrow-right" onPress={() => { setShowVoteChoice(null); setHandoff(false); nextVoter(); }} />
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  // ---------- Vote Reveal ----------
  if (game.phase === 'vote_reveal') {
    const last = game.voteHistory[game.voteHistory.length - 1];
    const approves = Object.values(last.votes).filter(v => v === 'approve').length;
    const rejects = Object.values(last.votes).filter(v => v === 'reject').length;
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <TopBar onBack={backToMenu} good={good} evil={evil} mission={game.currentMission + 1} rejects={game.proposeVoteCount} />
            <OrnateTitle size={28} style={{ marginTop: 20 }}>{last.approved ? 'Team Approved' : 'Team Rejected'}</OrnateTitle>
            <Text style={[styles.tally, { color: last.approved ? theme.colors.successGlow : theme.colors.errorGlow }]}>
              {approves} approve · {rejects} reject
            </Text>
            <Card style={{ marginTop: 20 }}>
              {game.players.map(p => {
                const v = last.votes[p.id];
                return (
                  <View key={p.id} style={styles.voteRow}>
                    <Text style={styles.voteName}>{p.name}</Text>
                    <View style={[styles.voteBadge, { backgroundColor: v === 'approve' ? theme.colors.good : theme.colors.evil }]}>
                      <Text style={styles.voteBadgeText}>{v === 'approve' ? 'APPROVE' : 'REJECT'}</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
            <View style={{ marginTop: 24 }}>
              <GoldButton
                testID="continue-vote-btn"
                title={last.approved ? 'Begin The Mission' : `Continue (${game.proposeVoteCount + 1}/5 rejects)`}
                icon="arrow-right"
                onPress={() => { haptic(last.approved ? 'success' : 'error'); continueAfterVoteReveal(); }}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  // ---------- Mission ----------
  if (game.phase === 'mission') {
    const actor = game.players.find(p => p.id === game.currentTeam[game.currentMissionActor])!;
    const isEvil = ROLES[actor.role].alignment === 'evil';
    if (!handoff && game.currentMissionActor > 0) {
      return <Handoff who={actor.name} onReady={() => setHandoff(true)} label="play their mission card" />;
    }
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 20, flex: 1 }}>
            <TopBar onBack={backToMenu} good={good} evil={evil} mission={game.currentMission + 1} rejects={game.proposeVoteCount} />
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <OrnateTitle size={22}>{actor.name}</OrnateTitle>
              <Text style={styles.sub}>Play thy mission card in secret.</Text>
            </View>
            {!missionChoice ? (
              <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
                <Pressable testID="mission-success-btn" onPress={() => { haptic('success'); playMissionCard('success'); setMissionChoice('success'); }} style={[styles.bigChoice, { borderColor: theme.colors.successGlow }]}>
                  <LinearGradient colors={['#0A2A1A', '#052014']} style={StyleSheet.absoluteFill} />
                  <MaterialCommunityIcons name="shield-check" size={56} color={theme.colors.successGlow} />
                  <Text style={[styles.bigChoiceText, { color: theme.colors.successGlow }]}>SUCCESS</Text>
                </Pressable>
                <Pressable
                  testID="mission-fail-btn"
                  onPress={() => { if (!isEvil) return; haptic('error'); playMissionCard('fail'); setMissionChoice('fail'); }}
                  disabled={!isEvil}
                  style={[styles.bigChoice, { borderColor: theme.colors.errorGlow, opacity: isEvil ? 1 : 0.35 }]}
                >
                  <LinearGradient colors={['#3A0A0A', '#1A0505']} style={StyleSheet.absoluteFill} />
                  <MaterialCommunityIcons name="skull" size={56} color={theme.colors.errorGlow} />
                  <Text style={[styles.bigChoiceText, { color: theme.colors.errorGlow }]}>FAIL</Text>
                  {!isEvil && <Text style={styles.forbidden}>Only shadow may sabotage</Text>}
                </Pressable>
              </View>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="cards" size={80} color={theme.colors.gold} />
                <Text style={styles.voteConfirmed}>Card sealed in secret.</Text>
                <View style={{ marginTop: 20, width: '80%' }}>
                  <GoldButton
                    testID="next-mission-actor-btn"
                    title={game.currentMissionActor + 1 >= game.currentTeam.length ? 'Reveal Mission' : 'Pass to Next'}
                    icon="arrow-right"
                    onPress={() => { setMissionChoice(null); setHandoff(false); if (game.currentMissionActor + 1 >= game.currentTeam.length) resolveMission(); nextMissionActor(); }}
                  />
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  // ---------- Mission Reveal ----------
  if (game.phase === 'mission_reveal') {
    const res = game.missionResults[game.currentMission]!;
    const isSuccess = res.outcome === 'success';
    const failsCount = res.cards.filter(c => c === 'fail').length;
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <TopBar onBack={backToMenu} good={good} evil={evil} mission={game.currentMission + 1} rejects={game.proposeVoteCount} />
            <Animated.View entering={ZoomIn.duration(700)} style={[styles.resultOrb, { borderColor: isSuccess ? theme.colors.successGlow : theme.colors.errorGlow, shadowColor: isSuccess ? theme.colors.successGlow : theme.colors.errorGlow }]}>
              <LinearGradient colors={isSuccess ? ['#0A2A1A', '#052014'] : ['#3A0A0A', '#1A0505']} style={StyleSheet.absoluteFill} />
              <MaterialCommunityIcons name={isSuccess ? 'shield-check' : 'skull'} size={120} color={isSuccess ? theme.colors.successGlow : theme.colors.errorGlow} />
              <Text style={[styles.resultText, { color: isSuccess ? theme.colors.successGlow : theme.colors.errorGlow }]}>{isSuccess ? 'MISSION SUCCESS' : 'MISSION FAILED'}</Text>
              <Text style={styles.failCount}>{failsCount} sabotage card{failsCount === 1 ? '' : 's'} played</Text>
            </Animated.View>
            <View style={{ marginTop: 40, width: '90%' }}>
              <GoldButton testID="advance-round-btn" title="Continue" icon="arrow-right" onPress={() => { haptic('medium'); advanceAfterMission(); }} />
            </View>
          </View>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  // ---------- Assassination ----------
  if (game.phase === 'assassination') {
    const assassin = game.players.find(p => p.role === 'assassin');
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <OrnateTitle size={26}>The Final Strike</OrnateTitle>
            <Text style={[styles.sub, { textAlign: 'center', marginTop: 10 }]}>
              The Realm has claimed three victories, but one last treachery remains.{'\n\n'}
              <Text style={{ color: theme.colors.errorGlow }}>{assassin?.name}, the Assassin</Text>, name the Seer.
            </Text>
            <Text style={[styles.phaseTitle, { marginTop: 20 }]}>Choose thy target:</Text>
            <View style={styles.playerGrid}>
              {game.players.filter(p => ROLES[p.role].alignment === 'good').map(p => {
                const on = game.assassinationTarget === p.id;
                return (
                  <Pressable
                    key={p.id}
                    testID={`assassinate-${p.id}`}
                    onPress={() => { haptic('select'); chooseAssassinationTarget(p.id); }}
                    style={[styles.pTile, on && { borderColor: theme.colors.errorGlow }]}
                  >
                    <View style={[styles.avatar, on && { borderColor: theme.colors.errorGlow }]}>
                      <Text style={styles.avatarText}>{p.name[0].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.pName}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: 20 }}>
              <GoldButton
                testID="confirm-assassinate-btn"
                title="Strike"
                icon="knife-military"
                variant="danger"
                disabled={!game.assassinationTarget}
                onPress={() => { haptic('heavy'); confirmAssassination(); }}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  // ---------- Endgame ----------
  if (game.phase === 'endgame') {
    const goodWon = game.winner === 'good';
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Animated.View entering={FadeIn.duration(800)}>
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <MaterialCommunityIcons name={goodWon ? 'trophy' : 'skull-crossbones'} size={100} color={goodWon ? theme.colors.gold : theme.colors.errorGlow} />
                <OrnateTitle size={32} style={{ marginTop: 12, color: goodWon ? theme.colors.gold : theme.colors.errorGlow }}>
                  {goodWon ? 'The Realm Prevails' : 'Shadow Consumes All'}
                </OrnateTitle>
                <Text style={styles.reason} testID="win-reason">{game.winReason}</Text>
              </View>
              <Divider text="Roles Revealed" />
              {game.players.map(p => {
                const r = ROLES[p.role];
                return (
                  <View key={p.id} style={styles.revealRow}>
                    <MaterialCommunityIcons name={r.icon as any} size={22} color={r.alignment === 'good' ? theme.colors.successGlow : theme.colors.errorGlow} />
                    <Text style={styles.revealName}>{p.name}</Text>
                    <Text style={[styles.revealRole, { color: r.alignment === 'good' ? theme.colors.successGlow : theme.colors.errorGlow }]}>{r.name}</Text>
                  </View>
                );
              })}
              <View style={{ marginTop: 24 }}>
                <GoldButton testID="new-game-btn" title="Return to Menu" icon="home" onPress={backToMenu} />
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  return null;
}

function TopBar({ onBack, good, evil, mission, rejects }: any) {
  return (
    <View style={styles.topBar}>
      <Pressable testID="game-back-btn" onPress={onBack} style={{ padding: 4 }}>
        <MaterialCommunityIcons name="close" size={22} color={theme.colors.onSurface3} />
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={styles.chip}><MaterialCommunityIcons name="shield-check" size={14} color={theme.colors.successGlow} /><Text style={styles.chipText}>{good}</Text></View>
        <View style={styles.chip}><MaterialCommunityIcons name="skull" size={14} color={theme.colors.errorGlow} /><Text style={styles.chipText}>{evil}</Text></View>
        <View style={styles.chip}><MaterialCommunityIcons name="cards" size={14} color={theme.colors.gold} /><Text style={styles.chipText}>M{mission}</Text></View>
        <View style={styles.chip}><MaterialCommunityIcons name="cancel" size={14} color={theme.colors.warning} /><Text style={styles.chipText}>{rejects}/5</Text></View>
      </View>
    </View>
  );
}

function Handoff({ who, onReady, label }: { who: string; onReady: () => void; label: string }) {
  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <MaterialCommunityIcons name="cellphone-arrow-down" size={80} color={theme.colors.gold} />
        <OrnateTitle size={26} style={{ marginTop: 16 }}>Pass the Device</OrnateTitle>
        <Text style={{ color: theme.colors.onSurface2, marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
          {who}, take the device to {label}.
        </Text>
        <View style={{ marginTop: 30, width: '80%' }}>
          <GoldButton testID="handoff-ready-btn" title="I am ready" icon="check" onPress={onReady} />
        </View>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, gap: 4 },
  chipText: { color: theme.colors.parchment, fontSize: 12, fontWeight: '600' },
  tracker: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },
  trackerNode: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(26,26,34,0.7)', shadowRadius: 12, elevation: 5 },
  trackerNum: { fontFamily: 'serif', fontSize: 20 },
  doubleFail: { position: 'absolute', top: -6, right: -6, color: theme.colors.warning, fontSize: 10, fontWeight: '700', backgroundColor: theme.colors.surface, paddingHorizontal: 4, borderRadius: 6 },
  leaderBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface2, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: theme.colors.goldDark, gap: 8, marginTop: 4 },
  leaderText: { color: theme.colors.parchment, fontFamily: 'serif', fontSize: 15 },
  phaseTitle: { color: theme.colors.gold, textAlign: 'center', fontFamily: 'serif', fontSize: 18, marginTop: 14, letterSpacing: 1 },
  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 },
  pTile: { width: '30%', alignItems: 'center', margin: 4, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 },
  pTileOn: { borderColor: theme.colors.gold, shadowColor: theme.colors.gold, shadowOpacity: 0.5, shadowRadius: 8 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.colors.surface3, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.colors.gold, fontFamily: 'serif', fontSize: 20 },
  pName: { color: theme.colors.parchment, marginTop: 6, fontSize: 12 },
  sub: { color: theme.colors.onSurface2, marginTop: 6, fontStyle: 'italic' },
  teamChip: { backgroundColor: theme.colors.surface2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, margin: 3, borderWidth: 1, borderColor: theme.colors.gold },
  teamChipText: { color: theme.colors.parchment, fontSize: 12 },
  bigChoice: { height: 130, borderRadius: 16, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  bigChoiceText: { fontFamily: 'serif', fontSize: 22, letterSpacing: 3, marginTop: 8, fontWeight: '700' },
  forbidden: { color: theme.colors.onSurface3, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  voteConfirmed: { color: theme.colors.gold, fontFamily: 'serif', fontSize: 18, marginTop: 16 },
  tally: { textAlign: 'center', marginTop: 8, fontSize: 14, letterSpacing: 2 },
  voteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  voteName: { color: theme.colors.parchment, fontSize: 15 },
  voteBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  voteBadgeText: { color: '#F0EAD6', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  resultOrb: { width: 260, height: 260, borderRadius: 130, borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowOpacity: 0.7, shadowRadius: 30, elevation: 15 },
  resultText: { fontFamily: 'serif', fontSize: 18, letterSpacing: 3, marginTop: 10, fontWeight: '700' },
  failCount: { color: theme.colors.onSurface3, marginTop: 6, fontSize: 12 },
  reason: { color: theme.colors.onSurface2, textAlign: 'center', marginTop: 12, fontStyle: 'italic', paddingHorizontal: 20 },
  revealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12 },
  revealName: { color: theme.colors.parchment, fontSize: 15, flex: 1 },
  revealRole: { fontFamily: 'serif', fontSize: 15 },
});
