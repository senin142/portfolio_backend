// Pure policy logic for auto-deleting stale 'pending' accounts (never-approved
// public signups) -- kept dependency-free so it can be unit tested without a
// database. See UserCleanupService for how this gets used against real rows.
export const PENDING_ACCOUNT_TTL_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The reference point the 10-day clock counts from: last login if the
 * account ever logged in, otherwise when it was created. A 'pending' account
 * can never log in (AuthService.login rejects it), so in practice this is
 * always `createdAt` for the accounts this policy actually targets — written
 * generically in case the policy's scope ever changes. */
export function deletionReferenceDate(user: { lastLoginAt: Date | null; createdAt: Date }): Date {
  return user.lastLoginAt ?? user.createdAt;
}

export function daysRemainingUntilAutoDeletion(referenceDate: Date, now: Date = new Date()): number {
  const elapsedDays = (now.getTime() - referenceDate.getTime()) / DAY_MS;
  return Math.max(0, Math.ceil(PENDING_ACCOUNT_TTL_DAYS - elapsedDays));
}

export function isPastDeletionCutoff(referenceDate: Date, now: Date = new Date()): boolean {
  return daysRemainingUntilAutoDeletion(referenceDate, now) <= 0;
}

/** For building a DB query: any pending account whose reference date is
 * older than this cutoff is eligible for deletion. */
export function deletionCutoffDate(now: Date = new Date()): Date {
  return new Date(now.getTime() - PENDING_ACCOUNT_TTL_DAYS * DAY_MS);
}
