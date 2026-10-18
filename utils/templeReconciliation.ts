import type { IncenseRecord, StudySession } from '../types';

/** Compare lifetime durable history with the ledger, not a reset-filtered UI history. */
export function reconcileTempleCoins(sessions: StudySession[], records: IncenseRecord[], balance: number) {
  const minutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const earned = records.reduce((sum, record) => sum + Math.max(0, record.amount), 0);
  const spent = records.reduce((sum, record) => sum + Math.max(0, -record.amount), 0);
  return { minutes, earned, spent, balance, matches: minutes === earned && earned - spent === balance };
}

/** Locate deficits without confusing a matching session ID with a matching award. */
export function getTempleCoinDifferences(sessions: StudySession[], records: IncenseRecord[]) {
  const awards = new Map<string, number>();
  for (const record of records) {
    const sessionId = record.studySessionId || (record.id?.startsWith('study:') ? record.id.slice(6) : null);
    if (sessionId) awards.set(sessionId, (awards.get(sessionId) || 0) + record.amount);
  }
  return sessions.map(session => ({
    sessionId: session.id, subjectName: session.subjectName, timestamp: session.timestamp,
    minutes: session.durationMinutes, awarded: awards.get(session.id) || 0,
    difference: session.durationMinutes - (awards.get(session.id) || 0),
  })).filter(session => session.difference !== 0);
}
