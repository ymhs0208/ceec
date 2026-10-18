type StorageStatus = { failed: boolean; pendingCount: number; reason: 'quota' | 'unavailable' | null };

export function createSafeStorage(source: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {
  const memory = new Map<string, string | null>();
  const pending = new Map<string, string | null>();
  const requiredFailures = new Set<string>();
  const listeners = new Set<() => void>();
  let readFailed = false;
  let failureVersion = 0;
  let status: StorageStatus = { failed: false, pendingCount: 0, reason: null };
  const publish = (error?: unknown) => {
    const candidate = error as { name?: string; code?: number } | undefined;
    const reason = candidate ? (candidate.name === 'QuotaExceededError' || candidate.code === 22 || candidate.code === 1014 ? 'quota' : 'unavailable') : status.reason;
    const failed = readFailed || pending.size > 0 || requiredFailures.size > 0;
    if (status.failed === failed && status.pendingCount === pending.size && status.reason === (failed ? reason : null)) return;
    status = { failed, pendingCount: pending.size, reason: failed ? reason : null };
    queueMicrotask(() => listeners.forEach(listener => listener()));
  };
  const storage = {
    getItem(key: string): string | null {
      if (pending.has(key)) return pending.get(key) ?? null;
      try {
        const value = source().getItem(key);
        memory.set(key, value);
        return value;
      } catch (error) {
        readFailed = true; failureVersion++; publish(error);
        return memory.get(key) ?? null;
      }
    },
    setItem(key: string, value: string): void {
      memory.set(key, value);
      try { source().setItem(key, value); pending.delete(key); requiredFailures.delete(key); publish(); }
      catch (error) { pending.set(key, value); failureVersion++; publish(error); }
    },
    removeItem(key: string): void {
      memory.set(key, null);
      try { source().removeItem(key); pending.delete(key); requiredFailures.delete(key); publish(); }
      catch (error) { pending.set(key, null); failureVersion++; publish(error); }
    },
  };
  return {
    storage,
    getSnapshot: () => status,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getFailureVersion: () => failureVersion,
    writeRequired(key: string, value: string) {
      // Cancelled destructive actions must not leave a queued reset marker that
      // a later generic retry could silently apply.
      try {
        source().setItem(key, value); memory.set(key, value);
        pending.delete(key); requiredFailures.delete(key); publish();
      } catch (error) {
        requiredFailures.add(key); failureVersion++; publish(error);
        throw new Error('Local storage write failed');
      }
    },
    retry() {
      try {
        source().getItem('gsat_tasks');
        source().setItem('gsat_storage_probe', '1');
        source().removeItem('gsat_storage_probe');
        readFailed = false; requiredFailures.clear();
      }
      catch (error) { readFailed = true; publish(error); return; }
      for (const [key, value] of Array.from(pending)) {
        if (value === null) storage.removeItem(key); else storage.setItem(key, value);
      }
      publish();
    },
  };
}

export const localStorageController = createSafeStorage(() => localStorage);
export const safeLocalStorage = localStorageController.storage;

/** Read local storage without allowing malformed legacy data to stop the app. */
export const readStoredJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = safeLocalStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    // Valid JSON may still have the wrong shape (for example, "null" in a
    // history key). Never feed that value into React's array/object consumers.
    if (parsed === null) return fallback;
    if (Array.isArray(fallback)) {
      if (!Array.isArray(parsed)) return fallback;
      if (key === 'gsat_tasks') {
        return parsed.filter(task => task && typeof task.id === 'string' && typeof task.text === 'string')
          .map(task => ({ ...task, completed: task.completed === true,
            category: ['chinese', 'english', 'math', 'social', 'natural', 'other'].includes(task.category) ? task.category : 'other',
            dueDate: typeof task.dueDate === 'string' && Number.isFinite(new Date(task.dueDate).getTime()) ? task.dueDate : undefined,
          })) as T;
      }
      if (key === 'gsat_custom_dates') {
        return parsed.filter(date => date && typeof date.id === 'string' && typeof date.title === 'string'
          && typeof date.date === 'string' && Number.isFinite(new Date(date.date).getTime())) as T;
      }
      if (key === 'gsat_study_history') {
        return parsed.filter(session => session && typeof session.id === 'string'
          && typeof session.subjectId === 'string' && typeof session.subjectName === 'string'
          && Number.isFinite(session.durationMinutes) && session.durationMinutes > 0
          && Number.isSafeInteger(session.timestamp) && session.timestamp > 0) as T;
      }
      return parsed.filter(value => value !== null && value !== undefined) as T;
    }
    if (typeof fallback === 'object') {
      return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : fallback;
    }
    return typeof parsed === typeof fallback ? parsed as T : fallback;
  } catch {
    console.warn(`Ignoring invalid local data for ${key}`);
    return fallback;
  }
};
