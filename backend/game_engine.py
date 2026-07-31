"""
Authoritative game state for Realm of Shadows online play.
Mirrors src/game/logic.ts and src/game/context.tsx transitions.
"""
from __future__ import annotations

import random
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional, Tuple

Alignment = Literal["good", "evil"]
Phase = Literal[
    "team_selection",
    "vote",
    "vote_reveal",
    "mission",
    "mission_reveal",
    "assassination",
    "endgame",
]
VoteChoice = Literal["approve", "reject"]
CardChoice = Literal["success", "fail"]

EVIL_ROLES = frozenset({"cultist", "assassin", "sorceress", "shadow_lord", "rogue"})

COUNT_CONFIG: Dict[int, Dict[str, Any]] = {
    5: {"good": 3, "evil": 2, "missions": [2, 3, 2, 3, 3], "double_fail_mission": None},
    6: {"good": 4, "evil": 2, "missions": [2, 3, 4, 3, 4], "double_fail_mission": None},
    7: {"good": 4, "evil": 3, "missions": [2, 3, 3, 4, 4], "double_fail_mission": 4},
    8: {"good": 5, "evil": 3, "missions": [3, 4, 4, 5, 5], "double_fail_mission": 4},
    9: {"good": 6, "evil": 3, "missions": [3, 4, 4, 5, 5], "double_fail_mission": 4},
    10: {"good": 6, "evil": 4, "missions": [3, 4, 4, 5, 5], "double_fail_mission": 4},
}


@dataclass
class RoundVote:
    proposer_index: int
    team: List[str]
    votes: Dict[str, VoteChoice]
    approved: bool


@dataclass
class MissionResult:
    team: List[str]
    cards: List[CardChoice]
    outcome: Literal["success", "fail"]


@dataclass
class GameState:
    player_ids: List[str]  # stable order matching indices
    player_count: int
    config: Dict[str, Any]
    current_mission: int
    current_leader: int
    propose_vote_count: int
    current_team: List[str]
    phase: Phase
    mission_results: List[Optional[MissionResult]]
    vote_history: List[RoundVote]
    current_vote: Dict[str, VoteChoice]
    current_mission_cards: Dict[str, CardChoice]
    assassination_target: Optional[str]
    winner: Optional[Alignment]
    win_reason: str
    roles: Dict[str, str]  # player_id -> role (server-only in broadcasts)


def player_index(state: GameState, player_id: str) -> int:
    return state.player_ids.index(player_id)


def good_successes(state: GameState) -> int:
    return sum(1 for m in state.mission_results if m and m.outcome == "success")


def evil_successes(state: GameState) -> int:
    return sum(1 for m in state.mission_results if m and m.outcome == "fail")


def compute_mission_outcome(state: GameState, cards: List[CardChoice]) -> Literal["success", "fail"]:
    fails = sum(1 for c in cards if c == "fail")
    require_two = state.config["double_fail_mission"] == state.current_mission + 1
    return "fail" if fails >= (2 if require_two else 1) else "success"


def is_evil_role(role: str) -> bool:
    return role in EVIL_ROLES


def new_game_state(player_ids: List[str], roles: Dict[str, str]) -> GameState:
    n = len(player_ids)
    cfg = deepcopy(COUNT_CONFIG[n])
    return GameState(
        player_ids=list(player_ids),
        player_count=n,
        config=cfg,
        current_mission=0,
        current_leader=random.randrange(n),
        propose_vote_count=0,
        current_team=[],
        phase="team_selection",
        mission_results=[None] * 5,
        vote_history=[],
        current_vote={},
        current_mission_cards={},
        assassination_target=None,
        winner=None,
        win_reason="",
        roles=roles,
    )


def propose_team(state: GameState, leader_id: str, team: List[str]) -> Tuple[GameState, Optional[str]]:
    if state.phase != "team_selection":
        return state, "Not in team selection phase"
    idx = player_index(state, leader_id)
    if idx != state.current_leader:
        return state, "Only the current leader may propose a team"
    team_size = state.config["missions"][state.current_mission]
    if len(team) != team_size:
        return state, f"Team must have exactly {team_size} players"
    if len(set(team)) != len(team):
        return state, "Duplicate players on team"
    for pid in team:
        if pid not in state.player_ids:
            return state, "Invalid player on team"
    s = deepcopy(state)
    s.current_team = list(team)
    s.phase = "vote"
    s.current_vote = {}
    return s, None


def cast_vote(state: GameState, voter_id: str, vote: VoteChoice) -> Tuple[GameState, Optional[str]]:
    if state.phase != "vote":
        return state, "Not in voting phase"
    if voter_id not in state.player_ids:
        return state, "Unknown player"
    if voter_id in state.current_vote:
        return state, "Already voted"
    s = deepcopy(state)
    s.current_vote[voter_id] = vote
    if len(s.current_vote) >= s.player_count:
        approves = sum(1 for v in s.current_vote.values() if v == "approve")
        approved = approves > s.player_count / 2
        s.vote_history.append(
            RoundVote(
                proposer_index=s.current_leader,
                team=list(s.current_team),
                votes=dict(s.current_vote),
                approved=approved,
            )
        )
        s.phase = "vote_reveal"
    return s, None


def advance_after_vote_reveal(state: GameState) -> Tuple[GameState, Optional[str]]:
    if state.phase != "vote_reveal":
        return state, "Not in vote reveal phase"
    if not state.vote_history:
        return state, "No vote to resolve"
    last = state.vote_history[-1]
    s = deepcopy(state)
    if last.approved:
        s.phase = "mission"
        s.current_mission_cards = {}
        return s, None
    rejects = s.propose_vote_count + 1
    if rejects >= 5:
        s.phase = "endgame"
        s.winner = "evil"
        s.win_reason = "Five consecutive rejected proposals."
        return s, None
    s.current_leader = (s.current_leader + 1) % s.player_count
    s.current_team = []
    s.current_vote = {}
    s.propose_vote_count = rejects
    s.phase = "team_selection"
    return s, None


