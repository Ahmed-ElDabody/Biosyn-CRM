// Shared date utilities. UTC throughout; the spec treats server time as
// the source of truth (Section 2).

export interface IsoWeek {
  year: number;
  week: number;
}

export function isoWeekOf(date: Date): IsoWeek {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function startOfNextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export function startOfQuarter(date: Date): Date {
  const m = date.getUTCMonth();
  const qStart = m - (m % 3);
  return new Date(Date.UTC(date.getUTCFullYear(), qStart, 1));
}

export function startOfNextQuarter(date: Date): Date {
  const m = date.getUTCMonth();
  const qStart = m - (m % 3);
  return new Date(Date.UTC(date.getUTCFullYear(), qStart + 3, 1));
}

// ---------- ISO-week ↔ UTC anchor + planning deadlines (spec §8) ----------

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_MIN = 60_000;

// Default tz offset for Africa/Cairo (no DST, UTC+2). Override via env.
export const DEFAULT_TZ_OFFSET_MIN = Number.parseInt(
  process.env.TZ_OFFSET_MINUTES ?? '120',
  10,
);

/** Monday 00:00 UTC of ISO week (year, week). Naive (no boundary correction
 *  across year transitions for very-early/late weeks; fine for in-year use). */
export function isoWeekMondayUtc(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7; // Mon=1..Sun=7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (day - 1));
  return new Date(week1Monday.getTime() + (week - 1) * 7 * MS_PER_DAY);
}

/** Spec §8 — rep must submit by Thursday 23:00 LOCAL of the week BEFORE plan's
 *  ISO week. Local = UTC + tzOffsetMin. Returns the equivalent UTC instant. */
export function planSubmitDeadlineUtc(
  year: number,
  week: number,
  tzOffsetMin = DEFAULT_TZ_OFFSET_MIN,
): Date {
  const planMon = isoWeekMondayUtc(year, week);
  // Thursday of previous week = Mon - 4 days; at 23:00 LOCAL
  const localInstantMs = planMon.getTime() - 4 * MS_PER_DAY + 23 * MS_PER_HOUR;
  return new Date(localInstantMs - tzOffsetMin * MS_PER_MIN);
}

/** Spec §8 — manager must approve by Saturday 10:00 LOCAL of the week BEFORE
 *  plan's ISO week. */
export function managerApproveDeadlineUtc(
  year: number,
  week: number,
  tzOffsetMin = DEFAULT_TZ_OFFSET_MIN,
): Date {
  const planMon = isoWeekMondayUtc(year, week);
  // Saturday of previous week = Mon - 2 days; at 10:00 LOCAL
  const localInstantMs = planMon.getTime() - 2 * MS_PER_DAY + 10 * MS_PER_HOUR;
  return new Date(localInstantMs - tzOffsetMin * MS_PER_MIN);
}
