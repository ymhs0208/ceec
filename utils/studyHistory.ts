import type { StudySession } from '../types';

export const mergeStudyHistoryReset = (...values: (number | undefined)[]): number =>
  Math.max(0, ...values.map(value => Number.isSafeInteger(value) && value! > 0 ? value! : 0));

export const filterStudyHistory = (sessions: StudySession[], resetAt: number): StudySession[] =>
  resetAt > 0 ? sessions.filter(session => session.timestamp > resetAt) : sessions;
