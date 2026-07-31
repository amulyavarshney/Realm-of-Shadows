import {
  assignRoles,
  computeMissionOutcome,
  COUNT_CONFIG,
  goodSuccesses,
  evilSuccesses,
  initialGameState,
  ROLES,
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

  it('fails mission 4 with single fail when double-fail rule does not apply (5 players)', () => {
    const state = initialGameState(['A', 'B', 'C', 'D', 'E'], false);
    state.currentMission = 3;
    expect(state.config.doubleFailMission).toBeNull();
    expect(computeMissionOutcome(state, ['success', 'fail'])).toBe('fail');
  });

  it('assigns advanced roles when enabled for 7+ players', () => {
    const names = Array.from({ length: 7 }, (_, i) => `P${i}`);
    const players = assignRoles(names, true);
    const roles = players.map((p) => p.role);
    expect(roles).toContain('guardian');
    expect(roles).toContain('sorceress');
    expect(roles).toContain('shadow_lord');
  });

  it('seer knowledge excludes shadow lord', () => {
    // Run many shuffles to hit shadow_lord + seer combo
    let sawShadowLordHidden = false;
    for (let i = 0; i < 200; i++) {
      const players = assignRoles(
        Array.from({ length: 8 }, (_, j) => `P${j}`),
        true
      );
      const seer = players.find((p) => p.role === 'seer');
      const shadowLord = players.find((p) => p.role === 'shadow_lord');
      if (seer && shadowLord) {
        expect(seer.knowledge).not.toContain(shadowLord.name);
        sawShadowLordHidden = true;
      }
    }
    expect(sawShadowLordHidden).toBe(true);
  });

  it('rogue has empty knowledge and walks alone hint', () => {
    let foundRogue = false;
    for (let i = 0; i < 200; i++) {
      const players = assignRoles(
        Array.from({ length: 10 }, (_, j) => `P${j}`),
        true
      );
      const rogue = players.find((p) => p.role === 'rogue');
      if (rogue) {
        expect(rogue.knowledge).toEqual([]);
        expect(rogue.knowledgeHint).toMatch(/alone/i);
        foundRogue = true;
        break;
      }
    }
    expect(foundRogue).toBe(true);
  });

  it('counts good and evil mission successes', () => {
    const state = initialGameState(['A', 'B', 'C', 'D', 'E'], false);
    state.missionResults[0] = { team: [], cards: ['success'], outcome: 'success' };
    state.missionResults[1] = { team: [], cards: ['fail'], outcome: 'fail' };
    state.missionResults[2] = { team: [], cards: ['success'], outcome: 'success' };
    expect(goodSuccesses(state)).toBe(2);
    expect(evilSuccesses(state)).toBe(1);
  });

  it('exports role metadata for all role ids', () => {
    const ids = ['knight', 'seer', 'guardian', 'cultist', 'assassin', 'sorceress', 'shadow_lord', 'rogue'] as const;
    for (const id of ids) {
      expect(ROLES[id].id).toBe(id);
      expect(ROLES[id].name.length).toBeGreaterThan(0);
    }
  });
});
