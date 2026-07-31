// Game logic for Realm of Shadows (Avalon-inspired, original branding).

export type Alignment = 'good' | 'evil';
export type RoleId =
  | 'knight'
  | 'seer'
  | 'guardian'
  | 'cultist'
  | 'assassin'
  | 'sorceress'
  | 'shadow_lord'
  | 'rogue';

export interface RoleInfo {
  id: RoleId;
  name: string;
  alignment: Alignment;
  icon: string; // MaterialCommunityIcons
  short: string;
  detail: string;
}

export const ROLES: Record<RoleId, RoleInfo> = {
  knight:      { id: 'knight',     name: 'Knight of the Realm', alignment: 'good', icon: 'shield-sword',       short: 'A loyal soldier. You know only your allegiance.', detail: 'You are sworn to the Realm. You know no other roles. Trust wisely.' },
  seer:        { id: 'seer',       name: 'Seer',                alignment: 'good', icon: 'eye-outline',        short: 'You see the taint of evil (except the Shadow Lord).', detail: 'You perceive the aura of most evil souls — but the Shadow Lord is hidden. Never reveal yourself directly, or the Assassin will strike.' },
  guardian:    { id: 'guardian',   name: 'Guardian',            alignment: 'good', icon: 'shield-star',        short: 'You see the Seer and the Sorceress, but cannot tell which is which.', detail: 'You witness two auras — one truthful, one false. Protect the Seer at all costs.' },
  cultist:     { id: 'cultist',    name: 'Cultist',             alignment: 'evil', icon: 'skull-outline',      short: 'A minion of shadow. You know your evil allies (except the Rogue).', detail: 'You conspire in secret with your fellows in shadow. Sabotage the missions.' },
  assassin:    { id: 'assassin',   name: 'Assassin',            alignment: 'evil', icon: 'knife-military',     short: 'If good wins 3 missions, you have ONE last strike at the Seer.', detail: 'Should the Realm claim 3 victories, you may name whom you believe to be the Seer. Guess correctly and shadow yet triumphs.' },
  sorceress:   { id: 'sorceress',  name: 'Sorceress',           alignment: 'evil', icon: 'flask-outline',      short: 'Evil. Appears to the Guardian as the Seer.', detail: 'You masquerade as a beacon of good. The Guardian cannot tell you apart from the Seer.' },
  shadow_lord: { id: 'shadow_lord',name: 'Shadow Lord',         alignment: 'evil', icon: 'crown',              short: 'Evil, hidden even from the Seer.', detail: 'The Seer cannot perceive your darkness. You know your allies.' },
  rogue:       { id: 'rogue',      name: 'Rogue',               alignment: 'evil', icon: 'walk',               short: 'Evil, but unknown to your allies.', detail: 'You walk alone. No evil knows you, and you know no evil. You still hunt with them in secret.' },
};

// Player counts config: good/evil totals and mission sizes + double-fail rule
export interface CountConfig {
  good: number;
  evil: number;
  missions: number[]; // 5 mission team sizes
  doubleFailMission: number | null; // 1-indexed mission where 2 fails needed (usually mission 4 with 7+ players)
}

export const COUNT_CONFIG: Record<number, CountConfig> = {
  5:  { good: 3, evil: 2, missions: [2,3,2,3,3], doubleFailMission: null },
  6:  { good: 4, evil: 2, missions: [2,3,4,3,4], doubleFailMission: null },
  7:  { good: 4, evil: 3, missions: [2,3,3,4,4], doubleFailMission: 4 },
  8:  { good: 5, evil: 3, missions: [3,4,4,5,5], doubleFailMission: 4 },
  9:  { good: 6, evil: 3, missions: [3,4,4,5,5], doubleFailMission: 4 },
  10: { good: 6, evil: 4, missions: [3,4,4,5,5], doubleFailMission: 4 },
};

export interface Player {
  id: string;
  name: string;
  role: RoleId;
  knowledge: string[]; // names visible to this player
  knowledgeHint: string;
}

export interface RoundVote {
  proposerIndex: number;
  team: string[]; // player ids
  votes: Record<string, 'approve' | 'reject'>;
  approved: boolean | null;
}

export interface MissionResult {
  team: string[];
  cards: ('success' | 'fail')[];
  outcome: 'success' | 'fail';
}

