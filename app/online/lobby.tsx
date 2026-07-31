import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import { ScreenBg, GoldButton, OrnateTitle, Divider, Content } from '@/src/components/ui';
import { useGame } from '@/src/game/context';
import { BACKEND_WS } from '@/src/config';
import { useResponsive } from '@/src/hooks/useResponsive';
import { parseServerEvent } from '@/src/network/types';

type Player = { id: string; name: string; is_host: boolean; connected: boolean };

const MAX_RECONNECT = 5;

export default function Lobby() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code: string; playerId?: string; name: string; isHost: string }>();
  const { haptic } = useGame();
  const { pad, isCompact } = useResponsive();
  const isHost = params.isHost === '1';
  const wsRef = useRef<WebSocket | null>(null);
  const myIdRef = useRef<string | null>(params.playerId || null);
  const aliveRef = useRef(true);
  const reconnectRef = useRef(0);
  const gameStartedRef = useRef(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [myId, setMyId] = useState<string | null>(params.playerId || null);

  useEffect(() => {
    aliveRef.current = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!aliveRef.current || !params.code) return;
      const url = `${BACKEND_WS}/api/ws/${params.code}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectRef.current = 0;
        setError('');
        ws.send(
          JSON.stringify({
            type: 'join',
            name: params.name,
            is_host: isHost,
            player_id: myIdRef.current || undefined,
          }),
        );
      };

      ws.onmessage = (e) => {
        const evt = parseServerEvent(e.data as string);
        if (!evt) return;
        if (evt.event === 'joined') {
          setConnected(true);
          myIdRef.current = evt.payload.player_id;
          setMyId(evt.payload.player_id);
        } else if (evt.event === 'lobby') {
          setPlayers(evt.payload.players);
        } else if (evt.event === 'game_started') {
          gameStartedRef.current = true;
          const pid = myIdRef.current || params.playerId;
          router.replace(
            `/online/game?code=${encodeURIComponent(params.code)}&playerId=${encodeURIComponent(pid || '')}&name=${encodeURIComponent(params.name)}` as never,
          );
        } else if (evt.event === 'error') {
          setError(evt.payload.message);
        }
      };

      ws.onerror = () => {
        if (aliveRef.current) setError('Connection error. Retrying…');
      };

      ws.onclose = () => {
        setConnected(false);
        if (!aliveRef.current || gameStartedRef.current) return;
        if (reconnectRef.current >= MAX_RECONNECT) {
          setError('Disconnected. Return to menu and rejoin.');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code, params.name, isHost]);

  const startGame = () => {
    if (players.length < 5 || players.length > 10) {
      setError('Need 5 to 10 players to begin.');
      return;
    }
    haptic('heavy');
    wsRef.current?.send(JSON.stringify({ type: 'start_game' }));
  };

  const shareCode = async () => {
    haptic('select');
    try {
      await Share.share({ message: `Join my Realm of Shadows game! Code: ${params.code}` });
    } catch {
      /* cancelled */
    }
  };

  return (
    <ScreenBg>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: pad }} showsVerticalScrollIndicator={false}>
          <Content pad={0}>
            <View style={styles.header}>
              <Pressable
                testID="back-btn"
                onPress={() => router.replace('/menu')}
                style={{ padding: 4 }}
              >
                <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.gold} />
              </Pressable>
              <OrnateTitle size={22}>Grand Hall</OrnateTitle>
              <View style={{ width: 32 }} />
            </View>

            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <Text style={styles.codeLabel}>ROOM CODE</Text>
              <Pressable testID="room-code-share" onPress={() => void shareCode()}>
                <Text style={[styles.code, isCompact && { fontSize: 48, letterSpacing: 10 }]}>
                  {params.code}
                </Text>
              </Pressable>
              <Text style={styles.tapShare}>Tap to share</Text>
            </View>

            <View style={styles.statusRow}>
              {connected ? (
                <>
                  <MaterialCommunityIcons name="access-point" size={14} color={theme.colors.successGlow} />
                  <Text style={styles.statusText}>Connected</Text>
                </>
              ) : (
                <>
                  <ActivityIndicator size="small" color={theme.colors.gold} />
                  <Text style={styles.statusText}>Connecting...</Text>
                </>
              )}
            </View>

            <Divider text={`Players (${players.length}/10)`} />

            <View style={styles.grid}>
              {players.map((p) => (
                <View
                  key={p.id}
                  style={[styles.pTile, p.id === myId && { borderColor: theme.colors.gold }]}
                  testID={`player-tile-${p.name}`}
                >
                  <View
                    style={[
                      styles.avatar,
                      p.is_host && { borderColor: theme.colors.gold, borderWidth: 2 },
                    ]}
                  >
                    <Text style={styles.avatarText}>{p.name[0]?.toUpperCase() || '?'}</Text>
                    {p.is_host && (
                      <MaterialCommunityIcons
                        name="crown"
                        size={14}
                        color={theme.colors.gold}
                        style={{ position: 'absolute', top: -6, right: -6 }}
                      />
                    )}
                  </View>
                  <Text style={styles.pName}>{p.name}</Text>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: p.connected
                          ? theme.colors.successGlow
                          : theme.colors.onSurface3,
                      },
                    ]}
                  />
                </View>
              ))}
              {Array.from({ length: Math.max(0, 5 - players.length) }).map((_, i) => (
                <View key={`ghost-${i}`} style={[styles.pTile, styles.ghost]}>
                  <View style={[styles.avatar, styles.avatarGhost]}>
                    <MaterialCommunityIcons
                      name="account-question"
                      size={22}
                      color={theme.colors.onSurface3}
                    />
                  </View>
                  <Text style={styles.pNameGhost}>Empty</Text>
                </View>
              ))}
            </View>

            {error ? (
              <Text style={styles.err} testID="lobby-error">
                {error}
              </Text>
            ) : null}

            {isHost && (
              <View style={{ marginTop: 24 }}>
                <GoldButton
                  testID="start-online-game-btn"
                  title="Begin The Game"
                  icon="cards-playing"
                  onPress={startGame}
                  disabled={players.length < 5}
                />
                {players.length < 5 && (
                  <Text style={styles.hint}>
                    {5 - players.length} more player{5 - players.length === 1 ? '' : 's'} needed.
                  </Text>
                )}
              </View>
            )}
            {!isHost && <Text style={styles.hint}>Waiting for the host to begin...</Text>}
          </Content>
        </ScrollView>
      </SafeAreaView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeLabel: { color: theme.colors.onSurface3, letterSpacing: 4, fontSize: 11 },
  code: {
    fontFamily: 'serif',
    color: theme.colors.gold,
    fontSize: 64,
    letterSpacing: 14,
    marginTop: 6,
    textShadowColor: '#D4AF3766',
    textShadowRadius: 20,
  },
  tapShare: { color: theme.colors.onSurface3, fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  statusText: { color: theme.colors.onSurface2, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  pTile: {
    width: '30%',
    alignItems: 'center',
    margin: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface2,
  },
  ghost: { opacity: 0.5 },
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
  avatarGhost: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  avatarText: { color: theme.colors.gold, fontFamily: 'serif', fontSize: 20 },
  pName: { color: theme.colors.parchment, marginTop: 6, fontSize: 12 },
  pNameGhost: { color: theme.colors.onSurface3, marginTop: 6, fontSize: 12, fontStyle: 'italic' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  err: { color: theme.colors.errorGlow, marginTop: 10, textAlign: 'center' },
  hint: {
    color: theme.colors.onSurface3,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    fontSize: 12,
  },
});
