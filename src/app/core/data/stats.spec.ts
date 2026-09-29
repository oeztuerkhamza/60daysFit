import { DailyLog } from '../models';
import { activeDay, buildStats, daysBetween, parseDateOnly, toDateOnly } from './stats';

function log(day: number, completed: boolean, minutes: number | null = null): DailyLog {
  return {
    id: `log-${day}`,
    user_id: 'u1',
    day,
    logged_on: '2026-01-01',
    completed,
    duration_minutes: minutes,
    water_ml: null,
    steps: null,
    energy: null,
    notes: null,
  };
}

describe('buildStats', () => {
  it('reports zeroes for an empty log', () => {
    const stats = buildStats([], 60);
    expect(stats.completedDays).toBe(0);
    expect(stats.completionPct).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.totalMinutes).toBe(0);
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

  it('sums logged minutes across completed and skipped days', () => {
    const logs = [log(1, true, 45), log(2, false, 10), log(3, true, null)];
    expect(buildStats(logs, 60).totalMinutes).toBe(55);
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