def play_mission_card(
    state: GameState, actor_id: str, card: CardChoice
) -> Tuple[GameState, Optional[str]]:
    if state.phase != "mission":
        return state, "Not in mission phase"
    if actor_id not in state.current_team:
        return state, "You are not on this mission team"
    if actor_id in state.current_mission_cards:
        return state, "Already played a card"
    role = state.roles.get(actor_id, "knight")
    if card == "fail" and not is_evil_role(role):
        return state, "Only shadow may sabotage"
    s = deepcopy(state)
    s.current_mission_cards[actor_id] = card
    if len(s.current_mission_cards) >= len(s.current_team):
        cards = [s.current_mission_cards[pid] for pid in s.current_team]
        outcome = compute_mission_outcome(s, cards)
        s.mission_results[s.current_mission] = MissionResult(
            team=list(s.current_team), cards=cards, outcome=outcome
        )
        s.phase = "mission_reveal"
    return s, None


def advance_after_mission_reveal(state: GameState) -> Tuple[GameState, Optional[str]]:
    if state.phase != "mission_reveal":
        return state, "Not in mission reveal phase"
    s = deepcopy(state)
    good = good_successes(s)
    evil = evil_successes(s)
    if evil >= 3:
        s.phase = "endgame"
        s.winner = "evil"
        s.win_reason = "Three missions sabotaged."
        return s, None
    if good >= 3:
        s.phase = "assassination"
        return s, None
    s.current_mission += 1
    s.current_leader = (s.current_leader + 1) % s.player_count
    s.current_team = []
    s.current_vote = {}
    s.current_mission_cards = {}
    s.propose_vote_count = 0
    s.phase = "team_selection"
    return s, None


def assassinate(state: GameState, assassin_id: str, target_id: str) -> Tuple[GameState, Optional[str]]:
    if state.phase != "assassination":
        return state, "Not in assassination phase"
    if state.roles.get(assassin_id) != "assassin":
        return state, "Only the Assassin may strike"
    if target_id not in state.player_ids:
        return state, "Invalid target"
    target_role = state.roles.get(target_id)
    if target_role and is_evil_role(target_role):
        return state, "Target must be good"
    s = deepcopy(state)
    s.assassination_target = target_id
    evil_wins = target_role == "seer"
    s.winner = "evil" if evil_wins else "good"
    s.phase = "endgame"
    if evil_wins:
        s.win_reason = "The Assassin struck true — the Seer was named."
    else:
        s.win_reason = "The Assassin's blade missed — the target was not the Seer."
    return s, None


def mission_result_public(m: Optional[MissionResult], include_cards: bool) -> Optional[Dict[str, Any]]:
    if m is None:
        return None
    out: Dict[str, Any] = {"team": m.team, "outcome": m.outcome}
    if include_cards:
        out["cards"] = m.cards
        out["failCount"] = sum(1 for c in m.cards if c == "fail")
    return out


def build_public_view(
    state: GameState,
    names: Dict[str, str],
    *,
    include_roles: bool = False,
) -> Dict[str, Any]:
    players = []
    for pid in state.player_ids:
        p: Dict[str, Any] = {"id": pid, "name": names.get(pid, "?")}
        if include_roles:
            p["role"] = state.roles.get(pid)
        players.append(p)

    last_vote = None
    if state.vote_history:
        lv = state.vote_history[-1]
        last_vote = {
            "proposerIndex": lv.proposer_index,
            "team": lv.team,
            "votes": lv.votes,
            "approved": lv.approved,
        }

    results = []
    for i, m in enumerate(state.mission_results):
        include_cards = state.phase == "mission_reveal" and i == state.current_mission
        if state.phase == "endgame" or (m and i < state.current_mission):
            include_cards = m is not None
        results.append(mission_result_public(m, include_cards))

    return {
        "players": players,
        "playerCount": state.player_count,
        "config": {
            "missions": state.config["missions"],
            "doubleFailMission": state.config["double_fail_mission"],
        },
        "currentMission": state.current_mission,
        "currentLeader": state.current_leader,
        "proposeVoteCount": state.propose_vote_count,
        "currentTeam": state.current_team,
        "phase": state.phase,
        "missionResults": results,
        "lastVote": last_vote,
        "votesCast": len(state.current_vote),
        "cardsPlayed": len(state.current_mission_cards),
        "winner": state.winner,
        "winReason": state.win_reason,
        "assassinationTarget": state.assassination_target if state.phase == "endgame" else None,
    }


def build_player_view(
    state: GameState,
    player_id: str,
    names: Dict[str, str],
) -> Dict[str, Any]:
    view = build_public_view(state, names, include_roles=state.phase == "endgame")
    idx = player_index(state, player_id)
    role = state.roles.get(player_id, "knight")
    on_team = player_id in state.current_team
    view["you"] = {
        "id": player_id,
        "isLeader": idx == state.current_leader,
        "isOnTeam": on_team,
        "hasVoted": player_id in state.current_vote,
        "hasPlayedCard": player_id in state.current_mission_cards,
        "canProposeTeam": state.phase == "team_selection" and idx == state.current_leader,
        "canVote": state.phase == "vote" and player_id not in state.current_vote,
        "canPlayCard": state.phase == "mission" and on_team and player_id not in state.current_mission_cards,
        "canAdvance": state.phase in ("vote_reveal", "mission_reveal"),
        "canAssassinate": state.phase == "assassination" and role == "assassin",
        "isEvil": is_evil_role(role),
    }
    return view
