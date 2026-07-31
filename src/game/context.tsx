import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, initialGameState, computeMissionOutcome } from './logic';
import * as Haptics from 'expo-haptics';
import { initAudio, playSound, setSoundEnabled, type SoundKind } from '@/src/audio';

interface Settings {
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  advancedRoles: boolean;
}

export interface HistoryEntry {
  id: string;
  date: string;
  players: string[];
  winner: 'good' | 'evil';
  reason: string;
  missions: ('success' | 'fail' | 'skipped')[];
}

export interface PnPSession {
  game: GameState;
  playerNames: string[];
  advancedRoles: boolean;
  revealComplete: boolean;
  revealIndex: number;
}

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'select';

interface Ctx {
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  history: HistoryEntry[];
  clearHistory: () => void;
  game: GameState | null;
  pnpSession: PnPSession | null;
  sessionLoaded: boolean;
  startPnP: (names: string[]) => void;
  rematchPnP: () => void;
  resumePnP: () => '/pnp/reveal' | '/pnp/game' | null;
  setRevealIndex: (idx: number) => void;
  completeReveal: () => void;
  setPhase: (p: GameState['phase']) => void;
  toggleTeamMember: (pid: string) => void;
  confirmTeam: () => void;
  castVote: (v: 'approve' | 'reject') => void;
  nextVoter: () => void;
  playMissionCard: (v: 'success' | 'fail') => void;
  nextMissionActor: () => void;
  resolveMission: () => void;
  advanceAfterMission: () => void;
  chooseAssassinationTarget: (pid: string) => void;
  confirmAssassination: () => void;
  continueAfterVoteReveal: () => void;
  resetGame: () => void;
  haptic: (t: HapticKind) => void;
  sound: (t: SoundKind) => void;
}

const GameContext = createContext<Ctx | null>(null);

const HISTORY_KEY = 'ros:history';
const SETTINGS_KEY = 'ros:settings';
const PNP_SESSION_KEY = 'ros:pnp:session';
const PNP_TIP_KEY = 'ros:pnp:tip-seen';

const DEFAULT_SETTINGS: Settings = {
  hapticsEnabled: true,
  soundEnabled: true,
  advancedRoles: true,
};

