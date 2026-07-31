"""Tests for backend/game_engine.py"""
from game_engine import (
    COUNT_CONFIG,
    advance_after_mission_reveal,
    advance_after_vote_reveal,
    assassinate,
    cast_vote,
    compute_mission_outcome,
    new_game_state,
    play_mission_card,
    propose_team,
)


def _five_player_game():
    ids = ["a", "b", "c", "d", "e"]
    roles = {"a": "knight", "b": "seer", "c": "knight", "d": "cultist", "e": "assassin"}
    return new_game_state(ids, roles)


def test_new_game_starts_team_selection():
    state = _five_player_game()
    assert state.phase == "team_selection"
    assert state.config["missions"] == COUNT_CONFIG[5]["missions"]


def test_propose_team_transitions_to_vote():
    state = _five_player_game()
    leader = state.player_ids[state.current_leader]
    team = state.player_ids[:2]
    state, err = propose_team(state, leader, team)
    assert err is None
    assert state.phase == "vote"
    assert state.current_team == team


def test_wrong_leader_cannot_propose():
    state = _five_player_game()
    not_leader = state.player_ids[(state.current_leader + 1) % 5]
    _, err = propose_team(state, not_leader, state.player_ids[:2])
    assert err == "Only the current leader may propose a team"


def test_all_votes_auto_reveal():
    state = _five_player_game()
    leader = state.player_ids[state.current_leader]
    state, _ = propose_team(state, leader, state.player_ids[:2])
    for pid in state.player_ids:
        state, err = cast_vote(state, pid, "approve")
        assert err is None
    assert state.phase == "vote_reveal"
    assert state.vote_history[-1].approved is True


def test_five_rejects_evil_wins():
    state = _five_player_game()
    for _ in range(5):
        leader = state.player_ids[state.current_leader]
        state, _ = propose_team(state, leader, state.player_ids[:2])
        for pid in state.player_ids:
            state, _ = cast_vote(state, pid, "reject")
        state, _ = advance_after_vote_reveal(state)
    assert state.phase == "endgame"
    assert state.winner == "evil"


def test_good_cannot_play_fail():
    state = _five_player_game()
    leader = state.player_ids[state.current_leader]
    knight = next(pid for pid, r in state.roles.items() if r == "knight")
    others = [pid for pid in state.player_ids if pid != knight][:1]
    team = [knight, others[0]]
    state, _ = propose_team(state, leader, team)
    for pid in state.player_ids:
        state, _ = cast_vote(state, pid, "approve")
    state, _ = advance_after_vote_reveal(state)
    assert state.phase == "mission"
    _, err = play_mission_card(state, knight, "fail")
    assert err == "Only shadow may sabotage"


def test_mission_completes_to_reveal():
    state = _five_player_game()
    leader = state.player_ids[state.current_leader]
    team = state.player_ids[:2]
    state, _ = propose_team(state, leader, team)
    for pid in state.player_ids:
        state, _ = cast_vote(state, pid, "approve")
    state, _ = advance_after_vote_reveal(state)
    for pid in team:
        card = "fail" if state.roles[pid] in ("cultist", "assassin") else "success"
        state, err = play_mission_card(state, pid, card)
        assert err is None
    assert state.phase == "mission_reveal"
    assert state.mission_results[0] is not None


def test_double_fail_mission():
    ids = [f"p{i}" for i in range(7)]
    roles = {pid: "knight" for pid in ids}
    roles["p0"] = "cultist"
    state = new_game_state(ids, roles)
    state.current_mission = 3
    assert compute_mission_outcome(state, ["success", "fail", "success", "success"]) == "success"
    assert compute_mission_outcome(state, ["fail", "fail", "success", "success"]) == "fail"


def test_assassination():
    state = _five_player_game()
    state.phase = "assassination"
    assassin = next(pid for pid, r in state.roles.items() if r == "assassin")
    seer = next(pid for pid, r in state.roles.items() if r == "seer")
    state, err = assassinate(state, assassin, seer)
    assert err is None
    assert state.winner == "evil"
    state2 = _five_player_game()
    state2.phase = "assassination"
    knight = next(pid for pid, r in state2.roles.items() if r == "knight")
    state2, err = assassinate(state2, assassin, knight)
    assert state2.winner == "good"
