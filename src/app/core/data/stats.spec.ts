import { Checkpoint, DailyLog } from '../models';
import {
  activeDay,
  buildStats,
  checkpointSlots,
  daysBetween,
  parseDateOnly,
  pendingCheckpoints,
  toDateOnly,
} from './stats';

function log(day: number, completed: boolean, km: number | null = null, minutes: number | null = null): DailyLog {
  return {
    id: `log-${day}`,
    user_id: 'u1',
    day,
    logged_on: '2026-01-01',
    completed,
    walk_distance_km: km,
    walk_minutes: minutes,
    steps: null,
    water_ml: null,
    energy: null,
    notes: null,
  };
}

function checkpoint(kind: Checkpoint['kind'], week: number): Checkpoint {
  return {
    id: `cp-${kind}-${week}`,
    user_id: 'u1',
    kind,
    week,
    recorded_on: '2026-01-01',
    weight_kg: 88,
    height_cm: null,
    waist_cm: null,
    chest_cm: null,
    arm_cm: null,
    thigh_cm: null,
    note: null,
    photos: [],
  };
}

describe('buildStats', () => {
  it('reports zeroes for an empty log', () => {
    const stats = buildStats([], 60);
    expect(stats.completedDays).toBe(0);
    expect(stats.completionPct).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.totalWalkKm).toBe(0);
    expect(stats.totalWalkMinutes).toBe(0);
  });

  it('counts only completed days', () => {
    const stats = buildStats([log(1, true), log(2, false), log(3, true)], 60);
    expect(stats.completedDays).toBe(2);
  });

  it('rounds the completion percentage', () => {
    // 1 of 60 is 1.67% -> 2
    expect(buildStats([log(1, true)], 60).completionPct).toBe(2);
    expect(buildStats([log(1, true), log(2, true), log(3, true)], 60).completionPct).toBe(5);
  });

  it('measures the longest run of consecutive program days', () => {
    const logs = [log(1, true), log(2, true), log(3, true), log(5, true), log(6, true)];
    expect(buildStats(logs, 60).longestStreak).toBe(3);
  });

  it('measures the current streak from the trailing run', () => {
    const logs = [log(1, true), log(2, true), log(3, true), log(7, true), log(8, true)];
    const stats = buildStats(logs, 60);
    expect(stats.longestStreak).toBe(3);
    expect(stats.currentStreak).toBe(2);
  });

  it('is order independent', () => {
    const shuffled = [log(8, true), log(1, true), log(7, true), log(2, true)];
    const stats = buildStats(shuffled, 60);
    expect(stats.longestStreak).toBe(2);
    expect(stats.currentStreak).toBe(2);
  });

  it('sums walked distance and minutes across completed and skipped days', () => {
    const logs = [log(1, true, 3.0, 33), log(2, false, 1.5, 15), log(3, true, null, null)];
    const stats = buildStats(logs, 60);
    expect(stats.totalWalkKm).toBe(4.5);
    expect(stats.totalWalkMinutes).toBe(48);
  });

  it('keeps the distance sum free of floating point drift', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in IEEE 754.
    const stats = buildStats([log(1, true, 0.1), log(2, true, 0.2)], 60);
    expect(stats.totalWalkKm).toBe(0.3);
  });
});

describe('checkpointSlots', () => {
  it('asks for a start, one per finished week, and an end', () => {
    const slots = checkpointSlots(60);
    expect(slots.length).toBe(10);
    expect(slots[0]).toEqual(jasmine.objectContaining({ kind: 'start', dueFromDay: 1 }));
    expect(slots[1]).toEqual(jasmine.objectContaining({ kind: 'week', week: 1, dueFromDay: 7 }));
    expect(slots[8]).toEqual(jasmine.objectContaining({ kind: 'week', week: 8, dueFromDay: 56 }));
    expect(slots[9]).toEqual(jasmine.objectContaining({ kind: 'end', dueFromDay: 60 }));
  });
});

describe('pendingCheckpoints', () => {
  it('asks for the start record from day one', () => {
    const pending = pendingCheckpoints(1, [], 60);
    expect(pending.length).toBe(1);
    expect(pending[0].kind).toBe('start');
  });

  it('does not ask for a week that has not finished yet', () => {
    const pending = pendingCheckpoints(6, [checkpoint('start', 0)], 60);
    expect(pending).toEqual([]);
  });

  it('asks for the weekly record once the week is over', () => {
    const pending = pendingCheckpoints(7, [checkpoint('start', 0)], 60);
    expect(pending.length).toBe(1);
    expect(pending[0]).toEqual(jasmine.objectContaining({ kind: 'week', week: 1 }));
  });

  it('collects every check-in that was skipped along the way', () => {
    const pending = pendingCheckpoints(21, [checkpoint('start', 0), checkpoint('week', 1)], 60);
    expect(pending.map((slot) => slot.week)).toEqual([2, 3]);
  });

  it('asks for the end record on the final day', () => {
    const pending = pendingCheckpoints(60, [], 60);
    expect(pending[pending.length - 1].kind).toBe('end');
  });

  it('goes quiet once everything is recorded', () => {
    const recorded = [checkpoint('start', 0), checkpoint('week', 1), checkpoint('week', 2)];
    expect(pendingCheckpoints(20, recorded, 60)).toEqual([]);
  });
});

describe('date helpers', () => {
  it('parses a date-only column at local midnight', () => {
    const parsed = parseDateOnly('2026-03-09');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(9);
    expect(parsed.getHours()).toBe(0);
  });

  it('round-trips through toDateOnly without shifting', () => {
    expect(toDateOnly(parseDateOnly('2026-01-31'))).toBe('2026-01-31');
    expect(toDateOnly(new Date(2026, 8, 1))).toBe('2026-09-01');
  });

  it('counts whole days across a daylight saving boundary', () => {
    // Europe/Berlin springs forward on 2026-03-29.
    expect(daysBetween(new Date(2026, 2, 28), new Date(2026, 2, 30))).toBe(2);
  });
});

describe('activeDay', () => {
  it('treats the start date as day 1', () => {
    expect(activeDay('2026-05-01', 60, new Date(2026, 4, 1))).toBe(1);
  });

  it('advances one program day per calendar day', () => {
    expect(activeDay('2026-05-01', 60, new Date(2026, 4, 10))).toBe(10);
  });

  it('clamps to the start before the challenge begins', () => {
    expect(activeDay('2026-05-01', 60, new Date(2026, 3, 20))).toBe(1);
  });

  it('clamps to the last day once the challenge is over', () => {
    expect(activeDay('2026-05-01', 60, new Date(2026, 11, 31))).toBe(60);
  });
});
