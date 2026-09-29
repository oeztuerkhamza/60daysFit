import { Checkpoint, CheckpointKind, DailyLog } from '../models';

export interface ChallengeStats {
  /** Program days marked completed. */
  completedDays: number;
  totalDays: number;
  /** Rounded percentage of the challenge finished. */
  completionPct: number;
  /**
   * Length of the run of consecutive completed days that ends at the
   * highest-numbered completed day. 0 when nothing is completed.
   */
  currentStreak: number;
  /** Longest run of consecutive completed days anywhere in the program. */
  longestStreak: number;
  /** Kilometres actually walked, summed across every log. */
  totalWalkKm: number;
  /** Minutes actually walked, summed across every log. */
  totalWalkMinutes: number;
}

/**
 * Derives challenge totals from a user's daily logs.
 *
 * Streaks are counted over program day numbers, not calendar dates: the program
 * is a sequence of 60 sessions, and skipping one leaves a hole in that sequence
 * whether or not the user walked on consecutive dates.
 */
export function buildStats(logs: readonly DailyLog[], totalDays: number): ChallengeStats {
  const completedDayNumbers = logs
    .filter((log) => log.completed)
    .map((log) => log.day)
    .sort((a, b) => a - b);

  let longestStreak = 0;
  let currentRun = 0;
  let previousDay: number | null = null;

  for (const day of completedDayNumbers) {
    currentRun = previousDay !== null && day === previousDay + 1 ? currentRun + 1 : 1;
    longestStreak = Math.max(longestStreak, currentRun);
    previousDay = day;
  }

  const totalWalkKm = logs.reduce((sum, log) => sum + (log.walk_distance_km ?? 0), 0);
  const totalWalkMinutes = logs.reduce((sum, log) => sum + (log.walk_minutes ?? 0), 0);
  const completedDays = completedDayNumbers.length;

  return {
    completedDays,
    totalDays,
    completionPct: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
    // currentRun holds the trailing run once the loop finishes.
    currentStreak: currentRun,
    longestStreak,
    // Floating point sums of one-decimal values drift; pin it back to one decimal.
    totalWalkKm: Math.round(totalWalkKm * 10) / 10,
    totalWalkMinutes,
  };
}

export interface CheckpointSlot {
  kind: CheckpointKind;
  /** 1–8 for weekly check-ins, 0 for the start and end records. */
  week: number;
  label: string;
  /** The program day from which this check-in can be recorded. */
  dueFromDay: number;
}

/** Every check-in the program asks for, in the order they come round. */
export function checkpointSlots(totalDays: number): CheckpointSlot[] {
  const weeklyCount = Math.floor((totalDays - 1) / 7);
  const weekly: CheckpointSlot[] = Array.from({ length: weeklyCount }, (_, index) => ({
    kind: 'week' as const,
    week: index + 1,
    label: `${index + 1}. hafta`,
    dueFromDay: (index + 1) * 7,
  }));

  return [
    { kind: 'start', week: 0, label: 'Başlangıç', dueFromDay: 1 },
    ...weekly,
    { kind: 'end', week: 0, label: 'Bitiş', dueFromDay: totalDays },
  ];
}

function slotKey(kind: CheckpointKind, week: number): string {
  return `${kind}:${kind === 'week' ? week : 0}`;
}

/** Slots the calendar has reached but the user has not recorded yet. */
export function pendingCheckpoints(
  currentDay: number,
  recorded: readonly Checkpoint[],
  totalDays: number,
): CheckpointSlot[] {
  const done = new Set(recorded.map((entry) => slotKey(entry.kind, entry.week)));
  return checkpointSlots(totalDays).filter(
    (slot) => currentDay >= slot.dueFromDay && !done.has(slotKey(slot.kind, slot.week)),
  );
}

/** Parses a `YYYY-MM-DD` column into a local-midnight Date. */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Formats a Date as `YYYY-MM-DD` in local time (never shifts across midnight). */
export function toDateOnly(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Whole days from `from` to `to`, immune to daylight saving shifts. */
export function daysBetween(from: Date, to: Date): number {
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/**
 * Which program day the calendar puts the user on, clamped to the program.
 * Day 1 is the start date itself.
 */
export function activeDay(startDate: string, totalDays: number, today: Date = new Date()): number {
  const elapsed = daysBetween(parseDateOnly(startDate), today);
  return Math.min(Math.max(elapsed + 1, 1), totalDays);
}
