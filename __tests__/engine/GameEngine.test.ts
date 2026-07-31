import {
  assignRoles,
  COUNT_CONFIG,
  computeMissionOutcome,
  initialGameState,
} from '../../src/game/logic';

describe('Realm of Shadows logic', () => {
  it('assigns correct good/evil counts', () => {
    for (const n of [5, 6, 7, 8, 9, 10]) {
      const names = Array.from({ length: n }, (_, i) => `P${i}`);
      const players = assignRoles(names, false);
      expect(players).toHaveLength(n);
      const evil = players.filter((p) =>
        ['cultist', 'assassin', 'sorceress', 'shadow_lord', 'rogue'].includes(p.role)
      ).length;
      expect(evil).toBe(COUNT_CONFIG[n].evil);
      expect(players.some((p) => p.role === 'seer')).toBe(true);
      expect(players.some((p) => p.role === 'assassin')).toBe(true);
    }
  });

  it('creates initial pass-and-play state', () => {
    const state = initialGameState(['A', 'B', 'C', 'D', 'E'], false);
    expect(state.phase).toBe('team_selection');
    expect(state.missionResults).toHaveLength(5);
    expect(state.config.missions[0]).toBe(2);
  });

  it('computes mission fail with double-fail rule', () => {
    const state = initialGameState(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      false
    );
    state.currentMission = 3; // mission 4 (1-indexed)
    expect(computeMissionOutcome(state, ['success', 'fail', 'success', 'success'])).toBe('success');
    expect(computeMissionOutcome(state, ['fail', 'fail', 'success', 'success'])).toBe('fail');
  });
});
