import type { AppData } from '../types';

export const ACCOUNT_STORAGE_KEYS = [
  'gsat_user_profile', 'gsat_user_key', 'gsat_temp_pass', 'gsat_tasks', 'gsat_completed_task_ids',
  'gsat_deleted_task_ids', 'gsat_sync_metadata', 'gsat_pending_study_session_ids',
  'gsat_study_history', 'gsat_study_history_reset_at', 'gsat_challenge_records',
  'gsat_target_school', 'gsat_target_major', 'gsat_target_date', 'gsat_target_exam',
  'gsat_custom_dates', 'gsat_deleted_custom_date_ids', 'gsat_daily_goal', 'gsat_streak',
  'gsat_playlists', 'gsat_deleted_playlist_ids', 'gsat_deleted_track_ids', 'gsat_active_playlist_id',
  'gsat_incense_coins', 'gsat_incense_records', 'gsat_temple_state', 'gsat_team',
  'gsat_exam_checklist', 'gsat_tvet_category', 'gsat_unlocked_achievements',
  'gsat_login_suggestion_seen', 'gsat_exam_reminder_seen_116', 'gsat_incense_coins_migrated_v2',
];

type LogoutBackup = { version: 1; ownerId: string; savedAt: number; data: AppData; pendingSessionIds: string[] };
const backupKey = (ownerId: string) => `gsat_logout_backup:${encodeURIComponent(ownerId)}`;

export function saveLogoutBackup(ownerId: string, data: AppData, pendingSessionIds: string[], storage: Storage = localStorage): void {
  if (!ownerId) throw new Error('Missing backup owner');
  const serialized = JSON.stringify({ version: 1, ownerId, savedAt: Date.now(), data, pendingSessionIds } satisfies LogoutBackup);
  const key = backupKey(ownerId);
  storage.setItem(key, serialized);
  if (storage.getItem(key) !== serialized) throw new Error('Backup verification failed');
}

// The owner ID comes from a successful Supabase login, never an email typed into
// the form. Guest sessions and other accounts cannot restore this snapshot.
export function readLogoutBackup(ownerId: string, storage: Storage = localStorage): LogoutBackup | null {
  if (!ownerId) return null;
  const raw = storage.getItem(backupKey(ownerId));
  if (!raw) return null;
  const backup = JSON.parse(raw) as LogoutBackup;
  if (backup.version !== 1 || backup.ownerId !== ownerId || !backup.data
    || !Array.isArray(backup.data.tasks) || !Array.isArray(backup.data.studySessions)
    || !Array.isArray(backup.pendingSessionIds)) throw new Error('Invalid logout backup');
  return backup;
}

export function removeLogoutBackup(ownerId: string, storage: Storage = localStorage, expected?: LogoutBackup): void {
  if (!ownerId) return;
  const key = backupKey(ownerId);
  // A sync already in flight must not remove a newer logout snapshot.
  if (expected && storage.getItem(key) !== JSON.stringify(expected)) return;
  storage.removeItem(key);
}