export interface GameState {
  players: Player[];
  playerCount: number;
  config: CountConfig;
  currentMission: number; // 0-4
  currentLeader: number; // player index proposing
  proposeVoteCount: number; // how many rejected in a row for this mission (5 = evil wins)
  currentTeam: string[]; // selected ids
  phase: GamePhase;
  missionResults: (MissionResult | null)[]; // length 5
  voteHistory: RoundVote[]; // all propose votes
  currentVote: Record<string, 'approve' | 'reject'>; // during vote phase
  currentMissionCards: Record<string, 'success' | 'fail'>; // during mission phase
  currentVoter: number; // for pass-and-play, whose turn to secretly vote
  currentMissionActor: number; // for pass-and-play, whose turn to play card
  assassinationTarget: string | null;
  winner: Alignment | null;
  winReason: string;
}

export type GamePhase =
  | 'team_selection'   // leader picks team
  | 'vote'             // everyone approves/rejects (pass-and-play cycles per player)
  | 'vote_reveal'      // show votes
  | 'mission'          // team plays cards
  | 'mission_reveal'   // show mission outcome
  | 'assassination'    // evil picks Seer target if good has 3 successes
  | 'endgame';         // final result

export function assignRoles(names: string[], advanced: boolean): Player[] {
  const n = names.length;
  const cfg = COUNT_CONFIG[n];
  const goodSpecial: RoleId[] = ['seer'];
  const evilSpecial: RoleId[] = ['assassin'];
  if (advanced) {
    if (cfg.good >= 4) goodSpecial.push('guardian');
    if (cfg.evil >= 2) evilSpecial.push('sorceress');
    if (cfg.evil >= 3) evilSpecial.push('shadow_lord');
    if (cfg.evil >= 4) evilSpecial.push('rogue');
  }
  const roles: RoleId[] = [
    ...goodSpecial.slice(0, cfg.good),
    ...Array(cfg.good - Math.min(goodSpecial.length, cfg.good)).fill('knight' as RoleId),
    ...evilSpecial.slice(0, cfg.evil),
    ...Array(cfg.evil - Math.min(evilSpecial.length, cfg.evil)).fill('cultist' as RoleId),
  ];
  shuffle(roles);
  const ids = names.map((_, i) => `p${i}`);
  const players: Player[] = names.map((name, i) => ({
    id: ids[i], name, role: roles[i], knowledge: [], knowledgeHint: '',
  }));
  // Compute knowledge
  for (const p of players) {
    const others = players.filter(x => x.id !== p.id);
    if (p.role === 'seer') {
      p.knowledge = others.filter(x => ['cultist','assassin','sorceress','rogue'].includes(x.role)).map(x => x.name);
      p.knowledgeHint = 'You see the taint of evil upon these souls.';
    } else if (p.role === 'guardian') {
      p.knowledge = shuffle(others.filter(x => ['seer','sorceress'].includes(x.role)).map(x => x.name));
      p.knowledgeHint = 'One among these is the Seer, another the Sorceress.';
    } else if (['cultist','assassin','sorceress'].includes(p.role)) {
      p.knowledge = others.filter(x => ['cultist','assassin','sorceress','shadow_lord'].includes(x.role)).map(x => x.name);
      p.knowledgeHint = 'These walk in shadow with you.';
    } else if (p.role === 'shadow_lord') {
      p.knowledge = others.filter(x => ['cultist','assassin','sorceress'].includes(x.role)).map(x => x.name);
      p.knowledgeHint = 'Your allies — yet the Seer cannot perceive you.';
    } else if (p.role === 'rogue') {
      p.knowledge = [];
      p.knowledgeHint = 'You walk alone in shadow.';
    } else {
      p.knowledge = [];
      p.knowledgeHint = 'You are a loyal Knight. Trust wisely.';
    }
  }
  return players;
}

export function initialGameState(names: string[], advanced: boolean): GameState {
  const players = assignRoles(names, advanced);
  const cfg = COUNT_CONFIG[names.length];
  return {
    players,
    playerCount: names.length,
    config: cfg,
    currentMission: 0,
    currentLeader: Math.floor(Math.random() * names.length),
    proposeVoteCount: 0,
    currentTeam: [],
    phase: 'team_selection',
    missionResults: [null, null, null, null, null],
    voteHistory: [],
    currentVote: {},
    currentMissionCards: {},
    currentVoter: 0,
    currentMissionActor: 0,
    assassinationTarget: null,
    winner: null,
    winReason: '',
  };
}

export function goodSuccesses(state: GameState) {
  return state.missionResults.filter(m => m?.outcome === 'success').length;
}
export function evilSuccesses(state: GameState) {
  return state.missionResults.filter(m => m?.outcome === 'fail').length;
}

export function computeMissionOutcome(state: GameState, cards: ('success'|'fail')[]): 'success'|'fail' {
  const fails = cards.filter(c => c === 'fail').length;
  const requireTwoFails = state.config.doubleFailMission === state.currentMission + 1;
  return fails >= (requireTwoFails ? 2 : 1) ? 'fail' : 'success';
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
