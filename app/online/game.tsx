import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { theme } from '@/src/theme';
import { ScreenBg, GoldButton, OrnateTitle, Card, Divider } from '@/src/components/ui';
import { ROLES, type RoleId } from '@/src/game/logic';
import { useGame } from '@/src/game/context';
import { BACKEND_WS } from '@/src/config';
import {
  parseServerEvent,
  sendClientMessage,
  type OnlineGameView,
  type RoleKnowledge,
} from '@/src/network/types';

const MAX_RECONNECT = 8;

export default function OnlineGame() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code: string; playerId: string; name: string }>();
  const { haptic } = useGame();

  const wsRef = useRef<WebSocket | null>(null);
  const aliveRef = useRef(true);
  const reconnectRef = useRef(0);
  const myIdRef = useRef(params.playerId);

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<{ role: RoleId; knowledge: RoleKnowledge } | null>(null);
  const [view, setView] = useState<OnlineGameView | null>(null);
  const [showRole, setShowRole] = useState(false);
  const [voteLocked, setVoteLocked] = useState(false);
  const [cardLocked, setCardLocked] = useState(false);
  const [assassinationTarget, setAssassinationTarget] = useState<string | null>(null);
  const [localTeam, setLocalTeam] = useState<string[]>([]);
  const teamKeyRef = useRef('');

  const send = useCallback((msg: Parameters<typeof sendClientMessage>[1]) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) sendClientMessage(ws, msg);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!aliveRef.current || !params.code) return;
      const ws = new WebSocket(`${BACKEND_WS}/api/ws/${params.code}`);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectRef.current = 0;
        setError('');
        sendClientMessage(ws, {
          type: 'join',
          name: params.name,
          player_id: myIdRef.current,
        });
      };

      ws.onmessage = (e) => {
        const evt = parseServerEvent(e.data as string);
        if (!evt) return;
        if (evt.event === 'joined') {
          setConnected(true);
          myIdRef.current = evt.payload.player_id;
        } else if (evt.event === 'role_assigned') {
          setRole({ role: evt.payload.role, knowledge: evt.payload.knowledge });
        } else if (evt.event === 'game_state') {
          setView(evt.payload);
          if (evt.payload.phase === 'vote' && !evt.payload.you.hasVoted) setVoteLocked(false);
          if (evt.payload.phase === 'mission' && !evt.payload.you.hasPlayedCard) setCardLocked(false);
          if (evt.payload.phase !== 'assassination') setAssassinationTarget(null);
        } else if (evt.event === 'error') {
          setError(evt.payload.message);
        }
      };

      ws.onerror = () => {
        if (aliveRef.current) setError('Connection error. Retrying…');
      };

      ws.onclose = () => {
        setConnected(false);
        if (!aliveRef.current) return;
        if (reconnectRef.current >= MAX_RECONNECT) {
          setError('Disconnected. Return to menu and rejoin with your player ID.');
          return;
        }
        const delay = Math.min(1000 * 2 ** reconnectRef.current, 8000);
        reconnectRef.current += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      aliveRef.current = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        wsRef.current?.close();
      } catch {
        /* noop */
      }
    };
  }, [params.code, params.name]);

  useEffect(() => {
    if (!view) return;
    const teamKey = `${view.currentMission}-${view.currentLeader}`;
    if (teamKeyRef.current !== teamKey) {
      teamKeyRef.current = teamKey;
      setLocalTeam([]);
    }
  }, [view?.currentMission, view?.currentLeader, view]);

  const leave = () => router.replace('/menu');

  if (!view || !role) {
    return (
      <ScreenBg>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.gold} />
          <Text style={styles.waitText}>{connected ? 'Summoning the realm…' : 'Connecting…'}</Text>
          {error ? <Text style={styles.err}>{error}</Text> : null}
        </SafeAreaView>
      </ScreenBg>
    );
  }

  const good = view.missionResults.filter((m) => m?.outcome === 'success').length;
  const evil = view.missionResults.filter((m) => m?.outcome === 'fail').length;
  const teamSize = view.config.missions[view.currentMission];
  const leader = view.players[view.currentLeader];
  const you = view.you;

  const Tracker = () => (
    <View style={styles.tracker}>
      {view.config.missions.map((size, i) => {
        const res = view.missionResults[i];
        const isCurrent = i === view.currentMission && !view.winner;
        const isDoubleFail = view.config.doubleFailMission === i + 1;
        const color = res
          ? res.outcome === 'success'
            ? theme.colors.successGlow
            : theme.colors.errorGlow
          : isCurrent
            ? theme.colors.gold
            : theme.colors.onSurface3;
        return (
          <View
            key={i}
            style={[styles.trackerNode, { borderColor: color, shadowColor: color, shadowOpacity: isCurrent ? 0.8 : 0.2 }]}
          >
            <Text style={[styles.trackerNum, { color }]}>{size}</Text>
            {res && (
              <MaterialCommunityIcons
                name={res.outcome === 'success' ? 'shield-check' : 'skull'}
                size={14}
                color={color}
                style={{ marginTop: 2 }}
              />
            )}
            {isDoubleFail && <Text style={styles.doubleFail}>2×</Text>}
          </View>
        );
      })}
    </View>
  );

  const RoleBanner = () => (
    <Pressable onPress={() => setShowRole((s) => !s)} style={styles.roleToggle}>
      <MaterialCommunityIcons name="eye-outline" size={16} color={theme.colors.gold} />
      <Text style={styles.roleToggleText}>{showRole ? 'Hide Role' : 'View Role'}</Text>
    </Pressable>
  );

  const RolePanel = () => {
    if (!showRole) return null;
    const info = ROLES[role.role];
    const isEvil = info.alignment === 'evil';
    return (
      <Card style={{ marginBottom: 12 }}>
        <View style={{ alignItems: 'center' }}>
          <MaterialCommunityIcons
            name={info.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={40}
            color={isEvil ? theme.colors.errorGlow : theme.colors.successGlow}
          />
          <Text style={[styles.roleName, { color: isEvil ? '#FFD6D6' : '#D4F0E0' }]}>{info.name}</Text>
          <Text style={styles.roleHint}>{role.knowledge.hint}</Text>
          {role.knowledge.sees.map((n, i) => (
            <Text key={i} style={styles.seen}>
              · {n} ·
            </Text>
          ))}
        </View>
      </Card>
    );
  };

  const TopBar = () => (
    <View style={styles.topBar}>
      <Pressable onPress={leave} style={{ padding: 4 }}>
        <MaterialCommunityIcons name="close" size={22} color={theme.colors.onSurface3} />
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {!connected && <ActivityIndicator size="small" color={theme.colors.gold} />}
        <View style={styles.chip}>
          <MaterialCommunityIcons name="shield-check" size={14} color={theme.colors.successGlow} />
          <Text style={styles.chipText}>{good}</Text>
        </View>
        <View style={styles.chip}>
          <MaterialCommunityIcons name="skull" size={14} color={theme.colors.errorGlow} />
          <Text style={styles.chipText}>{evil}</Text>
        </View>
        <View style={styles.chip}>
          <MaterialCommunityIcons name="cards" size={14} color={theme.colors.gold} />
          <Text style={styles.chipText}>M{view.currentMission + 1}</Text>
        </View>
        <View style={styles.chip}>
          <MaterialCommunityIcons name="cancel" size={14} color={theme.colors.warning} />
          <Text style={styles.chipText}>{view.proposeVoteCount}/5</Text>
        </View>
      </View>
    </View>
  );

  // ---------- Team Selection ----------
  if (view.phase === 'team_selection') {
    const toggle = (pid: string) => {
      if (!you.canProposeTeam) return;
      haptic('select');
      setLocalTeam((t) => {
        if (t.includes(pid)) return t.filter((x) => x !== pid);
        if (t.length >= teamSize) return t;
        return [...t, pid];
      });
    };

    const displayTeam = you.canProposeTeam ? localTeam : view.currentTeam;

    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 18 }}>
            <TopBar />
            <RoleBanner />
            <RolePanel />
            <Tracker />
            <View style={styles.leaderBanner}>
              <MaterialCommunityIcons name="crown" size={22} color={theme.colors.gold} />
              <Text style={styles.leaderText}>
                {leader.name} proposes a team of {teamSize}
              </Text>
            </View>
            {you.canProposeTeam ? (
              <Text style={styles.phaseTitle}>Select {teamSize} Champions</Text>
            ) : (
              <Text style={styles.waitPhase}>Waiting for {leader.name} to propose…</Text>
            )}
            <View style={styles.playerGrid}>
              {view.players.map((p) => {
                const on = displayTeam.includes(p.id);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => toggle(p.id)}
                    disabled={!you.canProposeTeam}
                    style={[styles.pTile, on && styles.pTileOn, !you.canProposeTeam && { opacity: 0.85 }]}
                  >
                    <View style={[styles.avatar, on && { borderColor: theme.colors.gold }]}>
                      <Text style={styles.avatarText}>{p.name[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.pName}>{p.name}</Text>
                    {p.id === leader.id && (
                      <MaterialCommunityIcons name="crown" size={14} color={theme.colors.gold} />
                    )}
                  </Pressable>
                );
              })}
            </View>
            {you.canProposeTeam && (
              <View style={{ marginTop: 20 }}>
                <GoldButton
                  title="Propose Team"
                  icon="hand-heart"
                  disabled={localTeam.length !== teamSize}
                  onPress={() => {
                    haptic('medium');
                    send({ type: 'propose_team', team: localTeam });
                  }}
                />
              </View>
            )}
            {error ? <Text style={styles.err}>{error}</Text> : null}
          </ScrollView>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  // ---------- Vote ----------
  if (view.phase === 'vote') {
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 20, flex: 1 }}>
            <TopBar />
            <RoleBanner />
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <OrnateTitle size={22}>Team Vote</OrnateTitle>
              <Text style={styles.sub}>Proposed team:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                {view.currentTeam.map((pid) => {
                  const p = view.players.find((x) => x.id === pid)!;
                  return (
                    <View key={pid} style={styles.teamChip}>
                      <Text style={styles.teamChipText}>{p.name}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.progress}>
                {view.votesCast}/{view.playerCount} votes cast
              </Text>
            </View>
            {you.hasVoted || voteLocked ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="check-decagram" size={72} color={theme.colors.gold} />
                <Text style={styles.voteConfirmed}>
                  {you.hasVoted ? 'Your vote is sealed.' : 'Vote submitted…'}
                </Text>
                <Text style={styles.sub}>Waiting for others…</Text>
              </View>
            ) : you.canVote ? (
              <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
                <Pressable
                  onPress={() => {
                    haptic('heavy');
                    setVoteLocked(true);
                    send({ type: 'cast_vote', vote: 'approve' });
                  }}
                  style={[styles.bigChoice, { borderColor: theme.colors.successGlow }]}
                >
                  <LinearGradient colors={['#0A2A1A', '#052014']} style={StyleSheet.absoluteFill} />
                  <MaterialCommunityIcons name="shield-check" size={56} color={theme.colors.successGlow} />
                  <Text style={[styles.bigChoiceText, { color: theme.colors.successGlow }]}>APPROVE</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    haptic('heavy');
                    setVoteLocked(true);
                    send({ type: 'cast_vote', vote: 'reject' });
                  }}
                  style={[styles.bigChoice, { borderColor: theme.colors.errorGlow }]}
                >
                  <LinearGradient colors={['#3A0A0A', '#1A0505']} style={StyleSheet.absoluteFill} />
                  <MaterialCommunityIcons name="skull" size={56} color={theme.colors.errorGlow} />
                  <Text style={[styles.bigChoiceText, { color: theme.colors.errorGlow }]}>REJECT</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={styles.waitPhase}>Waiting for votes…</Text>
              </View>
            )}
            {error ? <Text style={styles.err}>{error}</Text> : null}
          </View>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  // ---------- Vote Reveal ----------
  if (view.phase === 'vote_reveal' && view.lastVote) {
    const last = view.lastVote;
    const approves = Object.values(last.votes).filter((v) => v === 'approve').length;
    const rejects = Object.values(last.votes).filter((v) => v === 'reject').length;
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <TopBar />
            <OrnateTitle size={28} style={{ marginTop: 12 }}>
              {last.approved ? 'Team Approved' : 'Team Rejected'}
            </OrnateTitle>
            <Text
              style={[
                styles.tally,
                { color: last.approved ? theme.colors.successGlow : theme.colors.errorGlow },
              ]}
            >
              {approves} approve · {rejects} reject
            </Text>
            <Card style={{ marginTop: 20 }}>
              {view.players.map((p) => {
                const v = last.votes[p.id];
                return (
                  <View key={p.id} style={styles.voteRow}>
                    <Text style={styles.voteName}>{p.name}</Text>
                    {v ? (
                      <View
                        style={[
                          styles.voteBadge,
                          { backgroundColor: v === 'approve' ? theme.colors.good : theme.colors.evil },
                        ]}
                      >
                        <Text style={styles.voteBadgeText}>{v === 'approve' ? 'APPROVE' : 'REJECT'}</Text>
                      </View>
                    ) : (
                      <Text style={styles.sub}>—</Text>
                    )}
                  </View>
                );
              })}
            </Card>
            {you.canAdvance ? (
              <View style={{ marginTop: 24 }}>
                <GoldButton
                  title={last.approved ? 'Begin The Mission' : `Continue (${view.proposeVoteCount + 1}/5 rejects)`}
                  icon="arrow-right"
                  onPress={() => {
                    haptic(last.approved ? 'success' : 'error');
                    send({ type: 'advance_phase' });
                  }}
                />
              </View>
            ) : (
              <Text style={[styles.waitPhase, { marginTop: 20 }]}>Waiting for someone to continue…</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  // ---------- Mission ----------
  if (view.phase === 'mission') {
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 20, flex: 1 }}>
            <TopBar />
            <RoleBanner />
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <OrnateTitle size={22}>Mission {view.currentMission + 1}</OrnateTitle>
              <Text style={styles.progress}>
                {view.cardsPlayed}/{view.currentTeam.length} cards played
              </Text>
            </View>
            {you.hasPlayedCard || cardLocked ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="cards" size={72} color={theme.colors.gold} />
                <Text style={styles.voteConfirmed}>Your card is sealed.</Text>
                <Text style={styles.sub}>Waiting for the team…</Text>
              </View>
            ) : you.canPlayCard ? (
              <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
                <Text style={[styles.sub, { textAlign: 'center' }]}>Play thy mission card in secret.</Text>
                <Pressable
                  onPress={() => {
                    haptic('success');
                    setCardLocked(true);
                    send({ type: 'play_mission_card', card: 'success' });
                  }}
                  style={[styles.bigChoice, { borderColor: theme.colors.successGlow }]}
                >
                  <LinearGradient colors={['#0A2A1A', '#052014']} style={StyleSheet.absoluteFill} />
                  <MaterialCommunityIcons name="shield-check" size={56} color={theme.colors.successGlow} />
                  <Text style={[styles.bigChoiceText, { color: theme.colors.successGlow }]}>SUCCESS</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!you.isEvil) return;
                    haptic('error');
                    setCardLocked(true);
                    send({ type: 'play_mission_card', card: 'fail' });
                  }}
                  disabled={!you.isEvil}
                  style={[
                    styles.bigChoice,
                    { borderColor: theme.colors.errorGlow, opacity: you.isEvil ? 1 : 0.35 },
                  ]}
                >
                  <LinearGradient colors={['#3A0A0A', '#1A0505']} style={StyleSheet.absoluteFill} />
                  <MaterialCommunityIcons name="skull" size={56} color={theme.colors.errorGlow} />
                  <Text style={[styles.bigChoiceText, { color: theme.colors.errorGlow }]}>FAIL</Text>
                  {!you.isEvil && <Text style={styles.forbidden}>Only shadow may sabotage</Text>}
                </Pressable>
              </View>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={styles.waitPhase}>You are not on this mission. Waiting…</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  // ---------- Mission Reveal ----------
  if (view.phase === 'mission_reveal') {
    const res = view.missionResults[view.currentMission]!;
    const isSuccess = res.outcome === 'success';
    const failsCount = res.failCount ?? res.cards?.filter((c) => c === 'fail').length ?? 0;
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <TopBar />
            <Animated.View
              entering={ZoomIn.duration(700)}
              style={[
                styles.resultOrb,
                {
                  borderColor: isSuccess ? theme.colors.successGlow : theme.colors.errorGlow,
                  shadowColor: isSuccess ? theme.colors.successGlow : theme.colors.errorGlow,
                },
              ]}
            >
              <LinearGradient
                colors={isSuccess ? ['#0A2A1A', '#052014'] : ['#3A0A0A', '#1A0505']}
                style={StyleSheet.absoluteFill}
              />
              <MaterialCommunityIcons
                name={isSuccess ? 'shield-check' : 'skull'}
                size={120}
                color={isSuccess ? theme.colors.successGlow : theme.colors.errorGlow}
              />
              <Text
                style={[
                  styles.resultText,
                  { color: isSuccess ? theme.colors.successGlow : theme.colors.errorGlow },
                ]}
              >
                {isSuccess ? 'MISSION SUCCESS' : 'MISSION FAILED'}
              </Text>
              <Text style={styles.failCount}>
                {failsCount} sabotage card{failsCount === 1 ? '' : 's'} played
              </Text>
            </Animated.View>
            {you.canAdvance ? (
              <View style={{ marginTop: 40, width: '90%' }}>
                <GoldButton
                  title="Continue"
                  icon="arrow-right"
                  onPress={() => {
                    haptic('medium');
                    send({ type: 'advance_phase' });
                  }}
                />
              </View>
            ) : (
              <Text style={[styles.waitPhase, { marginTop: 24 }]}>Waiting for someone to continue…</Text>
            )}
          </View>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  // ---------- Assassination ----------
  if (view.phase === 'assassination') {
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <TopBar />
            <OrnateTitle size={26}>The Final Strike</OrnateTitle>
            {you.canAssassinate ? (
              <>
                <Text style={[styles.sub, { textAlign: 'center', marginTop: 10 }]}>
                  The Realm has claimed three victories. Name the Seer.
                </Text>
                <Text style={[styles.phaseTitle, { marginTop: 20 }]}>Choose thy target:</Text>
                <View style={styles.playerGrid}>
                  {view.players.map((p) => {
                    const on = assassinationTarget === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          haptic('select');
                          setAssassinationTarget(p.id);
                        }}
                        style={[styles.pTile, on && { borderColor: theme.colors.errorGlow }]}
                      >
                        <View style={[styles.avatar, on && { borderColor: theme.colors.errorGlow }]}>
                          <Text style={styles.avatarText}>{p.name[0]?.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.pName}>{p.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={{ marginTop: 20 }}>
                  <GoldButton
                    title="Strike"
                    icon="knife-military"
                    variant="danger"
                    disabled={!assassinationTarget}
                    onPress={() => {
                      haptic('heavy');
                      if (assassinationTarget) send({ type: 'assassinate', target_id: assassinationTarget });
                    }}
                  />
                </View>
              </>
            ) : (
              <Text style={[styles.waitPhase, { marginTop: 20, textAlign: 'center' }]}>
                The Assassin chooses their target…
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  // ---------- Endgame ----------
  if (view.phase === 'endgame') {
    const goodWon = view.winner === 'good';
    return (
      <ScreenBg>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Animated.View entering={FadeIn.duration(800)}>
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <MaterialCommunityIcons
                  name={goodWon ? 'trophy' : 'skull-crossbones'}
                  size={100}
                  color={goodWon ? theme.colors.gold : theme.colors.errorGlow}
                />
                <OrnateTitle
                  size={32}
                  style={{ marginTop: 12, color: goodWon ? theme.colors.gold : theme.colors.errorGlow }}
                >
                  {goodWon ? 'The Realm Prevails' : 'Shadow Consumes All'}
                </OrnateTitle>
                <Text style={styles.reason}>{view.winReason}</Text>
              </View>
              <Divider text="Roles Revealed" />
              {view.players.map((p) => {
                const r = p.role ? ROLES[p.role] : null;
                if (!r) return null;
                return (
                  <View key={p.id} style={styles.revealRow}>
                    <MaterialCommunityIcons
                      name={r.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                      size={22}
                      color={r.alignment === 'good' ? theme.colors.successGlow : theme.colors.errorGlow}
                    />
                    <Text style={styles.revealName}>{p.name}</Text>
                    <Text
                      style={[
                        styles.revealRole,
                        { color: r.alignment === 'good' ? theme.colors.successGlow : theme.colors.errorGlow },
                      ]}
                    >
                      {r.name}
                    </Text>
                  </View>
                );
              })}
              <View style={{ marginTop: 24 }}>
                <GoldButton title="Return to Menu" icon="home" onPress={leave} />
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </ScreenBg>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  waitText: { color: theme.colors.onSurface2, marginTop: 16, fontStyle: 'italic' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  chipText: { color: theme.colors.parchment, fontSize: 12, fontWeight: '600' },
  tracker: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },
  trackerNode: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,26,34,0.7)',
    shadowRadius: 12,
    elevation: 5,
  },
  trackerNum: { fontFamily: 'serif', fontSize: 20 },
  doubleFail: {
    position: 'absolute',
    top: -6,
    right: -6,
    color: theme.colors.warning,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  leaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface2,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.goldDark,
    gap: 8,
    marginTop: 4,
  },
  leaderText: { color: theme.colors.parchment, fontFamily: 'serif', fontSize: 15 },
  phaseTitle: {
    color: theme.colors.gold,
    textAlign: 'center',
    fontFamily: 'serif',
    fontSize: 18,
    marginTop: 14,
    letterSpacing: 1,
  },
  waitPhase: { color: theme.colors.onSurface3, textAlign: 'center', fontStyle: 'italic', marginTop: 14 },
  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 },
  pTile: {
    width: '30%',
    alignItems: 'center',
    margin: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface2,
  },
  pTileOn: { borderColor: theme.colors.gold, shadowColor: theme.colors.gold, shadowOpacity: 0.5, shadowRadius: 8 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.surface3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: theme.colors.gold, fontFamily: 'serif', fontSize: 20 },
  pName: { color: theme.colors.parchment, marginTop: 6, fontSize: 12 },
  sub: { color: theme.colors.onSurface2, marginTop: 6, fontStyle: 'italic' },
  progress: { color: theme.colors.onSurface3, marginTop: 10, fontSize: 12 },
  teamChip: {
    backgroundColor: theme.colors.surface2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    margin: 3,
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  teamChipText: { color: theme.colors.parchment, fontSize: 12 },
  bigChoice: {
    height: 130,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigChoiceText: { fontFamily: 'serif', fontSize: 22, letterSpacing: 3, marginTop: 8, fontWeight: '700' },
  forbidden: { color: theme.colors.onSurface3, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  voteConfirmed: { color: theme.colors.gold, fontFamily: 'serif', fontSize: 18, marginTop: 16 },
  tally: { textAlign: 'center', marginTop: 8, fontSize: 14, letterSpacing: 2 },
  voteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  voteName: { color: theme.colors.parchment, fontSize: 15 },
  voteBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  voteBadgeText: { color: '#F0EAD6', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  resultOrb: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 15,
  },
  resultText: { fontFamily: 'serif', fontSize: 18, letterSpacing: 3, marginTop: 10, fontWeight: '700' },
  failCount: { color: theme.colors.onSurface3, marginTop: 6, fontSize: 12 },
  reason: {
    color: theme.colors.onSurface2,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  revealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    gap: 12,
  },
  revealName: { color: theme.colors.parchment, fontSize: 15, flex: 1 },
  revealRole: { fontFamily: 'serif', fontSize: 15 },
  err: { color: theme.colors.errorGlow, marginTop: 10, textAlign: 'center' },
  roleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  roleToggleText: { color: theme.colors.gold, fontSize: 12, letterSpacing: 1 },
  roleName: { fontFamily: 'serif', fontSize: 20, marginTop: 8 },
  roleHint: { color: theme.colors.gold, fontSize: 12, marginTop: 8, textAlign: 'center' },
  seen: { color: theme.colors.parchment, fontFamily: 'serif', fontSize: 14, marginTop: 4 },
});