async function persistSession(session: PnPSession | null) {
  if (session) {
    await AsyncStorage.setItem(PNP_SESSION_KEY, JSON.stringify(session));
  } else {
    await AsyncStorage.removeItem(PNP_SESSION_KEY);
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [game, setGame] = useState<GameState | null>(null);
  const [pnpSession, setPnpSession] = useState<PnPSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const settingsRef = useRef(settings);
  const historyRef = useRef(history);
  const pnpSessionRef = useRef(pnpSession);
  settingsRef.current = settings;
  historyRef.current = history;
  pnpSessionRef.current = pnpSession;

  const syncSession = useCallback((nextGame: GameState | null, patch?: Partial<PnPSession>) => {
    if (!nextGame) {
      pnpSessionRef.current = null;
      setPnpSession(null);
      void persistSession(null);
      return;
    }
    const prev = pnpSessionRef.current;
    const session: PnPSession = {
      game: nextGame,
      playerNames: patch?.playerNames ?? prev?.playerNames ?? nextGame.players.map((p) => p.name),
      advancedRoles: patch?.advancedRoles ?? prev?.advancedRoles ?? settingsRef.current.advancedRoles,
      revealComplete: patch?.revealComplete ?? prev?.revealComplete ?? false,
      revealIndex: patch?.revealIndex ?? prev?.revealIndex ?? 0,
    };
    pnpSessionRef.current = session;
    setPnpSession(session);
    void persistSession(session);
  }, []);

  useEffect(() => {
    void initAudio();
    let cancelled = false;
    (async () => {
      try {
        const [s, h, pnp] = await Promise.all([
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(HISTORY_KEY),
          AsyncStorage.getItem(PNP_SESSION_KEY),
        ]);
        if (cancelled) return;
        if (s) {
          const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(s) };
          setSettings(parsed);
          setSoundEnabled(parsed.soundEnabled);
        }
        if (h) setHistory(JSON.parse(h));
        if (pnp) {
          const session: PnPSession = JSON.parse(pnp);
          pnpSessionRef.current = session;
          setPnpSession(session);
          setGame(session.game);
        }
      } catch {
        /* ignore corrupt storage */
      } finally {
        if (!cancelled) setSessionLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback((s: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...s };
    settingsRef.current = next;
    setSettings(next);
    if (s.soundEnabled !== undefined) setSoundEnabled(next.soundEnabled);
    void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }, []);

  const saveHistory = useCallback((entry: HistoryEntry) => {
    const next = [entry, ...historyRef.current].slice(0, 50);
    historyRef.current = next;
    setHistory(next);
    void AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setHistory([]);
    void AsyncStorage.removeItem(HISTORY_KEY);
  }, []);

  const haptic = useCallback((t: HapticKind) => {
    if (!settingsRef.current.hapticsEnabled) return;
    try {
      switch (t) {
        case 'light':
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'select':
          void Haptics.selectionAsync();
          break;
      }
    } catch {
      /* haptics unavailable */
    }
  }, []);

  const sound = useCallback((t: SoundKind) => {
    void playSound(t);
  }, []);

  const applyGame = useCallback(
    (updater: (g: GameState | null) => GameState | null, patch?: Partial<PnPSession>) => {
      setGame((prev) => {
        const next = updater(prev);
        if (next) syncSession(next, patch);
        else syncSession(null);
        return next;
      });
    },
    [syncSession],
  );

  const startPnP = useCallback(
    (names: string[]) => {
      const advanced = settingsRef.current.advancedRoles;
      const next = initialGameState(names, advanced);
      setGame(next);
      syncSession(next, {
        playerNames: names,
        advancedRoles: advanced,
        revealComplete: false,
        revealIndex: 0,
      });
    },
    [syncSession],
  );

  const rematchPnP = useCallback(() => {
    const prev = pnpSessionRef.current;
    const names = prev?.playerNames ?? game?.players.map((p) => p.name);
    if (!names?.length) return;
    const advanced = prev?.advancedRoles ?? settingsRef.current.advancedRoles;
    const next = initialGameState(names, advanced);
    setGame(next);
    syncSession(next, {
      playerNames: names,
      advancedRoles: advanced,
      revealComplete: false,
      revealIndex: 0,
    });
  }, [game, syncSession]);

  const resumePnP = useCallback((): '/pnp/reveal' | '/pnp/game' | null => {
    const session = pnpSessionRef.current;
    if (!session) return null;
    setGame(session.game);
    return session.revealComplete ? '/pnp/game' : '/pnp/reveal';
  }, []);

  const setRevealIndex = useCallback(
    (idx: number) => {
      const session = pnpSessionRef.current;
      if (!session) return;
      syncSession(session.game, { revealIndex: idx });
    },
    [syncSession],
  );

  const completeReveal = useCallback(() => {
    const session = pnpSessionRef.current;
    if (!session) return;
    syncSession(session.game, { revealComplete: true });
  }, [syncSession]);

  const setPhase = useCallback(
    (p: GameState['phase']) => {
      applyGame((g) => (g ? { ...g, phase: p } : g));
    },
    [applyGame],
  );

  const toggleTeamMember = useCallback(
    (pid: string) => {
      applyGame((g) => {
        if (!g) return g;
        const teamSize = g.config.missions[g.currentMission];
        let team = g.currentTeam;
        if (team.includes(pid)) team = team.filter((x) => x !== pid);
        else if (team.length < teamSize) team = [...team, pid];
        else return g;
        return { ...g, currentTeam: team };
      });
    },
    [applyGame],
  );

  const confirmTeam = useCallback(() => {
    applyGame((g) => (g ? { ...g, phase: 'vote', currentVote: {}, currentVoter: 0 } : g));
  }, [applyGame]);

  const castVote = useCallback(
    (v: 'approve' | 'reject') => {
      applyGame((g) => {
        if (!g) return g;
        const voterId = g.players[g.currentVoter].id;
        return { ...g, currentVote: { ...g.currentVote, [voterId]: v } };
      });
    },
    [applyGame],
  );

  const nextVoter = useCallback(() => {
    applyGame((g) => {
      if (!g) return g;
      if (g.currentVoter + 1 >= g.players.length) {
        const approves = Object.values(g.currentVote).filter((v) => v === 'approve').length;
        const approved = approves > g.players.length / 2;
        return {
          ...g,
          phase: 'vote_reveal',
          voteHistory: [
            ...g.voteHistory,
            {
              proposerIndex: g.currentLeader,
              team: g.currentTeam,
              votes: g.currentVote,
              approved,
            },
          ],
        };
      }
      return { ...g, currentVoter: g.currentVoter + 1 };
    });
  }, [applyGame]);

  const playMissionCard = useCallback(
    (v: 'success' | 'fail') => {
      applyGame((g) => {
        if (!g) return g;
        const pid = g.currentTeam[g.currentMissionActor];
        return { ...g, currentMissionCards: { ...g.currentMissionCards, [pid]: v } };
      });
    },
    [applyGame],
  );

  const nextMissionActor = useCallback(() => {
    applyGame((g) => {
      if (!g) return g;
      if (g.currentMissionActor + 1 >= g.currentTeam.length) {
        return { ...g, phase: 'mission_reveal' };
      }
      return { ...g, currentMissionActor: g.currentMissionActor + 1 };
    });
  }, [applyGame]);

  const resolveMission = useCallback(() => {
    applyGame((g) => {
      if (!g) return g;
      const cards = g.currentTeam.map((pid) => g.currentMissionCards[pid]);
      const outcome = computeMissionOutcome(g, cards);
      const results = [...g.missionResults];
      results[g.currentMission] = { team: g.currentTeam, cards, outcome };
      return { ...g, missionResults: results };
    });
  }, [applyGame]);

  const advanceAfterMission = useCallback(() => {
    applyGame((g) => {
      if (!g) return g;
      const good = g.missionResults.filter((m) => m?.outcome === 'success').length;
      const evil = g.missionResults.filter((m) => m?.outcome === 'fail').length;
      if (evil >= 3) {
        saveHistory({
          id: `${Date.now()}`,
          date: new Date().toISOString(),
          players: g.players.map((p) => p.name),
          winner: 'evil',
          reason: 'Three missions sabotaged.',
          missions: g.missionResults.map((m) => m?.outcome ?? 'skipped'),
        });
        return { ...g, phase: 'endgame', winner: 'evil', winReason: 'Three missions sabotaged.' };
      }
      if (good >= 3) {
        return { ...g, phase: 'assassination', assassinationTarget: null };
      }
      return {
        ...g,
        currentMission: g.currentMission + 1,
        currentLeader: (g.currentLeader + 1) % g.players.length,
        currentTeam: [],
        currentVote: {},
        currentMissionCards: {},
        currentVoter: 0,
        currentMissionActor: 0,
        proposeVoteCount: 0,
        phase: 'team_selection',
      };
    });
  }, [applyGame, saveHistory]);

  const chooseAssassinationTarget = useCallback(
    (pid: string) => {
      applyGame((g) => (g ? { ...g, assassinationTarget: pid } : g));
    },
    [applyGame],
  );

  const confirmAssassination = useCallback(() => {
    applyGame((g) => {
      if (!g || !g.assassinationTarget) return g;
      const target = g.players.find((p) => p.id === g.assassinationTarget);
      const evilWins = target?.role === 'seer';
      const winner: 'good' | 'evil' = evilWins ? 'evil' : 'good';
      const reason = evilWins
        ? `The Assassin struck true — ${target?.name} was the Seer.`
        : `The Assassin's blade missed — ${target?.name} was not the Seer.`;
      saveHistory({
        id: `${Date.now()}`,
        date: new Date().toISOString(),
        players: g.players.map((p) => p.name),
        winner,
        reason,
        missions: g.missionResults.map((m) => m?.outcome ?? 'skipped'),
      });
      return { ...g, phase: 'endgame', winner, winReason: reason };
    });
  }, [applyGame, saveHistory]);

  const continueAfterVoteReveal = useCallback(() => {
    applyGame((g) => {
      if (!g) return g;
      const last = g.voteHistory[g.voteHistory.length - 1];
      if (!last) return g;
      if (last.approved) {
        return { ...g, phase: 'mission', currentMissionCards: {}, currentMissionActor: 0 };
      }
      const rejects = g.proposeVoteCount + 1;
      if (rejects >= 5) {
        saveHistory({
          id: `${Date.now()}`,
          date: new Date().toISOString(),
          players: g.players.map((p) => p.name),
          winner: 'evil',
          reason: 'Five consecutive rejected proposals.',
          missions: g.missionResults.map((m) => m?.outcome ?? 'skipped'),
        });
        return {
          ...g,
          phase: 'endgame',
          winner: 'evil',
          winReason: 'Five consecutive rejected proposals.',
        };
      }
      return {
        ...g,
        currentLeader: (g.currentLeader + 1) % g.players.length,
        currentTeam: [],
        currentVote: {},
        currentVoter: 0,
        proposeVoteCount: rejects,
        phase: 'team_selection',
      };
    });
  }, [applyGame, saveHistory]);

  const resetGame = useCallback(() => {
    setGame(null);
    syncSession(null);
  }, [syncSession]);

  const value: Ctx = {
    settings,
    updateSettings,
    history,
    clearHistory,
    game,
    pnpSession,
    sessionLoaded,
    startPnP,
    rematchPnP,
    resumePnP,
    setRevealIndex,
    completeReveal,
    setPhase,
    toggleTeamMember,
    confirmTeam,
    castVote,
    nextVoter,
    playMissionCard,
    nextMissionActor,
    resolveMission,
    advanceAfterMission,
    chooseAssassinationTarget,
    confirmAssassination,
    continueAfterVoteReveal,
    resetGame,
    haptic,
    sound,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const c = useContext(GameContext);
  if (!c) throw new Error('useGame must be inside GameProvider');
  return c;
}

export { PNP_TIP_KEY };
