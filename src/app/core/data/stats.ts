import { DailyLog } from '../models';

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
  /** Sum of logged workout minutes. */
  totalMinutes: number;
}

/**
 * Derives challenge totals from a user's daily logs.
 *
 * Streaks are counted over program day numbers, not calendar dates: the program
 * is a sequence of 60 workouts, and skipping a day leaves a hole in that
 * sequence whether or not the user trained on consecutive dates.
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

  const totalMinutes = logs.reduce((sum, log) => sum + (log.duration_minutes ?? 0), 0);
  const completedDays = completedDayNumbers.length;

  return {
    completedDays,
    totalDays,
    completionPct: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
    // currentRun holds the trailing run once the loop finishes.
    currentStreak: currentRun,
    longestStreak,
    totalMinutes,
  };
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
