import type { GamePhase, RoleId } from '@/src/game/logic';

/** WebSocket client → server message types */
export type ClientMessage =
  | { type: 'join'; name: string; is_host?: boolean; player_id?: string }
  | { type: 'start_game' }
  | { type: 'propose_team'; team: string[] }
  | { type: 'cast_vote'; vote: 'approve' | 'reject' }
  | { type: 'advance_phase' }
  | { type: 'play_mission_card'; card: 'success' | 'fail' }
  | { type: 'assassinate'; target_id: string }
  | { type: 'ping' };

/** Server → client event payloads */
export interface LobbyPlayer {
  id: string;
  name: string;
  is_host: boolean;
  connected: boolean;
}

export interface OnlineMissionResult {
  team: string[];
  outcome: 'success' | 'fail';
  cards?: ('success' | 'fail')[];
  failCount?: number;
}

export interface OnlineLastVote {
  proposerIndex: number;
  team: string[];
  votes: Record<string, 'approve' | 'reject'>;
  approved: boolean;
}

export interface OnlinePublicPlayer {
  id: string;
  name: string;
  role?: RoleId;
}

export interface OnlineYouView {
  id: string;
  isLeader: boolean;
  isOnTeam: boolean;
  hasVoted: boolean;
  hasPlayedCard: boolean;
  canProposeTeam: boolean;
  canVote: boolean;
  canPlayCard: boolean;
  canAdvance: boolean;
  canAssassinate: boolean;
  isEvil: boolean;
}

export interface OnlineGameView {
  players: OnlinePublicPlayer[];
  playerCount: number;
  config: { missions: number[]; doubleFailMission: number | null };
  currentMission: number;
  currentLeader: number;
  proposeVoteCount: number;
  currentTeam: string[];
  phase: GamePhase;
  missionResults: (OnlineMissionResult | null)[];
  lastVote: OnlineLastVote | null;
  votesCast: number;
  cardsPlayed: number;
  winner: 'good' | 'evil' | null;
  winReason: string;
  assassinationTarget: string | null;
  you: OnlineYouView;
}

export interface RoleKnowledge {
  sees: string[];
  hint: string;
}

export type ServerEvent =
  | { event: 'joined'; payload: { player_id: string } }
  | { event: 'lobby'; payload: { players: LobbyPlayer[]; host_id: string } }
  | { event: 'role_assigned'; payload: { role: RoleId; knowledge: RoleKnowledge } }
  | { event: 'game_started'; payload: Record<string, never> }
  | { event: 'game_state'; payload: OnlineGameView }
  | { event: 'error'; payload: { message: string } }
  | { event: 'pong'; payload: Record<string, never> };

export function parseServerEvent(raw: string): ServerEvent | null {
  try {
    const data = JSON.parse(raw) as { event?: string; payload?: unknown };
    if (!data.event) return null;
    return data as ServerEvent;
  } catch {
    return null;
  }
}

export function sendClientMessage(ws: WebSocket, msg: ClientMessage): void {
  ws.send(JSON.stringify(msg));
}
