import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, initialGameState, computeMissionOutcome } from './logic';
import * as Haptics from 'expo-haptics';

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

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'select';

interface Ctx {
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  history: HistoryEntry[];
  clearHistory: () => void;
  game: GameState | null;
  startPnP: (names: string[]) => void;
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
}

const GameContext = createContext<Ctx | null>(null);

const HISTORY_KEY = 'ros:history';
const SETTINGS_KEY = 'ros:settings';

const DEFAULT_SETTINGS: Settings = {
  hapticsEnabled: true,
  soundEnabled: true,
  advancedRoles: true,
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [game, setGame] = useState<GameState | null>(null);
  const settingsRef = useRef(settings);
  const historyRef = useRef(history);
  settingsRef.current = settings;
  historyRef.current = history;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, h] = await Promise.all([
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(HISTORY_KEY),
        ]);
        if (cancelled) return;
        if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
        if (h) setHistory(JSON.parse(h));
      } catch {
        /* ignore corrupt storage */
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

  const startPnP = useCallback((names: string[]) => {
    setGame(initialGameState(names, settingsRef.current.advancedRoles));
  }, []);

  const setPhase = useCallback((p: GameState['phase']) => {
    setGame((g) => (g ? { ...g, phase: p } : g));
  }, []);

  const toggleTeamMember = useCallback((pid: string) => {
    setGame((g) => {
      if (!g) return g;
      const teamSize = g.config.missions[g.currentMission];
      let team = g.currentTeam;
      if (team.includes(pid)) team = team.filter((x) => x !== pid);
      else if (team.length < teamSize) team = [...team, pid];
      else return g;
      return { ...g, currentTeam: team };
    });
  }, []);

  const confirmTeam = useCallback(() => {
    setGame((g) => (g ? { ...g, phase: 'vote', currentVote: {}, currentVoter: 0 } : g));
  }, []);

  const castVote = useCallback((v: 'approve' | 'reject') => {
    setGame((g) => {
      if (!g) return g;
      const voterId = g.players[g.currentVoter].id;
      return { ...g, currentVote: { ...g.currentVote, [voterId]: v } };
    });
  }, []);

  const nextVoter = useCallback(() => {
    setGame((g) => {
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
  }, []);

  const playMissionCard = useCallback((v: 'success' | 'fail') => {
    setGame((g) => {
      if (!g) return g;
      const pid = g.currentTeam[g.currentMissionActor];
      return { ...g, currentMissionCards: { ...g.currentMissionCards, [pid]: v } };
    });
  }, []);

  const nextMissionActor = useCallback(() => {
    setGame((g) => {
      if (!g) return g;
      if (g.currentMissionActor + 1 >= g.currentTeam.length) {
        return { ...g, phase: 'mission_reveal' };
      }
      return { ...g, currentMissionActor: g.currentMissionActor + 1 };
    });
  }, []);

  const resolveMission = useCallback(() => {
    setGame((g) => {
      if (!g) return g;
      const cards = g.currentTeam.map((pid) => g.currentMissionCards[pid]);
      const outcome = computeMissionOutcome(g, cards);
      const results = [...g.missionResults];
      results[g.currentMission] = { team: g.currentTeam, cards, outcome };
      return { ...g, missionResults: results };
    });
  }, []);

  const advanceAfterMission = useCallback(() => {
    setGame((g) => {
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
        return { ...g, phase: 'assassination' };
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
  }, [saveHistory]);

  const chooseAssassinationTarget = useCallback((pid: string) => {
    setGame((g) => (g ? { ...g, assassinationTarget: pid } : g));
  }, []);

  const confirmAssassination = useCallback(() => {
    setGame((g) => {
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
  }, [saveHistory]);

  const continueAfterVoteReveal = useCallback(() => {
    setGame((g) => {
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
  }, [saveHistory]);

  const resetGame = useCallback(() => setGame(null), []);

  const value: Ctx = {
    settings,
    updateSettings,
    history,
    clearHistory,
    game,
    startPnP,
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
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const c = useContext(GameContext);
  if (!c) throw new Error('useGame must be inside GameProvider');
  return c;
}
