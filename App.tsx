import AdmissionsResourceCard from './components/AdmissionsResourceCard';
import CapAnalysisCard from './components/CapAnalysisCard';
import HomePage from './components/HomePage';
import ModalLayer from './components/ModalLayer';

import React, { lazy, Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Greeting from './components/Greeting';
import CountdownDisplay from './components/CountdownDisplay';
import TaskList from './components/TaskList';
import ScheduleTable from './components/ScheduleTable';
import StudyTimer from './components/StudyTimer';
import ImportantDates from './components/ImportantDates';
import FocusStats from './components/FocusStats';
import DeferredContent from './components/DeferredContent';
import PageLink from './components/PageLink';
import SiteHeader from './components/SiteHeader';
import StorageNotice from './components/StorageNotice';
import { readLogoutBackup, saveLogoutBackup, removeLogoutBackup, ACCOUNT_STORAGE_KEYS } from './utils/logoutBackup';
import { filterStudyHistory, mergeStudyHistoryReset } from './utils/studyHistory';
import { TvetCategoryModal } from './components/TvetCategoryModal';
import ConfirmExamSwitchModal from './components/ConfirmExamSwitchModal';
import { ScoreQueryModal, LoginSuggestionModal, ExamReminderModal } from './components/InfoModals';
import { ACHIEVEMENTS, Achievement, getLocalDateKey, reconcileStudyStreak } from './utils/achievements';
import { reconcileTempleCoins, getTempleCoinDifferences } from './utils/templeReconciliation';
import { AchievementToast } from './components/AchievementToast';
import { TodoItem, StudySession, User, AppData, ChallengeRecord, CustomDate, StreakData, Playlist, AudioTrack, TempleSyncData } from './types';
import { EXAM_PRESETS, ExamPreset, TVET_CATEGORIES } from './constants';
import { Settings, X, ExternalLink, Sparkles, Target, UserCircle, Cloud, Menu, CalendarDays, ArrowRight, ArrowLeft, FileText, Search, ClipboardCheck, AlertTriangle, Trophy, LayoutGrid, GraduationCap, Flame, Clock, Medal, ChevronRight, CheckCircle2, UsersRound, Shield, BookOpen, ScrollText, Lock, Server, ListChecks, RefreshCw, Headphones, Heart } from 'lucide-react';
import { authService } from './services/authService';
import { parseTaipeiDateTime } from './utils/time';
import { readStoredJson, safeLocalStorage, localStorageController } from './utils/storage';
import { updateSeoMetadata } from './utils/seo';
import { PAGE_ROUTES, ActivePage, AuthRouteMode, isExamId, normalizeExamId, readAppRoute, buildAppRoute, buildAuthRoute, hasAuthCallback } from './utils/appRoutes';
import AnalyticsConsent, { openAnalyticsSettings } from './components/AnalyticsConsent';
import { FORTUNES } from './data/fortunes';
import { useToday } from './utils/useToday';

const OfficialSchedulePage = lazy(() => import('./components/OfficialSchedulePage'));
const FocusStatsModal = lazy(() => import('./components/FocusStatsModal'));
const TodayCommunityStudy = lazy(() => import('./components/TodayCommunityStudy'));
const AuthPage = lazy(() => import('./components/AuthModal'));
const RankingBoard = lazy(() => import('./components/RankingBoard'));
const AccountPage = lazy(() => import('./components/AccountPage'));
const InstructionsPage = lazy(() => import('./components/InstructionsPage'));
const PrivacyPage = lazy(() => import('./components/PrivacyPage'));
const TermsPage = lazy(() => import('./components/TermsPage'));
const RefundPage = lazy(() => import('./components/RefundPage'));
const CustomerSupportPage = lazy(() => import('./components/CustomerSupportPage'));
const TempleModal = lazy(() => import('./components/TempleModal'));
const AchievementsModal = lazy(() => import('./components/AchievementsModal'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const DonationPage = lazy(() => import('./components/DonationPage'));
const AnnouncementsPage = lazy(() => import('./components/AnnouncementsPage'));

const PageLoading = () => (
  <div role="status" className="mx-auto grid min-h-[320px] w-full max-w-7xl place-items-center text-sm font-semibold text-slate-500">
    正在載入頁面…
  </div>
);

// 勳章清單是衍生資料，不可把瀏覽器或同步端傳來的 ID 當成授權依據。
// 只從可驗證的原始紀錄重新推算，避免任意寫入 ID 後直接顯示為已解鎖。
const getVerifiedAchievementIds = (data: Pick<AppData, 'tasks' | 'completedTaskIds' | 'studySessions' | 'streak'>): string[] => {
  return ACHIEVEMENTS.filter(achievement => {
    try {
      return achievement.condition(data as AppData);
    } catch {
      return false;
    }
  }).map(achievement => achievement.id);
};

const haveSameIds = (left: string[], right: string[]) =>
  left.length === right.length && left.every(id => right.includes(id));

const mergeCompletedTaskIds = (...sources: (Pick<AppData, 'tasks' | 'completedTaskIds'> | undefined)[]): string[] =>
  Array.from(new Set(sources.flatMap(source => [
    ...(source?.completedTaskIds || []),
    ...(source?.tasks || []).filter(task => task.completed).map(task => task.id),
  ]).filter(id => typeof id === 'string' && id.length > 0)));

// Helper to merge arrays by ID (Client-side Union)
// This prevents data loss when switching devices by merging local and cloud records
const mergeById = <T extends { id: string }>(local: T[], remote: T[] | undefined): T[] => {
  if (!remote || !Array.isArray(remote)) return local;
  const map = new Map(remote.map(item => [item.id, item]));
  local.forEach(item => {
    const remoteItem = map.get(item.id);
    const localUpdatedAt = Number((item as { updatedAt?: number }).updatedAt) || 0;
    const remoteUpdatedAt = Number((remoteItem as { updatedAt?: number } | undefined)?.updatedAt) || 0;
    // Legacy records have no timestamp and retain the existing local-first
    // behaviour. Newly edited records always keep the latest real change.
    if (!remoteItem || localUpdatedAt >= remoteUpdatedAt) map.set(item.id, item);
  });
  return Array.from(map.values());
};

const mergeDeletedIds = (local?: string[], remote?: string[]): string[] =>
  Array.from(new Set([...(remote || []), ...(local || [])]));

const mergeSyncMetadata = (local?: Record<string, number>, remote?: Record<string, number>): Record<string, number> => {
  const merged: Record<string, number> = { ...(remote || {}) };
  Object.entries(local || {}).forEach(([key, timestamp]) => {
    merged[key] = Math.max(merged[key] || 0, timestamp || 0);
  });
  return merged;
};

const chooseNewestValue = <T,>(key: string, local: T, remote: T, localMetadata: Record<string, number>, remoteMetadata: Record<string, number>): T =>
  (remoteMetadata[key] || 0) > (localMetadata[key] || 0) ? remote : local;

const mergeDeletedTracks = (
  local?: Record<string, string[]>,
  remote?: Record<string, string[]>,
): Record<string, string[]> => {
  const merged: Record<string, string[]> = {};
  new Set([...Object.keys(remote || {}), ...Object.keys(local || {})]).forEach(playlistId => {
    merged[playlistId] = mergeDeletedIds(local?.[playlistId], remote?.[playlistId]);
  });
  return merged;
};

const applyCustomDateDeletions = (dates: CustomDate[], deletedIds: string[]) => {
  const deleted = new Set(deletedIds);
  return dates.filter(date => !deleted.has(date.id));
};

// A playlist has two levels of independently editable data. Merge both the
// playlist and its tracks by ID so additions made on two devices are retained.
const mergePlaylists = (
  local: Playlist[],
  remote: Playlist[] | undefined,
  deletedPlaylistIds: string[] = [],
  deletedTrackIds: Record<string, string[]> = {},
): Playlist[] => {
  const withoutDeleted = (items: Playlist[]) => items
    .filter(playlist => !deletedPlaylistIds.includes(playlist.id))
    .map(playlist => ({
      ...playlist,
      tracks: (playlist.tracks || []).filter(track => !deletedTrackIds[playlist.id]?.includes(track.id)),
    }));
  if (!remote || !Array.isArray(remote)) return withoutDeleted(local);

  const remoteById = new Map(remote.map(playlist => [playlist.id, playlist]));
  const merged = remote.map(remotePlaylist => {
    const localPlaylist = local.find(playlist => playlist.id === remotePlaylist.id);
    if (!localPlaylist) return remotePlaylist;

    const localUpdatedAt = localPlaylist.updatedAt || 0;
    const remoteUpdatedAt = remotePlaylist.updatedAt || 0;
    const latestPlaylist = localUpdatedAt >= remoteUpdatedAt ? localPlaylist : remotePlaylist;

    return {
      ...latestPlaylist,
      tracks: mergeById(localPlaylist.tracks || [], remotePlaylist.tracks || []),
    };
  });

  local.forEach(playlist => {
    if (!remoteById.has(playlist.id)) merged.push(playlist);
  });

  return withoutDeleted(merged);
};

const mergeAppDataForSync = (local: AppData, remote?: AppData): AppData => {
  if (!remote) return local;
  const studyHistoryResetAt = mergeStudyHistoryReset(local.studyHistoryResetAt, remote.studyHistoryResetAt);
  const deletedCustomDateIds = mergeDeletedIds(local.deletedCustomDateIds, remote.deletedCustomDateIds);
  const deletedTaskIds = mergeDeletedIds(local.deletedTaskIds, remote.deletedTaskIds);
  const deletedPlaylistIds = mergeDeletedIds(local.deletedPlaylistIds, remote.deletedPlaylistIds);
  const deletedTrackIds = mergeDeletedTracks(local.deletedTrackIds, remote.deletedTrackIds);
  const syncMetadata = mergeSyncMetadata(local.syncMetadata, remote.syncMetadata);
  const localMetadata = local.syncMetadata || {};
  const remoteMetadata = remote.syncMetadata || {};
  return {
    ...remote,
    ...local,
    tasks: mergeById(local.tasks, remote.tasks).filter(task => !deletedTaskIds.includes(task.id)),
    completedTaskIds: mergeCompletedTaskIds(local, remote),
    studySessions: filterStudyHistory(mergeById(local.studySessions, remote.studySessions), studyHistoryResetAt),
    studyHistoryResetAt,
    challengeRecords: mergeById(local.challengeRecords, remote.challengeRecords),
    customDates: applyCustomDateDeletions(mergeById(local.customDates, remote.customDates), deletedCustomDateIds),
    deletedCustomDateIds,
    deletedTaskIds,
    syncMetadata,
    targetSchool: chooseNewestValue('targetSchool', local.targetSchool, remote.targetSchool, localMetadata, remoteMetadata),
    targetMajor: chooseNewestValue('targetMajor', local.targetMajor, remote.targetMajor, localMetadata, remoteMetadata),
    targetDateStr: chooseNewestValue('targetDateStr', local.targetDateStr, remote.targetDateStr, localMetadata, remoteMetadata),
    targetExam: chooseNewestValue('targetExam', local.targetExam, remote.targetExam, localMetadata, remoteMetadata),
    tvetCategory: chooseNewestValue('tvetCategory', local.tvetCategory, remote.tvetCategory, localMetadata, remoteMetadata),
    dailyGoal: chooseNewestValue('dailyGoal', local.dailyGoal, remote.dailyGoal, localMetadata, remoteMetadata),
    team: chooseNewestValue('team', local.team, remote.team, localMetadata, remoteMetadata),
    playlists: mergePlaylists(local.playlists, remote.playlists, deletedPlaylistIds, deletedTrackIds),
    deletedPlaylistIds,
    deletedTrackIds,
    incenseRecords: mergeById(local.incenseRecords, remote.incenseRecords),
    unlockedAchievementIds: Array.from(new Set([
      ...(remote.unlockedAchievementIds || []),
      ...(local.unlockedAchievementIds || []),
    ])),
    examChecklist: { ...(remote.examChecklist || {}), ...(local.examChecklist || {}) },
  };
};

const createSessionId = (): string =>
  crypto.randomUUID?.() || `session_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;

const DEFAULT_MUSIC_TRACKS: AudioTrack[] = [
  { id: 'lofi', name: '𝐑𝐧𝐁 𝐏𝐥𝐚𝐲𝐥𝐢𝐬𝐭', youtubeId: 'srsSm_nkPDc' },
  { id: 'rain', name: '窗外雨聲', youtubeId: 'mPZkdNFkNps' },
  { id: 'forest', name: '森林蟲鳴', youtubeId: 'xNN7iTA57jM' },
  { id: 'cafe', name: '咖啡廳', youtubeId: 'gaGrHUekGrc' },
  { id: 'night', name: 'Through the Night', youtubeId: 'BzYnNdJhZQw' },
  { id: 'white', name: 'Without You', youtubeId: 'HQDDlgGy2hg' },
  { id: 'alpha', name: 'Alpha 波', youtubeId: 'WPni755-Krg' },
];

const DEFAULT_PLAYLISTS: Playlist[] = [
  { id: 'default', name: '預設歌單', tracks: DEFAULT_MUSIC_TRACKS }
];

const getCurrentRoute = () => readAppRoute(new URL(window.location.href));
const getInitialExamId = () => {
  const storedExam = safeLocalStorage.getItem('gsat_target_exam');
  return getCurrentRoute().examId || normalizeExamId(storedExam || '') || '116gsat';
};
const getInitialDate = (examId: string) => {
  const preset = EXAM_PRESETS.find(exam => exam.id === examId);
  const storedDate = safeLocalStorage.getItem('gsat_target_date');
  const storedExam = safeLocalStorage.getItem('gsat_target_exam');
  const matchesExam = storedExam !== '115cap' && (!getCurrentRoute().examId || storedExam === examId);
  if (matchesExam && storedDate && Number.isFinite(parseTaipeiDateTime(storedDate).getTime())) return storedDate;
  return preset?.date || '2027-01-16T09:20:00';
};
const getInitialActivePage = (): ActivePage => getCurrentRoute().page;
const getAuthRouteMode = (): AuthRouteMode | undefined => getCurrentRoute().authMode;
const hasAuthCallbackParams = () => hasAuthCallback(new URL(window.location.href));
const getAppRouteUrl = (page: ActivePage, examId: string) =>
  buildAppRoute(page, examId, window.location.search, window.location.hash);
const getAuthRouteUrl = (page: ActivePage, examId: string, mode?: string) =>
  buildAuthRoute(page, examId, mode, window.location.search, window.location.hash);

const App: React.FC = () => {
  const today = useToday();
  const DEFAULT_DATE = '2027-01-16T09:20:00';
  
  // Data State
  const [initialExamId] = useState(getInitialExamId);
  const [targetExam, setTargetExam] = useState<string>(initialExamId);
  const currentExam = EXAM_PRESETS.find(p => p.id === targetExam);
  const [targetDateStr, setTargetDateStr] = useState<string>(() => getInitialDate(initialExamId));
  const [tvetCategory, setTvetCategory] = useState<string>(() => safeLocalStorage.getItem('gsat_tvet_category') || '');
  const [isTvetCategoryModalOpen, setIsTvetCategoryModalOpen] = useState(false);
  const [targetSchool, setTargetSchool] = useState<string>(() => safeLocalStorage.getItem('gsat_target_school') || '目標大學');
  const [targetMajor, setTargetMajor] = useState<string>(() => safeLocalStorage.getItem('gsat_target_major') || '目標科系');
  const [tasks, setTasks] = useState<TodoItem[]>(() => {
    return readStoredJson<TodoItem[]>('gsat_tasks', []);
  });
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(() =>
    mergeCompletedTaskIds({ tasks, completedTaskIds: readStoredJson<string[]>('gsat_completed_task_ids', []) }));
  const [studyHistoryResetAt, setStudyHistoryResetAt] = useState(() =>
    mergeStudyHistoryReset(readStoredJson<number>('gsat_study_history_reset_at', 0)));
  const studyHistoryResetRef = useRef(studyHistoryResetAt);
  const [studySessions, setStudySessionState] = useState<StudySession[]>(() => {
    return filterStudyHistory(readStoredJson<StudySession[]>('gsat_study_history', []), studyHistoryResetAt);
  });
  const setStudySessions = (update: React.SetStateAction<StudySession[]>) => {
    setStudySessionState(prev => filterStudyHistory(typeof update === 'function' ? update(prev) : update, studyHistoryResetRef.current));
  };
  const applyStudyHistoryReset = (remoteResetAt?: number) => {
    const next = mergeStudyHistoryReset(studyHistoryResetRef.current, remoteResetAt);
    if (next === studyHistoryResetRef.current) return;
    // Persist the marker before clearing records, including if refresh interrupts.
    localStorageController.writeRequired('gsat_study_history_reset_at', JSON.stringify(next));
    studyHistoryResetRef.current = next;
    setStudyHistoryResetAt(next);
    setStudySessions(prev => prev);
  };
  const [deletedTaskIds, setDeletedTaskIds] = useState<string[]>(() => {
    return readStoredJson<string[]>('gsat_deleted_task_ids', []);
  });
  const [syncMetadata, setSyncMetadata] = useState<Record<string, number>>(() => {
    return readStoredJson<Record<string, number>>('gsat_sync_metadata', {});
  });
  const [pendingStudySessionIds, setPendingStudySessionIds] = useState<string[]>(() => {
    return readStoredJson<string[]>('gsat_pending_study_session_ids', []);
  });
  const [challengeRecords, setChallengeRecords] = useState<ChallengeRecord[]>(() => {
    return readStoredJson<ChallengeRecord[]>('gsat_challenge_records', []);
  });
  const [customDates, setCustomDates] = useState<CustomDate[]>(() => {
    return readStoredJson<CustomDate[]>('gsat_custom_dates', []);
  });
  const [deletedCustomDateIds, setDeletedCustomDateIds] = useState<string[]>(() => {
    return readStoredJson<string[]>('gsat_deleted_custom_date_ids', []);
  });
  const [team, setTeam] = useState<string>(() => {
    return safeLocalStorage.getItem('gsat_team') || '';
  });

  // Playlist & Music State (Lifted Up)
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = safeLocalStorage.getItem('gsat_playlists');
    if (saved) return readStoredJson<Playlist[]>('gsat_playlists', DEFAULT_PLAYLISTS);
    
    // Migration: Convert old flat tracks to playlist if exists
    const oldTracks = safeLocalStorage.getItem('gsat_music_tracks');
    if (oldTracks) {
        try {
            const tracks = readStoredJson<AudioTrack[]>('gsat_music_tracks', []);
            return [{ id: 'default', name: '我的最愛', tracks }];
        } catch(e) {}
    }
    return DEFAULT_PLAYLISTS;
  });
  const [activePlaylistId, setActivePlaylistId] = useState<string>(() => {
      return safeLocalStorage.getItem('gsat_active_playlist_id') || 'default';
  });
  const [deletedPlaylistIds, setDeletedPlaylistIds] = useState<string[]>(() => {
    return readStoredJson<string[]>('gsat_deleted_playlist_ids', []);
  });
  const [deletedTrackIds, setDeletedTrackIds] = useState<Record<string, string[]>>(() => {
    return readStoredJson<Record<string, string[]>>('gsat_deleted_track_ids', {});
  });

  // Daily Goal & Streak State
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = safeLocalStorage.getItem('gsat_daily_goal');
    const minutes = Number(saved);
    return Number.isInteger(minutes) && minutes >= 30 && minutes <= 600 ? minutes : 120;
  });
  const [streak, setStreak] = useState<StreakData>(() => {
    return readStoredJson<StreakData>('gsat_streak', { current: 0, max: 0, lastDate: '' });
  });

  const [incenseCoins, setIncenseCoins] = useState<number>(() => {
    const saved = safeLocalStorage.getItem('gsat_incense_coins');
    const migrated = safeLocalStorage.getItem('gsat_incense_coins_migrated_v2');
    
    let coins = saved ? parseInt(saved, 10) : 0;
    
    if (!migrated) {
      const savedSessions = safeLocalStorage.getItem('gsat_study_history');
      if (savedSessions) {
        try {
          const sessions = readStoredJson<Array<{ durationMinutes?: number }>>('gsat_study_history', []);
          const pastCoins = sessions.reduce((acc: number, curr: any) => acc + (curr.durationMinutes || 0), 0);
          if (coins < pastCoins) {
             coins = pastCoins;
          }
        } catch (e) {}
      }
      safeLocalStorage.setItem('gsat_incense_coins_migrated_v2', 'true');
    }
    
    return coins;
  });
  const [incenseRecords, setIncenseRecords] = useState<AppData['incenseRecords']>(() => {
    return readStoredJson<AppData['incenseRecords']>('gsat_incense_records', []);
  });
  const [templeState, setTempleState] = useState<AppData['templeState']>(() => {
    return readStoredJson<AppData['templeState']>('gsat_temple_state', { lamps: [], fortunes: [], ticketOffered: false });
  });
  const [examChecklist, setExamChecklist] = useState<Record<string, boolean>>(() => {
    return readStoredJson<Record<string, boolean>>('gsat_exam_checklist', {});
  });

  
  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(() => getCurrentRoute().isAuth
    || (getCurrentRoute().page === 'account' && !readStoredJson<User | null>('gsat_user_profile', null)));
  const [routeRevision, setRouteRevision] = useState(0);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup' | 'forgot' | 'reset' | 'profile' | 'change-password' | 'devices' | undefined>(() => {
    const mode = getAuthRouteMode() || new URLSearchParams(window.location.search).get('authMode');
    return ['login', 'signup', 'forgot', 'reset', 'profile', 'change-password', 'devices'].includes(mode || '')
      ? mode as 'login' | 'signup' | 'forgot' | 'reset' | 'profile' | 'change-password' | 'devices'
      : undefined;
  });
  const [authInitialEmail, setAuthInitialEmail] = useState<string | undefined>(undefined);
  const [authInitialResetCode, setAuthInitialResetCode] = useState<string | undefined>(undefined);
  const [activePage, setActivePage] = useState<ActivePage>(() => getInitialActivePage());
  const [isScoreWarningOpen, setIsScoreWarningOpen] = useState(false);
  const [isLoginSuggestionOpen, setIsLoginSuggestionOpen] = useState(false);


  const [isExamReminderOpen, setIsExamReminderOpen] = useState(false);
  const [isTempleOpen, setIsTempleOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [pendingExamSwitch, setPendingExamSwitch] = useState<ExamPreset | null>(null);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<string[]>(() => {
    return readStoredJson<string[]>('gsat_unlocked_achievements', []);
  });
  const unlockedAchievementIdsRef = useRef(new Set(unlockedAchievementIds));
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const [currentAchievementToast, setCurrentAchievementToast] = useState<Achievement | null>(null);
  
  // Confirm Reset State
  const [confirmResetType, setConfirmResetType] = useState<'tasks' | 'sessions' | 'dates' | null>(null);

  const markSyncField = useCallback((field: string) => {
    const timestamp = Date.now();
    setSyncMetadata(prev => ({ ...prev, [field]: timestamp }));
  }, []);

  const setSyncedTasks = useCallback<React.Dispatch<React.SetStateAction<TodoItem[]>>>((value) => {
    setTasks(previous => {
      const next = typeof value === 'function' ? value(previous) : value;
      const nextIds = new Set(next.map(task => task.id));
      const removedIds = previous.filter(task => !nextIds.has(task.id)).map(task => task.id);
      if (removedIds.length > 0) setDeletedTaskIds(ids => mergeDeletedIds(ids, removedIds));
      return next;
    });
  }, []);

  const setSyncedTargetExam = useCallback<React.Dispatch<React.SetStateAction<string>>>((value) => {
    setTargetExam(value); markSyncField('targetExam');
  }, [markSyncField]);
  const setSyncedTargetDateStr = useCallback<React.Dispatch<React.SetStateAction<string>>>((value) => {
    setTargetDateStr(value); markSyncField('targetDateStr');
  }, [markSyncField]);
  const setSyncedTargetSchool = useCallback<React.Dispatch<React.SetStateAction<string>>>((value) => {
    setTargetSchool(value); markSyncField('targetSchool');
  }, [markSyncField]);
  const setSyncedTargetMajor = useCallback<React.Dispatch<React.SetStateAction<string>>>((value) => {
    setTargetMajor(value); markSyncField('targetMajor');
  }, [markSyncField]);
  const setSyncedDailyGoal = useCallback<React.Dispatch<React.SetStateAction<number>>>((value) => {
    setDailyGoal(value); markSyncField('dailyGoal');
  }, [markSyncField]);
  const setSyncedTeam = useCallback<React.Dispatch<React.SetStateAction<string>>>((value) => {
    setTeam(value); markSyncField('team');
  }, [markSyncField]);
  const setSyncedTvetCategory = useCallback<React.Dispatch<React.SetStateAction<string>>>((value) => {
    setTvetCategory(value); markSyncField('tvetCategory');
  }, [markSyncField]);
  const setSyncedExamChecklist = useCallback<React.Dispatch<React.SetStateAction<Record<string, boolean>>>>((value) => {
    setExamChecklist(value); markSyncField('examChecklist');
  }, [markSyncField]);

  // Info Modals State

  useEffect(() => {
    if (activePage === 'home') return;

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const frameId = window.requestAnimationFrame(scrollToTop);
    return () => window.cancelAnimationFrame(frameId);
  }, [activePage]);

  // Auth State
  const [user, setUser] = useState<User | null>(() => {
    return readStoredJson<User | null>('gsat_user_profile', null);
  });
  const templeRevisionRef = useRef(0);
  const [templeVerifiedOwner, setTempleVerifiedOwner] = useState<string | null>(null);
  const [studySyncError, setStudySyncError] = useState('');
  const isTempleVerified = Boolean(user && templeVerifiedOwner === user.email);
  useEffect(() => { templeRevisionRef.current = 0; setTempleVerifiedOwner(null); setStudySyncError(''); }, [user?.email]);
  const applyTempleSyncData = useCallback((data: TempleSyncData) => {
    if (data.revision !== undefined && data.revision < templeRevisionRef.current) return;
    templeRevisionRef.current = data.revision ?? templeRevisionRef.current;
    setTempleVerifiedOwner(user?.email || null);
    setIncenseCoins(Number.isSafeInteger(data.incenseCoins) && data.incenseCoins >= 0 ? data.incenseCoins : 0);
    setIncenseRecords(Array.isArray(data.incenseRecords) ? data.incenseRecords : []);
    const remoteState = data.templeState || { lamps: [], fortunes: [], ticketOffered: false };
    setTempleState({
      lamps: Array.isArray(remoteState.lamps) ? remoteState.lamps : [],
      fortunes: Array.isArray(remoteState.fortunes) ? remoteState.fortunes.map((fortune: any) => {
        const index = Number.isInteger(fortune?.index) ? Math.abs(fortune.index) % FORTUNES.length : 0;
        return { ...FORTUNES[index], date: Number(fortune?.date) || Date.now() };
      }) : [],
      ticketOffered: Boolean(remoteState.ticketOffered),
    });
  }, [user?.email]);

  useEffect(() => {
    if (activePage !== 'account' || user || isAuthOpen) return;
    setAuthInitialMode('login');
    setIsAuthOpen(true);
  }, [activePage, user, isAuthOpen]);

  useEffect(() => {
    const authMode = getAuthRouteMode();
    if (!isAuthOpen || !user || authMode === 'reset' || authMode === 'forgot') return;
    setIsAuthOpen(false);
    setActivePage(getCurrentRoute().page === 'home' ? 'account' : getCurrentRoute().page);
  }, [isAuthOpen, user]);
  
  // Store encryption key separately
  const [encryptionKey, setEncryptionKey] = useState<string | null>(() => {
    return safeLocalStorage.getItem('gsat_user_key');
  });

  const [isSyncing, setIsSyncing] = useState(false);
  // Never upload a device's cached snapshot until it has first been merged with
  // the account's cloud state. Without this guard, opening an older device can
  // overwrite a session that was just completed on another device.
  const [isCloudStateReady, setIsCloudStateReady] = useState(false);
  const syncTimeoutRef = useRef<number | null>(null);
  const syncInFlightRef = useRef(false);
  const syncPendingRef = useRef(false);
  const forceOverwriteRef = useRef(false);
  const latestAppDataRef = useRef<AppData | null>(null);
  const pendingStudySessionIdsRef = useRef(new Set(pendingStudySessionIds));
  const isBackgroundPullingRef = useRef(false);
  const forceSyncRef = useRef(false);
  const authInvalidationHandledRef = useRef(false);
  const isHandlingPopStateRef = useRef(false);
  const hasInitializedHistoryRef = useRef(false);

  useEffect(() => {
    // Remove passwords stored by older versions. Supabase sessions handle authentication.
    safeLocalStorage.removeItem('gsat_temp_pass');
  }, []);

    
  // Exam Selection Selection State
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return EXAM_PRESETS.find(p => p.id === (safeLocalStorage.getItem('gsat_target_exam') || '116gsat'))?.category || 'gsat';
  });

  useEffect(() => {
    const exam = EXAM_PRESETS.find(p => p.id === targetExam);
    if (exam) {
      setSelectedCategory(exam.category);
    }
  }, [targetExam]);

  useEffect(() => {
    const handlePopState = () => {
      isHandlingPopStateRef.current = true;
      setRouteRevision(revision => revision + 1);
      const route = getCurrentRoute();
      setActivePage(route.page);
      if (route.examId && route.examId !== targetExam) {
        setTargetExam(route.examId);
        const exam = EXAM_PRESETS.find(preset => preset.id === route.examId);
        if (exam) setTargetDateStr(exam.date);
      }
      setIsAuthOpen(route.isAuth);
      setAuthInitialMode((route.authMode || new URLSearchParams(window.location.search).get('authMode')) as typeof authInitialMode || undefined);
      setConfirmResetType(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [targetExam]);

  useEffect(() => {
    const callback = hasAuthCallbackParams();
    const currentUrl = window.location.pathname + window.location.search + window.location.hash;
    const routeUrl = callback ? currentUrl : isAuthOpen
      ? getAuthRouteUrl(activePage, targetExam, authInitialMode)
      : getAppRouteUrl(activePage, targetExam);
    const state = { ...window.history.state, appPage: activePage, examId: targetExam, auth: isAuthOpen };
    const replace = !hasInitializedHistoryRef.current || isHandlingPopStateRef.current || callback;
    isHandlingPopStateRef.current = false;
    hasInitializedHistoryRef.current = true;
    if (replace) window.history.replaceState(state, document.title, routeUrl);
    else if (currentUrl !== routeUrl) window.history.pushState(state, document.title, routeUrl);
  }, [activePage, targetExam, isAuthOpen, authInitialMode, routeRevision]);

  useEffect(() => {
    const examName = currentExam?.name || '大考';
    const authMode = getAuthRouteMode();
    const authLabels = { login: '登入帳號', signup: '註冊帳號', forgot: '忘記密碼', reset: '重設密碼' };
    const pageLabel = isAuthOpen ? (authMode ? authLabels[authMode] : '帳號管理') : PAGE_ROUTES[activePage].label;
    const title = pageLabel
      ? `${pageLabel} - ${examName}倒數 | Focus Space`
      : `${examName}倒數 - 學測・會考・統測・分科讀書助手`;
    const description = `${examName}倒數計時與備考助手，提供精準倒數、番茄鐘專注計時、讀書計畫、歷屆試題、成就徽章與雲端同步紀錄。`;

    updateSeoMetadata({
      title,
      description,
      canonicalPath: isAuthOpen ? buildAuthRoute(activePage, targetExam, authInitialMode) : buildAppRoute(activePage, targetExam),
      image: '/og-image.png',
      imageAlt: 'Focus Space 大考倒數：學測、會考、統測、分科測驗讀書計時助手',
    });
  }, [activePage, currentExam, targetExam, isAuthOpen, authInitialMode]);

  // Sync Logic (PUSH)
  useEffect(() => {
    const unsubscribeRecovery = authService.onPasswordRecovery(() => {
      setAuthInitialMode('reset');
      setIsAuthOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    });
    const unsubscribeOneTimeLogin = authService.onOneTimeLogin((res) => {
      if (res.success && res.user) {
        sessionStorage.setItem('gsat_welcome_type', 'login');
        handleLoginSuccess(res.user, res.data, res.encryptionKey);
        setIsAuthOpen(false);
      } else if (res.message) {
        alert(res.message);
        setAuthInitialMode('login');
        setIsAuthOpen(true);
      }
    });
    const unsubscribeSessionInvalidated = authService.onSessionInvalidated(() => {
      handleAuthError();
    });

    const parseUrlParams = () => {
      let queryString = window.location.search;
      if (!queryString && window.location.hash.includes('?')) {
        queryString = window.location.hash.substring(window.location.hash.indexOf('?'));
      }
      
      // Fallback for weird routing issues where ? is replaced or missing but parameters are in href
      if (!queryString && window.location.href.includes('reset=true')) {
         const match = window.location.href.match(/\?(.*)$/);
         if (match) queryString = '?' + match[1];
      }

      const params = new URLSearchParams(queryString);

      if (params.get('reset') === 'true') {
        setAuthInitialMode('reset');
        setIsAuthOpen(true);
      }
      
      return false;
    };

    parseUrlParams();
    return () => {
      unsubscribeRecovery();
      unsubscribeOneTimeLogin();
      unsubscribeSessionInvalidated();
    };
  }, []);

  // Exam Reminder Logic
  useEffect(() => {
     const checkExamReminder = () => {
       const now = new Date();
       const examDate = parseTaipeiDateTime(targetDateStr);
       const diffTime = examDate.getTime() - now.getTime();
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

       const hasSeenReminder = safeLocalStorage.getItem('gsat_exam_reminder_seen_116');
       
       if (diffDays <= 14 && diffDays >= 0 && !hasSeenReminder) {
          const timer = setTimeout(() => {
             if (!isLoginSuggestionOpen) {
                setIsExamReminderOpen(true);
             }
          }, 3000);
          return () => clearTimeout(timer);
       }
    };
    checkExamReminder();
  }, [targetDateStr, isLoginSuggestionOpen]);

  const handleCloseExamReminder = () => {
     setIsExamReminderOpen(false);
     safeLocalStorage.setItem('gsat_exam_reminder_seen_116', 'true');
  };

  // Login Suggestion Logic
  useEffect(() => {
     if (!user) {
        const hasSeenSuggestion = safeLocalStorage.getItem('gsat_login_suggestion_seen');
        if (!hasSeenSuggestion) {
           const timer = setTimeout(() => {
              if (!isAuthOpen && !isExamReminderOpen) {
                 setIsLoginSuggestionOpen(true);
              }
           }, 4000);
           return () => clearTimeout(timer);
        }
     }
  }, [user, isAuthOpen, isExamReminderOpen]);

  const handleCloseLoginSuggestion = () => {
     setIsLoginSuggestionOpen(false);
     safeLocalStorage.setItem('gsat_login_suggestion_seen', 'true');
  };

  const handleSuggestionToAuth = () => {
     setIsLoginSuggestionOpen(false);
     setIsAuthOpen(true);
     safeLocalStorage.setItem('gsat_login_suggestion_seen', 'true');
  };

  const handleAuthError = () => {
    if (authInvalidationHandledRef.current) return;
    authInvalidationHandledRef.current = true;
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    void authService.logout();
    setUser(null);
    setEncryptionKey(null);
    setIsCloudStateReady(false);
    safeLocalStorage.removeItem('gsat_user_profile');
    // Keep the cache owner ID after expiry. It is not an auth token, and is
    // needed to prevent a different login from adopting this account's data.
    safeLocalStorage.removeItem('gsat_temp_pass');
    setIsSyncing(false);
    setAuthInitialMode('login');
    setIsAuthOpen(true);
    window.setTimeout(() => {
      alert('登入已失效，為保護帳號安全，請重新登入。');
    }, 0);
  };

  useEffect(() => {
    if (!user) return;

    const validateCurrentSession = async () => {
      const result = await authService.validateSession();
      if (!result.success && authService.isAuthError(result)) {
        handleAuthError();
      }
    };

    void validateCurrentSession();
    const interval = window.setInterval(validateCurrentSession, 30000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void validateCurrentSession();
    };
    const handleFocus = () => void validateCurrentSession();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  // The server ledger is authoritative for all coin and ritual state. Refresh
  // it on sign-in so stale or edited localStorage never wins a sync race.
  useEffect(() => {
    if (!user) return;
    // A deployment may briefly serve a cached application shell beside a newer
    // chunk. Do not crash the whole page if that older service object lacks the
    // temple API; a refresh will load the matching hashed bundle.
    const templeReader = (authService as typeof authService & {
      getTempleState?: typeof authService.getTempleState;
    }).getTempleState;
    if (typeof templeReader !== 'function') {
      console.warn('Temple service is unavailable in this cached application bundle.');
      return;
    }
    let cancelled = false;
    void templeReader.call(authService).then(result => {
      if (!cancelled && result.success && result.data) applyTempleSyncData(result.data);
      if (!cancelled && !result.success) setStudySyncError(result.message || '目前無法核對香火幣，請稍後檢查並補傳。');
      if (!cancelled && !result.success && authService.isAuthError(result)) handleAuthError();
    });
    return () => { cancelled = true; };
  }, [user, applyTempleSyncData]);

  // Keep the newest render's complete state available to queued sync work. This
  // prevents an older network request from writing a stale closure after a
  // newer local edit has already happened.
  latestAppDataRef.current = {
    studyHistoryResetAt,
    tasks, completedTaskIds, studySessions, challengeRecords, targetSchool, targetMajor,
    targetDateStr, targetExam, tvetCategory, customDates, dailyGoal, streak,
    playlists, activePlaylistId, incenseCoins, incenseRecords, templeState,
    unlockedAchievementIds: getVerifiedAchievementIds({ tasks, completedTaskIds, studySessions, streak }), examChecklist, team, deletedCustomDateIds,
    deletedPlaylistIds, deletedTrackIds, deletedTaskIds, syncMetadata,
  };

  // Sync Logic (PUSH)
  const triggerSync = (immediate = false) => {
    if (!user || !encryptionKey || !isCloudStateReady) return;
    const skipRemoteMerge = forceOverwriteRef.current;
    if (skipRemoteMerge) forceOverwriteRef.current = false;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    const doSync = async () => {
       syncTimeoutRef.current = null;
       if (syncInFlightRef.current) {
         syncPendingRef.current = true;
         if (skipRemoteMerge) forceOverwriteRef.current = true;
         return;
       }
       const currentData = latestAppDataRef.current;
       if (!currentData) return;
       syncInFlightRef.current = true;
       setIsSyncing(true);
       try {
         const backupAtStart = readLogoutBackup(encryptionKey);
         // Re-read immediately before a write. This closes the window between
         // background polls and local edits, so records from another device are
         // unioned into this upload instead of being overwritten.
         const remoteRes = await authService.getData(user.email, '', encryptionKey);
         if (!remoteRes.success) {
           if (authService.isAuthError(remoteRes)) handleAuthError();
           else console.error('Cloud read failed; upload deferred', remoteRes.message);
           if (skipRemoteMerge) forceOverwriteRef.current = true;
           return;
         }
         applyStudyHistoryReset(remoteRes.data?.studyHistoryResetAt);
         const dataToSync = skipRemoteMerge
           ? currentData
           : mergeAppDataForSync(currentData, remoteRes.data);
         const res = await authService.syncData(user.email, '', dataToSync, encryptionKey, remoteRes.stateRevision);
         if (res.code === 'STATE_CONFLICT') {
           if (skipRemoteMerge) forceOverwriteRef.current = true;
           triggerSync();
           return;
         }
         if (!res.success && authService.isAuthError(res)) {
            handleAuthError();
         } else if (res.success) {
            const pendingSessions = filterStudyHistory(dataToSync.studySessions, studyHistoryResetRef.current).filter(session => pendingStudySessionIdsRef.current.has(session.id));
            const logRes = await authService.syncStudyLogs(pendingSessions, dataToSync.team, encryptionKey);
            setStudySyncError(logRes.success ? '' : logRes.message || '專注紀錄尚未入帳，稍後將再嘗試補傳。');
            if (logRes.syncedStudySessionIds?.length) {
              const acknowledged = new Set(logRes.syncedStudySessionIds);
              setPendingStudySessionIds(prev => prev.filter(id => !acknowledged.has(id)));
              if (logRes.data) applyTempleSyncData(logRes.data as unknown as TempleSyncData);
            }
            if (!logRes.success && authService.isAuthError(logRes)) {
               handleAuthError();
            } else if (logRes.success) {
               if (backupAtStart) removeLogoutBackup(encryptionKey, undefined, backupAtStart);
               if (logRes.data) applyTempleSyncData(logRes.data as unknown as TempleSyncData);
               if (pendingSessions.length > 0) {
                 const sentIds = new Set(pendingSessions.map(session => session.id));
                 setPendingStudySessionIds(prev => prev.filter(id => !sentIds.has(id)));
               }
            }
         }
       } catch (e) {
         console.error("Sync failed", e);
       } finally {
         syncInFlightRef.current = false;
         setIsSyncing(false);
         if (syncPendingRef.current) {
           syncPendingRef.current = false;
           triggerSync(true);
         }
       }
    };

    if (immediate) {
      doSync();
    } else {
      syncTimeoutRef.current = window.setTimeout(doSync, 2000);
    }
  };

  useEffect(() => {
    if (user && isCloudStateReady) triggerSync(true);
  }, [user, isCloudStateReady, pendingStudySessionIds]);

  useEffect(() => {
    let retryAttempts = 0;
    const reconnect = () => { retryAttempts = 0; triggerSync(true); };
    const retryPending = () => {
      if (navigator.onLine && document.visibilityState === 'visible' && pendingStudySessionIdsRef.current.size > 0 && retryAttempts < 5) {
        retryAttempts++; triggerSync(true);
      }
    };
    const refocus = () => { retryAttempts = 0; retryPending(); };
    window.addEventListener('online', reconnect);
    window.addEventListener('focus', refocus);
    const retryTimer = window.setInterval(retryPending, 30000);
    return () => {
      window.removeEventListener('online', reconnect);
      window.removeEventListener('focus', refocus);
      window.clearInterval(retryTimer);
    };
  }, [user, encryptionKey, isCloudStateReady, pendingStudySessionIds]);

  // Initial cloud hydration must happen before any persistence effect is allowed
  // to push localStorage back to the server. Array fields are unioned so a study
  // session added while this request is in flight is retained as well.
  useEffect(() => {
    if (!user || !encryptionKey) {
      setIsCloudStateReady(false);
      return;
    }

    let cancelled = false;
    let hydrating = false;
    let hydrated = false;
    setIsCloudStateReady(false);

    const hydrateCloudState = async () => {
      if (cancelled || hydrating || hydrated) return;
      hydrating = true;
      try {
        const [res, studyLogsRes] = await Promise.all([
          authService.getData(user.email, '', encryptionKey),
          authService.getStudySessions(),
        ]);
        if (cancelled) return;

        if (!res.success || !studyLogsRes.success) {
          if (authService.isAuthError(res)) handleAuthError();
          else if (authService.isAuthError(studyLogsRes)) handleAuthError();
          else console.error('Initial cloud synchronization failed', res.message || studyLogsRes.message);
          return;
        }

        const cloud = res.data;
        applyStudyHistoryReset(cloud?.studyHistoryResetAt);
        if (cloud) {
          setCompletedTaskIds(prev => mergeCompletedTaskIds({ tasks: [], completedTaskIds: prev }, cloud));
          const mergedDeletedCustomDates = mergeDeletedIds(deletedCustomDateIds, cloud.deletedCustomDateIds);
          const mergedDeletedTasks = mergeDeletedIds(deletedTaskIds, cloud.deletedTaskIds);
          const mergedDeletedPlaylists = mergeDeletedIds(deletedPlaylistIds, cloud.deletedPlaylistIds);
          const mergedDeletedTracks = mergeDeletedTracks(deletedTrackIds, cloud.deletedTrackIds);
          setDeletedCustomDateIds(mergedDeletedCustomDates);
          setDeletedTaskIds(mergedDeletedTasks);
          setSyncMetadata(prev => mergeSyncMetadata(prev, cloud.syncMetadata));
          setDeletedPlaylistIds(mergedDeletedPlaylists);
          setDeletedTrackIds(mergedDeletedTracks);
          if (cloud.tasks) setTasks(prev => mergeById(prev, cloud.tasks).filter(task => !mergedDeletedTasks.includes(task.id)));
          if (cloud.challengeRecords) setChallengeRecords(prev => mergeById(prev, cloud.challengeRecords));
          setCustomDates(prev => applyCustomDateDeletions(
            mergeById(prev, cloud.customDates),
            mergedDeletedCustomDates,
          ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
          if (cloud.unlockedAchievementIds) {
            setUnlockedAchievementIds(prev => Array.from(new Set([...prev, ...cloud.unlockedAchievementIds!])))
          }

          const remoteMetadata = cloud.syncMetadata || {};
          const shouldUseCloudValue = (field: string) => !(field in remoteMetadata) || (remoteMetadata[field] || 0) > (syncMetadata[field] || 0);
          if (cloud.team !== undefined && shouldUseCloudValue('team')) setTeam(cloud.team || '');
          setPlaylists(prev => mergePlaylists(prev, cloud.playlists, mergedDeletedPlaylists, mergedDeletedTracks));
          if (cloud.dailyGoal !== undefined && shouldUseCloudValue('dailyGoal')) setDailyGoal(cloud.dailyGoal);
          if (cloud.streak) setStreak(cloud.streak);
          if (cloud.examChecklist && shouldUseCloudValue('examChecklist')) setExamChecklist(cloud.examChecklist);
          if (cloud.targetSchool !== undefined && shouldUseCloudValue('targetSchool')) setTargetSchool(cloud.targetSchool);
          if (cloud.targetMajor !== undefined && shouldUseCloudValue('targetMajor')) setTargetMajor(cloud.targetMajor);
          if (cloud.targetDateStr && shouldUseCloudValue('targetDateStr')) setTargetDateStr(cloud.targetExam === '115cap' ? EXAM_PRESETS.find(exam => exam.id === '117cap')!.date : cloud.targetDateStr);
          if (cloud.targetExam && shouldUseCloudValue('targetExam')) setTargetExam(normalizeExamId(cloud.targetExam) || '116gsat');
          if (cloud.tvetCategory !== undefined && shouldUseCloudValue('tvetCategory')) setTvetCategory(cloud.tvetCategory || '');
          if (cloud.activePlaylistId) setActivePlaylistId(cloud.activePlaylistId);
        }
        const mergedSessions = filterStudyHistory(mergeById(
          mergeById(studySessions, cloud?.studySessions),
          studyLogsRes.sessions,
        ), studyHistoryResetRef.current).sort((a, b) => a.timestamp - b.timestamp);
        setStudySessions(prev => mergeById(prev, mergedSessions).sort((a, b) => a.timestamp - b.timestamp));

        // Restore all available history, including older offline sessions.
        const remotelyRecordedIds = new Set((studyLogsRes.sessions || []).map(session => session.id));
        const sessionsToBackfill = mergedSessions
          .filter(session => !remotelyRecordedIds.has(session.id))
          .map(session => session.id);
        setPendingStudySessionIds(prev => Array.from(new Set([
          ...prev, ...sessionsToBackfill,
        ])));

        if (!cancelled) { hydrated = true; setIsCloudStateReady(true); }
      } catch (error) {
        if (!cancelled) console.error('Initial cloud synchronization failed', error);
      } finally {
        hydrating = false;
      }
    };

    const retryHydration = () => { void hydrateCloudState(); };
    window.addEventListener('online', retryHydration);
    window.addEventListener('focus', retryHydration);
    void hydrateCloudState();
    return () => {
      cancelled = true;
      window.removeEventListener('online', retryHydration);
      window.removeEventListener('focus', retryHydration);
    };
  }, [user, encryptionKey]);

  // Background Poll Logic (PULL) with MERGE
  useEffect(() => {
     if (!user || !encryptionKey || !isCloudStateReady) return;

     const pullRemoteState = async () => {
        if (document.visibilityState !== 'visible' || isSyncing || syncTimeoutRef.current || isBackgroundPullingRef.current) return;
        isBackgroundPullingRef.current = true;

        try {
            const [res, studyLogsRes] = await Promise.all([
              authService.getData(user.email, '', encryptionKey),
              // Another device may upload an older offline session today. A
              // completion-time watermark would skip it indefinitely.
              authService.getStudySessions(),
            ]);
            
            if ((!res.success && authService.isAuthError(res)) || (!studyLogsRes.success && authService.isAuthError(studyLogsRes))) {
                handleAuthError();
                return;
            }
            if (res.success) applyStudyHistoryReset(res.data?.studyHistoryResetAt);
            const templeRes = await authService.getTempleState();
            if (templeRes.success && templeRes.data) applyTempleSyncData(templeRes.data);
            else if (authService.isAuthError(templeRes)) { handleAuthError(); return; }

            if (studyLogsRes.success) {
                const recordedIds = new Set((studyLogsRes.sessions || []).map(session => session.id));
                const underAwarded = new Set(templeRes.success && templeRes.data
                  ? getTempleCoinDifferences(studyLogsRes.sessions || [], templeRes.data.incenseRecords || [])
                    .filter(item => item.difference > 0).map(item => item.sessionId)
                  : recordedIds);
                setPendingStudySessionIds(prev => {
                  const remaining = prev.filter(id => !recordedIds.has(id) || underAwarded.has(id));
                  return remaining.length === prev.length ? prev : remaining;
                });
                setStudySessions(prev => {
                    const merged = mergeById(prev, studyLogsRes.sessions);
                    merged.sort((a, b) => a.timestamp - b.timestamp);
                    return JSON.stringify(merged) !== JSON.stringify(prev) ? merged : prev;
                });
            }

            if (res.success && res.data) {
                const cloud = res.data;
                setCompletedTaskIds(prev => {
                  const merged = mergeCompletedTaskIds({ tasks: [], completedTaskIds: prev }, cloud);
                  return haveSameIds(prev, merged) ? prev : merged;
                });
                const mergedDeletedCustomDates = mergeDeletedIds(deletedCustomDateIds, cloud.deletedCustomDateIds);
                const mergedDeletedTasks = mergeDeletedIds(deletedTaskIds, cloud.deletedTaskIds);
                const mergedDeletedPlaylists = mergeDeletedIds(deletedPlaylistIds, cloud.deletedPlaylistIds);
                const mergedDeletedTracks = mergeDeletedTracks(deletedTrackIds, cloud.deletedTrackIds);
                if (JSON.stringify(mergedDeletedCustomDates) !== JSON.stringify(deletedCustomDateIds)) {
                    setDeletedCustomDateIds(mergedDeletedCustomDates);
                }
                if (JSON.stringify(mergedDeletedTasks) !== JSON.stringify(deletedTaskIds)) {
                    setDeletedTaskIds(mergedDeletedTasks);
                }
                setSyncMetadata(prev => mergeSyncMetadata(prev, cloud.syncMetadata));
                if (JSON.stringify(mergedDeletedPlaylists) !== JSON.stringify(deletedPlaylistIds)) {
                    setDeletedPlaylistIds(mergedDeletedPlaylists);
                }
                if (JSON.stringify(mergedDeletedTracks) !== JSON.stringify(deletedTrackIds)) {
                    setDeletedTrackIds(mergedDeletedTracks);
                }
                
                // --- Merge Logic to prevent data loss ---
                
                // Tasks (Merge by ID)
                if (cloud.tasks) {
                    setTasks(prev => {
                       const merged = mergeById(prev, cloud.tasks).filter(task => !mergedDeletedTasks.includes(task.id));
                       return JSON.stringify(merged) !== JSON.stringify(prev) ? merged : prev;
                    });
                }
                
                // Sessions (Merge by ID + Sort)
                if (cloud.studySessions) setStudySessions(prev => {
                    const merged = mergeById(prev, cloud.studySessions);
                    merged.sort((a, b) => a.timestamp - b.timestamp);
                    return JSON.stringify(merged) !== JSON.stringify(prev) ? merged : prev;
                });

                // Challenge Records (Merge by ID)
                if (cloud.challengeRecords) {
                    setChallengeRecords(prev => {
                        const merged = mergeById(prev, cloud.challengeRecords);
                        return JSON.stringify(merged) !== JSON.stringify(prev) ? merged : prev;
                    });
                }

                // Custom Dates (Merge by ID + Sort)
                setCustomDates(prev => {
                    const merged = applyCustomDateDeletions(
                        mergeById(prev, cloud.customDates),
                        mergedDeletedCustomDates,
                    );
                    merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    return JSON.stringify(merged) !== JSON.stringify(prev) ? merged : prev;
                });

                const remoteMetadata = cloud.syncMetadata || {};
                const shouldUseCloudValue = (field: string) => !(field in remoteMetadata) || (remoteMetadata[field] || 0) > (syncMetadata[field] || 0);
                if (cloud.team !== undefined && shouldUseCloudValue('team')) {
                    setTeam(prev => prev !== cloud.team ? (cloud.team || '') : prev);
                }

                // Merge playlists and their tracks so additions on another device persist.
                setPlaylists(prev => {
                    const merged = mergePlaylists(prev, cloud.playlists, mergedDeletedPlaylists, mergedDeletedTracks);
                    return JSON.stringify(merged) !== JSON.stringify(prev) ? merged : prev;
                });

                // Single Value Fields (Cloud wins if different)
                if (cloud.dailyGoal && cloud.dailyGoal !== dailyGoal && shouldUseCloudValue('dailyGoal')) setDailyGoal(cloud.dailyGoal);
                // Streak (Complex object, use Cloud as master usually)
                if (cloud.streak && JSON.stringify(cloud.streak) !== JSON.stringify(streak)) setStreak(cloud.streak);

                if (cloud.unlockedAchievementIds) {
                    setUnlockedAchievementIds(prev => {
                        const merged = Array.from(new Set([...prev, ...(cloud.unlockedAchievementIds as string[])]));
                        if (JSON.stringify(merged) !== JSON.stringify(prev)) {
                            safeLocalStorage.setItem('gsat_unlocked_achievements', JSON.stringify(merged));
                            return merged;
                        }
                        return prev;
                    });
                }
                
                if (cloud.examChecklist && JSON.stringify(cloud.examChecklist) !== JSON.stringify(examChecklist) && shouldUseCloudValue('examChecklist')) {
                    setExamChecklist(cloud.examChecklist);
                }

                // Metadata
                if (cloud.targetSchool !== undefined && cloud.targetSchool !== targetSchool && shouldUseCloudValue('targetSchool')) setTargetSchool(cloud.targetSchool);
                if (cloud.targetMajor !== undefined && cloud.targetMajor !== targetMajor && shouldUseCloudValue('targetMajor')) setTargetMajor(cloud.targetMajor);
                if (cloud.targetDateStr && cloud.targetDateStr !== targetDateStr && shouldUseCloudValue('targetDateStr')) setTargetDateStr(cloud.targetExam === '115cap' ? EXAM_PRESETS.find(exam => exam.id === '117cap')!.date : cloud.targetDateStr);
                if (cloud.targetExam && cloud.targetExam !== targetExam && shouldUseCloudValue('targetExam')) setTargetExam(normalizeExamId(cloud.targetExam) || '116gsat');
            }
        } catch (e) {
            console.error("Polling error", e);
        } finally {
            isBackgroundPullingRef.current = false;
        }
     };

     const handleVisibilityChange = () => {
       if (document.visibilityState === 'visible') void pullRemoteState();
     };
     const handleWindowFocus = () => void pullRemoteState();
     const pollInterval = window.setInterval(() => void pullRemoteState(), 15 * 60 * 1000);

     document.addEventListener('visibilitychange', handleVisibilityChange);
     window.addEventListener('focus', handleWindowFocus);

     return () => {
       window.clearInterval(pollInterval);
       document.removeEventListener('visibilitychange', handleVisibilityChange);
       window.removeEventListener('focus', handleWindowFocus);
     };
  }, [user, encryptionKey, isCloudStateReady, isSyncing, dailyGoal, streak, targetSchool, targetMajor, targetDateStr, targetExam, tvetCategory, team, examChecklist, deletedTaskIds, syncMetadata, deletedCustomDateIds, deletedPlaylistIds, deletedTrackIds]); 
  // Note: We removed list dependencies (tasks, sessions) from useEffect to prevent reset loops.
  // We use functional state updates (setTasks(prev => ...)) inside to access latest state.

  // Persistence Effects
  useEffect(() => { 
    safeLocalStorage.setItem('gsat_tasks', JSON.stringify(tasks));
    triggerSync(forceSyncRef.current);
    if(forceSyncRef.current) forceSyncRef.current = false;
  }, [tasks]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_target_date', targetDateStr);
    triggerSync(); 
  }, [targetDateStr]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_target_exam', targetExam);
    triggerSync(); 
  }, [targetExam]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_tvet_category', tvetCategory);
    triggerSync(); 
  }, [tvetCategory]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_target_school', targetSchool);
    triggerSync(); 
  }, [targetSchool]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_target_major', targetMajor);
    triggerSync(); 
  }, [targetMajor]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_team', team);
    triggerSync(true); // force sync
  }, [team]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_study_history', JSON.stringify(studySessions));
    triggerSync(forceSyncRef.current);
    if(forceSyncRef.current) forceSyncRef.current = false;
  }, [studySessions]);

  useEffect(() => {
    safeLocalStorage.setItem('gsat_deleted_task_ids', JSON.stringify(deletedTaskIds));
    triggerSync();
  }, [deletedTaskIds]);
  useEffect(() => {
    safeLocalStorage.setItem('gsat_study_history_reset_at', JSON.stringify(studyHistoryResetAt));
    triggerSync(true);
    const allowedIds = new Set(studySessions.map(session => session.id));
    setPendingStudySessionIds(prev => prev.filter(id => allowedIds.has(id)));
  }, [studyHistoryResetAt]);

  useEffect(() => {
    safeLocalStorage.setItem('gsat_sync_metadata', JSON.stringify(syncMetadata));
    triggerSync();
  }, [syncMetadata]);

  useEffect(() => {
    safeLocalStorage.setItem('gsat_pending_study_session_ids', JSON.stringify(pendingStudySessionIds));
    pendingStudySessionIdsRef.current = new Set(pendingStudySessionIds);
  }, [pendingStudySessionIds]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_challenge_records', JSON.stringify(challengeRecords));
    triggerSync(); 
  }, [challengeRecords]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_custom_dates', JSON.stringify(customDates));
    triggerSync(); 
  }, [customDates]);

  useEffect(() => {
    safeLocalStorage.setItem('gsat_deleted_custom_date_ids', JSON.stringify(deletedCustomDateIds));
    triggerSync();
  }, [deletedCustomDateIds]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_daily_goal', dailyGoal.toString());
    triggerSync(); 
  }, [dailyGoal]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_streak', JSON.stringify(streak));
    triggerSync(); 
  }, [streak]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_playlists', JSON.stringify(playlists));
    triggerSync(); 
  }, [playlists]);

  useEffect(() => {
    safeLocalStorage.setItem('gsat_deleted_playlist_ids', JSON.stringify(deletedPlaylistIds));
    triggerSync();
  }, [deletedPlaylistIds]);

  useEffect(() => {
    safeLocalStorage.setItem('gsat_deleted_track_ids', JSON.stringify(deletedTrackIds));
    triggerSync();
  }, [deletedTrackIds]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_active_playlist_id', activePlaylistId);
    triggerSync(); 
  }, [activePlaylistId]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_incense_coins', incenseCoins.toString());
    triggerSync(); 
  }, [incenseCoins]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_incense_records', JSON.stringify(incenseRecords));
    triggerSync(); 
  }, [incenseRecords]);

  useEffect(() => { 
    safeLocalStorage.setItem('gsat_temple_state', JSON.stringify(templeState));
    triggerSync(); 
  }, [templeState]);

  useEffect(() => {
    safeLocalStorage.setItem('gsat_exam_checklist', JSON.stringify(examChecklist));
    triggerSync();
  }, [examChecklist]);

  useEffect(() => {
    safeLocalStorage.setItem('gsat_unlocked_achievements', JSON.stringify(unlockedAchievementIds));
    unlockedAchievementIdsRef.current = new Set(unlockedAchievementIds);
    triggerSync();
  }, [unlockedAchievementIds]);

  useEffect(() => {
    setCompletedTaskIds(previous => {
      const merged = mergeCompletedTaskIds({ tasks, completedTaskIds: previous });
      return haveSameIds(previous, merged) ? previous : merged;
    });
  }, [tasks]);

  useEffect(() => {
    safeLocalStorage.setItem('gsat_completed_task_ids', JSON.stringify(completedTaskIds));
    triggerSync();
  }, [completedTaskIds]);

  useEffect(() => { if(user) safeLocalStorage.setItem('gsat_user_profile', JSON.stringify(user)); }, [user]);
  useEffect(() => { if(encryptionKey) safeLocalStorage.setItem('gsat_user_key', encryptionKey); }, [encryptionKey]);

  // Streak Calculation Logic
  const checkStreakUpdate = (currentSessions: StudySession[]) => {
      const now = new Date();
      const todayStr = getLocalDateKey(now.getTime());
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = todayStart + 86400000;

      const todayTotal = currentSessions
        .filter(s => s.timestamp >= todayStart && s.timestamp < todayEnd)
        .reduce((acc, curr) => acc + curr.durationMinutes, 0);

      if (todayTotal >= dailyGoal) {
          if (streak.lastDate !== todayStr) {
              const yesterday = new Date(now);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = getLocalDateKey(yesterday.getTime());

              let newCurrent = 1;
              if (streak.lastDate === yesterdayStr) {
                  newCurrent = streak.current + 1;
              }

              const newStreak = {
                  current: newCurrent,
                  max: Math.max(streak.max, newCurrent),
                  lastDate: todayStr
              };
              setStreak(newStreak);
              
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
              audio.volume = 0.5;
              audio.play().catch(()=>{});
          }
      }
  };

  const handleSaveSession = (sessionData: Omit<StudySession, 'id'>) => {
    const newSession = { ...sessionData, id: createSessionId() };
    const updatedSessions = [...studySessions, newSession];
    safeLocalStorage.setItem('gsat_study_history', JSON.stringify(updatedSessions));
    setStudySessions(prev => [...prev, newSession]);
    
    checkStreakUpdate(updatedSessions);

    if (user) {
       // Persist the retry marker before starting the request so closing the
       // device while offline cannot leave an untracked study session.
       pendingStudySessionIdsRef.current.add(newSession.id);
       safeLocalStorage.setItem('gsat_pending_study_session_ids', JSON.stringify([...pendingStudySessionIdsRef.current]));
       setPendingStudySessionIds(prev => Array.from(new Set([...prev, newSession.id])));
       authService.logSession(user.email, '', newSession, team)
         .then(res => {
            setStudySyncError(res.success ? '' : res.message || '這筆專注尚未入帳，會在連線恢復後補傳。');
            if (res.syncedStudySessionIds?.includes(newSession.id)) {
              if (res.data) applyTempleSyncData(res.data as unknown as TempleSyncData);
              setPendingStudySessionIds(prev => prev.filter(id => id !== newSession.id));
            }
            if (!res.success && authService.isAuthError(res)) {
               handleAuthError();
            } else if (res.success) {
               // A study-log write can succeed even when the optional temple
               // ledger is not installed.  Do not retry an already persisted
               // session just because that auxiliary response is absent.
               if (res.data) applyTempleSyncData(res.data as unknown as TempleSyncData);
               setPendingStudySessionIds(prev => prev.filter(id => id !== newSession.id));
            } else {
               if (!res.syncedStudySessionIds?.includes(newSession.id)) setPendingStudySessionIds(prev => Array.from(new Set([...prev, newSession.id])));
            }
         })
         .catch(err => {
           console.error("Log session error", err);
           setStudySyncError('這筆專注尚未入帳，會稍後自動補傳；也可到文昌廟檢查並補傳。');
           setPendingStudySessionIds(prev => Array.from(new Set([...prev, newSession.id])));
         });
    }
  };

  const handleSaveChallenge = (record: Omit<ChallengeRecord, 'id'>) => {
    setChallengeRecords(prev => [...prev, { ...record, id: Date.now().toString(), updatedAt: Date.now() }]);
  };
  
  const executeReset = () => {
    forceSyncRef.current = true;
    if (confirmResetType === 'tasks') {
        setSyncedTasks([]);
    } else if (confirmResetType === 'sessions') {
        try { applyStudyHistoryReset(Date.now()); }
        catch (error) { console.error('History reset was not saved; reset cancelled', error); return; }
        setPendingStudySessionIds([]);
        setStudySessions([]);
    } else if (confirmResetType === 'dates') {
        setCustomDates(prev => {
          setDeletedCustomDateIds(deleted => mergeDeletedIds(deleted, prev.map(date => date.id)));
          return [];
        });
    }
    setConfirmResetType(null);
    setIsSettingsOpen(false);
  };

  const handleLoginSuccess = (loggedInUser: User, cloudData?: AppData, key?: string) => {
    const storageVersion = localStorageController.getFailureVersion();
    const previousOwner = safeLocalStorage.getItem('gsat_user_key');
    if (previousOwner && key && previousOwner !== key) {
      setIsCloudStateReady(false);
      if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null; }
      try {
        const existing = readLogoutBackup(previousOwner);
        const snapshot = latestAppDataRef.current || getCurrentData();
        saveLogoutBackup(previousOwner, existing ? mergeAppDataForSync(snapshot, existing.data) : snapshot,
          Array.from(new Set([...pendingStudySessionIdsRef.current, ...(existing?.pendingSessionIds || [])])));
      } catch {
        setUser(null); setEncryptionKey(null);
        safeLocalStorage.removeItem('gsat_user_profile');
        void authService.logout();
        window.alert('前一個帳號的資料尚無法安全備份，請保留此頁面，稍後再切換帳號。');
        return;
      }
      // Load the newly authenticated account from a clean cache. The former
      // owner's backup stays under its own ID until that owner signs in again.
      ACCOUNT_STORAGE_KEYS.filter(storageKey => !['gsat_user_key', 'gsat_user_profile'].includes(storageKey))
        .forEach(storageKey => safeLocalStorage.removeItem(storageKey));
      if (localStorageController.getFailureVersion() !== storageVersion) {
        setUser(null); setEncryptionKey(null);
        void authService.logout();
        window.alert('本機資料尚無法安全切換，請保留此頁面，稍後再試。');
        return;
      }
      safeLocalStorage.setItem('gsat_user_profile', JSON.stringify(loggedInUser));
      safeLocalStorage.setItem('gsat_user_key', key);
      if (localStorageController.getFailureVersion() !== storageVersion) {
        setUser(null); setEncryptionKey(null);
        void authService.logout();
        window.alert('帳號資料尚無法保存，請保留此頁面，稍後再試。');
        return;
      }
      window.location.replace(buildAppRoute(activePage, cloudData?.targetExam || '116gsat'));
      return;
    }
    const backup = key ? readLogoutBackup(key) : null;
    authInvalidationHandledRef.current = false;
    setUser(loggedInUser);
    safeLocalStorage.setItem('gsat_user_profile', JSON.stringify(loggedInUser));
    if (key) {
      setEncryptionKey(key);
      safeLocalStorage.setItem('gsat_user_key', key);
    }
    
    // Prepare remote data (empty if undefined) to allow merging with local data
    const remoteData = (backup ? mergeAppDataForSync(backup.data, cloudData) : cloudData) || {
        tasks: [],
        studySessions: [],
        challengeRecords: [],
        customDates: [],
        targetSchool: '',
        targetMajor: '',
        targetDateStr: '',
        dailyGoal: 0,
        streak: { current: 0, max: 0, lastDate: '' },
        playlists: [],
        activePlaylistId: 'default',
        incenseCoins: 0,
        incenseRecords: [],
        templeState: { lamps: [], fortunes: [], ticketOffered: false },
        team: ''
    };

    // Merge logic: Combine local and remote, preferring local updates but including remote additions
    const mergedDeletedTasks = mergeDeletedIds(deletedTaskIds, remoteData.deletedTaskIds);
    const mergedTasks = mergeById(tasks, remoteData.tasks).filter(task => !mergedDeletedTasks.includes(task.id));
    const mergedCompletedTaskIds = mergeCompletedTaskIds({ tasks, completedTaskIds }, remoteData);
    const resetAt = mergeStudyHistoryReset(previousOwner === key ? studyHistoryResetRef.current : 0, remoteData.studyHistoryResetAt);
    safeLocalStorage.setItem('gsat_study_history_reset_at', JSON.stringify(resetAt));
    const mergedSessions = filterStudyHistory(mergeById(studySessions, remoteData.studySessions), resetAt);
    mergedSessions.sort((a, b) => a.timestamp - b.timestamp);
    
    const mergedChallenges = mergeById(challengeRecords, remoteData.challengeRecords);
    
    const mergedDeletedCustomDates = mergeDeletedIds(deletedCustomDateIds, remoteData.deletedCustomDateIds);
    const mergedDeletedPlaylists = mergeDeletedIds(deletedPlaylistIds, remoteData.deletedPlaylistIds);
    const mergedDeletedTracks = mergeDeletedTracks(deletedTrackIds, remoteData.deletedTrackIds);
    const mergedSyncMetadata = mergeSyncMetadata(syncMetadata, remoteData.syncMetadata);
    const mergedCustomDates = applyCustomDateDeletions(
      mergeById(customDates, remoteData.customDates),
      mergedDeletedCustomDates,
    );
    mergedCustomDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const mergedPlaylists = mergePlaylists(playlists, remoteData.playlists, mergedDeletedPlaylists, mergedDeletedTracks);
    
    const mergedIncenseRecords = mergeById(incenseRecords, remoteData.incenseRecords);
    mergedIncenseRecords.sort((a, b) => b.timestamp - a.timestamp);

    // Save merged state to local storage
    safeLocalStorage.setItem('gsat_tasks', JSON.stringify(mergedTasks));
    safeLocalStorage.setItem('gsat_completed_task_ids', JSON.stringify(mergedCompletedTaskIds));
    safeLocalStorage.setItem('gsat_deleted_task_ids', JSON.stringify(mergedDeletedTasks));
    safeLocalStorage.setItem('gsat_sync_metadata', JSON.stringify(mergedSyncMetadata));
    safeLocalStorage.setItem('gsat_study_history', JSON.stringify(mergedSessions));
    safeLocalStorage.setItem('gsat_challenge_records', JSON.stringify(mergedChallenges));
    safeLocalStorage.setItem('gsat_custom_dates', JSON.stringify(mergedCustomDates));
    safeLocalStorage.setItem('gsat_deleted_custom_date_ids', JSON.stringify(mergedDeletedCustomDates));
    safeLocalStorage.setItem('gsat_playlists', JSON.stringify(mergedPlaylists));
    safeLocalStorage.setItem('gsat_deleted_playlist_ids', JSON.stringify(mergedDeletedPlaylists));
    safeLocalStorage.setItem('gsat_deleted_track_ids', JSON.stringify(mergedDeletedTracks));
    safeLocalStorage.setItem('gsat_incense_records', JSON.stringify(mergedIncenseRecords));
    if (backup) {
      safeLocalStorage.setItem('gsat_pending_study_session_ids', JSON.stringify(Array.from(new Set([
        ...pendingStudySessionIdsRef.current, ...backup.pendingSessionIds,
      ])).filter(id => mergedSessions.some(session => session.id === id))));
      safeLocalStorage.setItem('gsat_exam_checklist', JSON.stringify(remoteData.examChecklist || {}));
    }
    
    // For configuration values, prioritize remote if present, otherwise keep local (e.g. upload local to new account)
    if (remoteData.targetSchool !== undefined) safeLocalStorage.setItem('gsat_target_school', remoteData.targetSchool);
    if (remoteData.targetMajor !== undefined) safeLocalStorage.setItem('gsat_target_major', remoteData.targetMajor);
    if (remoteData.targetDateStr) safeLocalStorage.setItem('gsat_target_date', remoteData.targetDateStr);
    if (remoteData.targetExam) safeLocalStorage.setItem('gsat_target_exam', remoteData.targetExam);
    if (remoteData.tvetCategory) safeLocalStorage.setItem('gsat_tvet_category', remoteData.tvetCategory);
    if (remoteData.dailyGoal) safeLocalStorage.setItem('gsat_daily_goal', remoteData.dailyGoal.toString());
    if (remoteData.streak && remoteData.streak.lastDate) safeLocalStorage.setItem('gsat_streak', JSON.stringify(remoteData.streak));
    if (remoteData.activePlaylistId) safeLocalStorage.setItem('gsat_active_playlist_id', remoteData.activePlaylistId);
    if (remoteData.incenseCoins !== undefined) safeLocalStorage.setItem('gsat_incense_coins', remoteData.incenseCoins.toString());
    if (remoteData.templeState) safeLocalStorage.setItem('gsat_temple_state', JSON.stringify(remoteData.templeState));
    if (remoteData.team !== undefined) safeLocalStorage.setItem('gsat_team', remoteData.team);

    // Set welcome flag for next load
    try { sessionStorage.setItem('gsat_welcome_pending', 'true'); } catch { /* Optional welcome notice. */ }

    if (localStorageController.getFailureVersion() !== storageVersion) {
      // Keep merged data in the running app. Reloading would discard writes
      // that only survived in memory while browser storage was full.
      studyHistoryResetRef.current = resetAt;
      setStudyHistoryResetAt(resetAt);
      setTasks(mergedTasks); setStudySessions(mergedSessions);
      setCompletedTaskIds(mergedCompletedTaskIds);
      setChallengeRecords(mergedChallenges); setCustomDates(mergedCustomDates);
      setDeletedTaskIds(mergedDeletedTasks); setDeletedCustomDateIds(mergedDeletedCustomDates);
      setSyncMetadata(mergedSyncMetadata); setPlaylists(mergedPlaylists);
      setDeletedPlaylistIds(mergedDeletedPlaylists); setDeletedTrackIds(mergedDeletedTracks);
      setPendingStudySessionIds(readStoredJson<string[]>('gsat_pending_study_session_ids', []));
      setTargetSchool(remoteData.targetSchool ?? targetSchool);
      setTargetMajor(remoteData.targetMajor ?? targetMajor);
      setTargetDateStr(remoteData.targetDateStr || targetDateStr);
      setTargetExam(remoteData.targetExam || targetExam);
      setTvetCategory(remoteData.tvetCategory || '');
      setDailyGoal(remoteData.dailyGoal || dailyGoal);
      setStreak(remoteData.streak || streak); setTeam(remoteData.team || '');
      setActivePlaylistId(remoteData.activePlaylistId || activePlaylistId);
      setExamChecklist(remoteData.examChecklist || examChecklist);
      setIsAuthOpen(false);
      return;
    }

    // Reload the requested page with the merged account state.
    const loginExam = remoteData.targetExam || targetExam;
    window.location.replace(buildAppRoute(activePage, loginExam));
  };

  const handleTempleRitual = useCallback(async (ritualType: 'lamp' | 'fortune' | 'ticket') => {
    if (!user) throw new Error('請先登入，才能使用香火幣。');
    if (!isTempleVerified) throw new Error('點數尚未完成核對，請先到學習歷程檢查同步。');
    const templeWriter = (authService as typeof authService & {
      performTempleRitual?: typeof authService.performTempleRitual;
    }).performTempleRitual;
    if (typeof templeWriter !== 'function') throw new Error('頁面正在更新，請重新整理後再進行儀式。');
    const result = await templeWriter.call(authService, createSessionId(), ritualType);
    if (!result.success || !result.data) throw new Error(result.message || '儀式執行失敗');
    applyTempleSyncData(result.data);
    if (ritualType === 'fortune') {
      const latest = (result.data.templeState?.fortunes as any[])?.[0];
      const index = Number.isInteger(latest?.index) ? Math.abs(latest.index) % FORTUNES.length : 0;
      return FORTUNES[index];
    }
  }, [user, isTempleVerified, applyTempleSyncData]);

  const prepareLogout = (): boolean => {
    try {
      if (!encryptionKey || !latestAppDataRef.current) throw new Error('Missing account snapshot');
      saveLogoutBackup(encryptionKey, latestAppDataRef.current, Array.from(pendingStudySessionIdsRef.current));
      return true;
    } catch (error) {
      console.error('Logout backup failed', error);
      window.alert('尚未同步的資料無法安全備份，已停止登出。請保留此頁面，稍後再試。');
      return false;
    }
  };

  const handleLogout = async (discardData = false) => {
    if (!discardData && !prepareLogout()) return;
    if (discardData && encryptionKey) removeLogoutBackup(encryptionKey);
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    await authService.logout();
    const keysToRemove = ACCOUNT_STORAGE_KEYS;
    
    keysToRemove.forEach(key => safeLocalStorage.removeItem(key));
    
    setUser(null);
    setEncryptionKey(null);
    setIsCloudStateReady(false);
    
    window.location.reload();
  };

  const getCurrentData = (): AppData => ({
    studyHistoryResetAt,
    tasks,
    completedTaskIds,
    studySessions,
    challengeRecords,
    targetSchool,
    targetMajor,
    targetDateStr,
    targetExam,
    tvetCategory,
    customDates,
    deletedCustomDateIds,
    dailyGoal,
    streak,
    playlists,
    deletedPlaylistIds,
    deletedTrackIds,
    activePlaylistId,
    incenseCoins,
    incenseRecords,
    templeState,
    unlockedAchievementIds: getVerifiedAchievementIds({ tasks, completedTaskIds, studySessions, streak }),
    examChecklist,
    team,
  });

  const handleCheckStudySync = async (): Promise<string> => {
    if (!user || !encryptionKey) throw new Error('請先登入，才能核對這個裝置與雲端的紀錄。');
    const [cloud, logs] = await Promise.all([
      authService.getData(user.email, '', encryptionKey),
      authService.getStudySessions(),
    ]);
    if (!cloud.success || !logs.success) throw new Error(cloud.message || logs.message || '目前無法讀取雲端，請稍後再檢查。');
    applyStudyHistoryReset(cloud.data?.studyHistoryResetAt);
    const merged = filterStudyHistory(mergeById(
      mergeById(latestAppDataRef.current?.studySessions || studySessions, cloud.data?.studySessions), logs.sessions,
    ), studyHistoryResetRef.current);
    setStudySessions(prev => mergeById(prev, merged).sort((a, b) => a.timestamp - b.timestamp));
    const recorded = new Set((logs.sessions || []).map(session => session.id));
    const retry = merged.filter(session =>
      !recorded.has(session.id) || pendingStudySessionIdsRef.current.has(session.id));
    setPendingStudySessionIds(prev => Array.from(new Set([
      ...prev, ...retry.map(session => session.id),
    ])));
    // Await the actual ledger writes; enqueuing alone is not a completed repair.
    const repair = retry.length ? await authService.syncStudyLogs(retry, team, encryptionKey) : null;
    const acknowledged = new Set(repair?.syncedStudySessionIds || []);
    if (acknowledged.size) {
      setPendingStudySessionIds(prev => prev.filter(id => !acknowledged.has(id)));
      if (repair?.data) applyTempleSyncData(repair.data as unknown as TempleSyncData);
    }
    const remaining = retry.filter(session => !acknowledged.has(session.id));
    setStudySyncError(repair && !repair.success ? repair.message || '部分紀錄尚未入帳，請查看核對結果。' : '');
    const repairedStreak = reconcileStudyStreak(merged, dailyGoal, streak);
    setStreak(repairedStreak);
    const verified = getVerifiedAchievementIds({ tasks, completedTaskIds, studySessions: merged, streak: repairedStreak });
    const restored = verified.filter(id => !unlockedAchievementIdsRef.current.has(id)).length;
    const temple = await authService.getTempleState();
    if (temple.success && temple.data) applyTempleSyncData(temple.data);
    const durableSessions = mergeById(logs.sessions || [], retry.filter(session => acknowledged.has(session.id)));
    const coinAudit = temple.success && temple.data
      ? reconcileTempleCoins(durableSessions, temple.data.incenseRecords || [], temple.data.incenseCoins) : null;
    const coinDifferences = temple.success && temple.data
      ? getTempleCoinDifferences(durableSessions, temple.data.incenseRecords || []) : [];
    const minutes = merged.reduce((total, session) => total + session.durationMinutes, 0);
    return [
      `已合併本機與雲端：共 ${merged.length} 筆，${Math.floor(minutes / 60)} 小時 ${minutes % 60} 分鐘。`,
      `已在專注帳本入帳 ${merged.filter(session => recorded.has(session.id) || acknowledged.has(session.id)).length} 筆；本次補傳成功 ${acknowledged.size} 筆；${remaining.length} 筆仍待處理。`,
      repair && !repair.success ? `補傳未完成：${repair.message || '請稍後重試，或核對是否與既有紀錄時段重疊。'}` : '',
      `依合併後紀錄重新核對獎章，本次符合補發條件 ${restored} 枚。`,
      temple.success && temple.data ? `文昌可用香火幣：${temple.data.incenseCoins} 枚（已扣除帳本中的儀式支出）。` : `文昌點數尚無法確認：${temple.message || '請稍後再試'}。`,
      coinAudit ? `香火幣核對：累計入帳 ${coinAudit.minutes} 分鐘 → ${coinAudit.earned} 枚，祈福已花費 ${coinAudit.spent} 枚，可用 ${coinAudit.balance} 枚。${coinAudit.matches ? '帳本一致。' : '目前快照不一致，若仍有同步進行，請完成後再次檢查；持續不一致請聯絡支援。'}` : '',
      coinAudit && coinAudit.minutes > coinAudit.earned ? `已入帳分鐘與發幣收入相差 ${coinAudit.minutes - coinAudit.earned} 枚；這是發幣金額差異，不是待補傳筆數。若重新檢查後仍存在，需管理員更新舊紀錄差額修復。` : '',
      ...coinDifferences.slice(0, 5).map(item => `差異紀錄：${new Date(item.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} ${item.subjectName}，${item.minutes} 分鐘，已發 ${item.awarded} 枚，${item.difference > 0 ? '少發' : '多記'} ${Math.abs(item.difference)} 枚（紀錄 ${item.sessionId}）。`),
      coinDifferences.length > 5 ? `另有 ${coinDifferences.length - 5} 筆金額差異，請保留紀錄供核對。` : '',
      '每筆專注以完整分鐘計算，未滿 1 分鐘不入帳；休息不發幣。清空學習歷程僅隱藏舊紀錄，不會重新發幣或退還祈福支出。',
      '請在另一台裝置也開啟網站並檢查同步，才能核對仍只存在那台裝置的紀錄。',
    ].filter(Boolean).join('\n');
  };

  const isInitialMount = useRef(true);

  useEffect(() => {
    setStreak(previous => {
      const next = reconcileStudyStreak(studySessions, dailyGoal, previous);
      return next.current === previous.current && next.max === previous.max && next.lastDate === previous.lastDate ? previous : next;
    });
  }, [studySessions, dailyGoal, streak.current, streak.max, streak.lastDate, today]);

  useEffect(() => {
    const data = getCurrentData();
    const shouldNotify = !isInitialMount.current;
    const verifiedIds = getVerifiedAchievementIds(data);
    const verifiedIdSet = new Set(verifiedIds);
    const knownUnlockedIds = new Set(
      [...unlockedAchievementIdsRef.current].filter(id => verifiedIdSet.has(id)),
    );

    const newUnlocked = ACHIEVEMENTS.filter(achievement => {
      if (knownUnlockedIds.has(achievement.id)) return false;
      return verifiedIdSet.has(achievement.id);
    });

    unlockedAchievementIdsRef.current = verifiedIdSet;
    if (!haveSameIds(unlockedAchievementIds, verifiedIds)) {
      setUnlockedAchievementIds(verifiedIds);
    }

    if (newUnlocked.length > 0) {
      if (shouldNotify) {
        setAchievementQueue(queue => {
          const queuedIds = new Set([
            ...queue.map(achievement => achievement.id),
            ...(currentAchievementToast ? [currentAchievementToast.id] : []),
          ]);
          return [
            ...queue,
            ...newUnlocked.filter(achievement => !queuedIds.has(achievement.id)),
          ];
        });
      }
    }

    isInitialMount.current = false;
  }, [studySessions, tasks, completedTaskIds, streak, unlockedAchievementIds, currentAchievementToast]);

  useEffect(() => {
    if (!currentAchievementToast && achievementQueue.length > 0) {
      setCurrentAchievementToast(achievementQueue[0]);
      setAchievementQueue(prev => prev.slice(1));
    }
  }, [currentAchievementToast, achievementQueue]);

  const handleAchievementToastClose = useCallback(() => {
    setCurrentAchievementToast(null);
  }, []);

  const EXAM_LINKS = {
    '117gsat': {
      pastTitle: '學測歷屆試題',
      pastUrl: 'https://www.ceec.edu.tw/xmfile?xsmsid=0J052424829869345634',
      scoreTitle: '學測成績查詢',
      scoreUrl: 'https://ap.ceec.edu.tw/RegExam/ScoreSearch/Login?examtype=A',
    },
    '116gsat': {
      pastTitle: '學測歷屆試題',
      pastUrl: 'https://www.ceec.edu.tw/xmfile?xsmsid=0J052424829869345634',
      scoreTitle: '學測成績查詢',
      scoreUrl: 'https://ap.ceec.edu.tw/RegExam/ScoreSearch/Login?examtype=A',
    },
    '116cap': {
      pastTitle: '會考歷屆試題',
      pastUrl: 'https://cap.rcpet.edu.tw/examination.html',
      scoreTitle: '會考成績查詢',
      scoreUrl: 'https://cap.rcpet.edu.tw/',
    },
    '117cap': {
      pastTitle: '會考歷屆試題',
      pastUrl: 'https://cap.rcpet.edu.tw/examination.html',
      scoreTitle: '會考成績查詢',
      scoreUrl: 'https://cap.rcpet.edu.tw/',
    },
    '116tvet': {
      pastTitle: '統測歷屆試題',
      pastUrl: 'https://www.tcte.edu.tw/index.php?mod=TVETest/down_exam4y',
      scoreTitle: '統測成績查詢',
      scoreUrl: 'https://www.tcte.edu.tw/NetServer/forward_score.php',
    },
    '115tvet': {
      pastTitle: '統測歷屆試題',
      pastUrl: 'https://www.tcte.edu.tw/index.php?mod=TVETest/down_exam4y',
      scoreTitle: '統測成績查詢',
      scoreUrl: 'https://www.tcte.edu.tw/NetServer/forward_score.php',
    },
    '116ast': {
      pastTitle: '分科歷屆試題',
      pastUrl: 'https://www.ceec.edu.tw/xmfile?xsmsid=0J052427633128416650',
      scoreTitle: '分科成績查詢',
      scoreUrl: 'https://www.ceec.edu.tw/',
    },
    '115ast': {
      pastTitle: '分科歷屆試題',
      pastUrl: 'https://www.ceec.edu.tw/xmfile?xsmsid=0J052427633128416650',
      scoreTitle: '分科成績查詢',
      scoreUrl: 'https://www.ceec.edu.tw/',
    }
  };
  const currentExamLinks = EXAM_LINKS[targetExam as keyof typeof EXAM_LINKS] || EXAM_LINKS['116gsat'];
  const currentExamPreset = EXAM_PRESETS.find(p => p.id === targetExam) || EXAM_PRESETS.find(p => p.id === '116gsat') || EXAM_PRESETS[0];
  const promoResource = (() => {
    const year = currentExamPreset?.year || 116;
    const category = currentExamPreset?.category || 'gsat';
    if (category === 'tvet') {
      return {
        href: 'https://tyctw.github.io/university/',
        badge: `${year} 統測生必看`,
        title: '四技二專升學管道與日程',
        description: `${year} 學年度四技二專甄選入學、登記分發與重要簡章資訊整理，適合統測考生追蹤後續升學流程。`,
        action: '查看技專升學資訊',
        accent: 'from-emerald-500 to-teal-500',
        glow: 'from-emerald-200 to-teal-200',
        text: 'text-emerald-600',
        border: 'hover:border-emerald-200',
      };
    }
    if (category === 'cap') {
      return {
        href: 'https://tyctw.github.io/spare/',
        badge: `${year} 會考落點分析`,
        title: '會考落點分析與志願評估',
        description: `${year} 學年度會考落點分析工具，協助會考考生依成績區間評估高中職志願選填方向。`,
        action: '查看會考落點分析',
        accent: 'from-sky-500 to-cyan-500',
        glow: 'from-sky-200 to-cyan-200',
        text: 'text-sky-600',
        border: 'hover:border-sky-200',
      };
    }
    if (category === 'ast') {
      return {
        href: 'https://tyctw.github.io/university/',
        badge: `${year} 分科生必看`,
        title: '分發入學與升大學日程',
        description: `${year} 學年度分科測驗後續升學重要日期、簡章公告、分發入學與大學入學管道整理。`,
        action: '查看分科升學時程',
        accent: 'from-pink-500 to-rose-500',
        glow: 'from-pink-200 to-rose-200',
        text: 'text-rose-600',
        border: 'hover:border-rose-200',
      };
    }
    return {
      href: 'https://tyctw.github.io/university/',
      badge: `${year} 學測生必看`,
      title: '升大學管道與日程',
      description: `完整收錄 ${year} 學年度升學重要日期整理、簡章公告與入學管道詳細解析。`,
      action: '點擊查看重要時程',
      accent: 'from-amber-500 to-orange-500',
      glow: 'from-amber-200 to-orange-200',
      text: 'text-orange-600',
      border: 'hover:border-amber-200',
    };
  })();

  const EXAM_SCORE_DATES: Record<string, { start: string, end: string, label: string, displayStr: string }> = {
    '117gsat': {
      start: '2028-02-26T09:00:00',
      end: '2028-08-31T17:00:00',
      label: '117 學測',
      displayStr: '117.02.26 (預計)',
    },
    '116gsat': {
      start: '2027-02-26T09:00:00',
      end: '2027-08-31T17:00:00',
      label: '116 學測',
      displayStr: '116.02.26 (09:00) ~ 08.31 (17:00)',
    },
    '116cap': {
      start: '2027-06-04T00:00:00',
      end: '2027-08-31T17:00:00',
      label: '116 會考',
      displayStr: '116.06.04（開放時間依官方公告）',
    },
    '117cap': {
      start: '2028-06-01T00:00:00',
      end: '2028-08-31T17:00:00',
      label: '117 會考',
      displayStr: '117 年成績公告日期待公布',
    },
    '116tvet': {
      start: '2027-05-14T09:00:00',
      end: '2027-08-31T17:00:00',
      label: '116 統測',
      displayStr: '116.05.14 (預計)'
    },
    '115tvet': {
      start: '2026-05-14T09:00:00',
      end: '2026-08-31T17:00:00',
      label: '115 統測',
      displayStr: '115.05.14 (09:00) ~ 08.31 (17:00)'
    },
    '116ast': {
      start: '2027-07-29T09:00:00',
      end: '2027-08-31T17:00:00',
      label: '116 分科',
      displayStr: '116.07.29 (09:00) ~ 08.31 (17:00)'
    },
    '115ast': {
      start: '2026-08-03T09:00:00',
      end: '2026-08-31T17:00:00',
      label: '115 分科',
      displayStr: '115.08.03 (09:00) ~ 08.31 (17:00)'
    }
  };
  const currentScoreInfo = EXAM_SCORE_DATES[targetExam || '116gsat'] || EXAM_SCORE_DATES['116gsat'];

  const handleScoreQueryClick = () => {
     if (targetExam === '117cap') { setIsScoreWarningOpen(true); return; }
     const now = new Date();
     const start = parseTaipeiDateTime(currentScoreInfo.start);
     const end = parseTaipeiDateTime(currentScoreInfo.end);
     
     if (now < start || now > end) {
        setIsScoreWarningOpen(true);
     } else {
        window.open(currentExamLinks.scoreUrl, '_blank', 'noopener,noreferrer');
     }
  };

  const handleConfirmScoreQuery = () => {
     setIsScoreWarningOpen(false);
     window.open(currentExamLinks.scoreUrl, '_blank', 'noopener,noreferrer');
  };

  const IdentityPromoCard = (
    <AdmissionsResourceCard year={currentExamPreset.year} category={currentExamPreset.category} resource={promoResource} />
  );

  const completeDocumentPages = {
    instructions: {
      eyebrow: 'Guide',
      title: '使用說明',
      subtitle: '完整說明 Focus Space 的主要功能、資料同步方式與建議使用流程，幫你把倒數、計時、任務與學習紀錄放在同一個工作台。',
      icon: BookOpen,
      accent: 'indigo',
      updated: '適用於目前版本',
      highlights: ['設定考試與目標', '使用計時與挑戰', '管理任務與日程', '登入同步與榜單'],
      sections: [
        {
          title: '1. 設定考試、倒數日期與目標',
          icon: Target,
          body: '進入首頁後，可以選擇學測、會考、統測或分科等考試類型，並依需要切換年份或自訂倒數日期。目標學校、目標科系、每日讀書目標與考試類別會保存在瀏覽器本機；登入後，這些設定也可同步到雲端。'
        },
        {
          title: '2. 使用讀書計時器',
          icon: Clock,
          body: '計時器支援倒數、正數、模擬考與挑戰模式。倒數適合番茄鐘或固定讀書時段；正數適合自由累積時間；模擬考會依科目時間倒數；挑戰模式會把待辦任務完成數轉成挑戰紀錄。完成計時後，系統會記錄科目、時間長度與完成時間。'
        },
        {
          title: '3. 管理待辦、讀書紀錄與重要日程',
          icon: ListChecks,
          body: '待辦清單可用來拆解今天要完成的章節、題本或複習項目；重要日程可記錄報名、查分、考試、放榜或自訂日期；學習歷程會整理你已完成的專注紀錄，呈現總時數、科目分布、每日趨勢與逐筆紀錄。'
        },
        {
          title: '4. 使用背景音樂與自訂播放清單',
          icon: Headphones,
          body: '背景音樂功能使用 YouTube IFrame 播放音訊，也會使用 YouTube 縮圖顯示歌曲封面。新增 YouTube 歌曲時，系統會解析影片網址，並可能透過 noembed 查詢影片標題。請確認你新增的內容符合 YouTube 與相關平台規範。'
        },
        {
          title: '5. 登入、同步與跨裝置使用',
          icon: Cloud,
          body: '不登入也可以使用多數功能，資料會存在目前瀏覽器。登入後，任務、讀書紀錄、挑戰紀錄、播放清單、部分設定、隊伍與成就等資料可透過 Supabase 同步。若你在多個裝置使用，系統會盡量合併本機與雲端資料，但仍建議定期確認重要紀錄是否正確。'
        },
        {
          title: '6. 排行榜、隊伍與社群統計',
          icon: Trophy,
          body: '排行榜會依已同步的讀書紀錄與隊伍資料計算排名。全站排行、隊伍排行與今日共讀統計需要網路連線與後端服務。若尚未登入或資料尚未同步，排行榜可能無法顯示你的完整紀錄。'
        },
        {
          title: '7. 重置與資料清理',
          icon: RefreshCw,
          body: '設定中提供重置任務、讀書紀錄與重要日程等操作。重置會清除對應資料，可能無法復原；如果你已登入，後續同步也可能影響雲端資料。進行重置前，請確認你已不再需要這些紀錄。'
        },
        {
          title: '8. 問題回報與使用建議',
          icon: CheckCircle2,
          body: '若畫面資料與預期不一致，請先確認目前登入帳號、網路狀態及同步是否完成；不要以重新設定或清除資料作為第一步，以免遺失紀錄。功能、錯誤或資料問題可寄至 tyctw.analyze@gmail.com，並請提供問題發生時間、使用裝置、瀏覽器與可重現步驟；請勿透過電子郵件提供密碼、驗證碼或敏感個資。'
        }
      ]
    },
  } as const;

  if (isAuthOpen) {
    return (
      <>
        <Suspense fallback={<PageLoading />}>
        <AuthPage
          isOpen
          onClose={() => {
            if (activePage === 'account' && !user) setActivePage('home');
            setIsAuthOpen(false);
            setAuthInitialMode(undefined);
            setAuthInitialEmail(undefined);
            setAuthInitialResetCode(undefined);
          }}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
          currentData={getCurrentData()}
          currentUser={user}
          initialMode={authInitialMode}
          initialEmail={authInitialEmail}
          initialResetCode={authInitialResetCode}
          onShowPrivacy={() => { setIsAuthOpen(false); setActivePage('privacy'); }}
          onShowInstructions={() => { setIsAuthOpen(false); setActivePage('instructions'); }}
          onShowTerms={() => { setIsAuthOpen(false); setActivePage('terms'); }}
        />
        </Suspense>
        <AnalyticsConsent />
        <StorageNotice getBackup={() => ({ data: getCurrentData(), pendingStudySessionIds: Array.from(pendingStudySessionIdsRef.current) })} />
      </>
    );
  }

  return (
    <div className={`relative flex min-h-screen flex-col p-4 font-sans text-slate-800 md:p-8 ${activePage === 'home' ? 'home-shell' : activePage === 'community' ? 'community-shell' : activePage === 'temple' ? 'temple-shell' : activePage === 'instructions' ? 'guide-shell' : activePage === 'privacy' ? 'privacy-shell' : activePage === 'terms' ? 'terms-shell' : activePage === 'refund' ? 'refund-shell' : activePage === 'support' ? 'service-shell' : ''}`}>
      <StorageNotice getBackup={() => ({ data: getCurrentData(), pendingStudySessionIds: Array.from(pendingStudySessionIdsRef.current) })} />
      <a href="#main-content" className="skip-link">跳到主要內容</a>
      {/* Light Theme Dynamic Background */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200 blur-[120px] animate-blob mix-blend-multiply opacity-60 pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-200 blur-[120px] animate-blob animation-delay-2000 mix-blend-multiply opacity-60 pointer-events-none"></div>
      
      <SiteHeader activePage={activePage} examId={targetExam}
        examName={EXAM_PRESETS.find(preset => preset.id === targetExam)?.name || '升學備考'}
        targetSchool={targetSchool} isLoggedIn={Boolean(user)} userName={user?.name} isSyncing={isSyncing}
        onNavigate={setActivePage} pastUrl={currentExamLinks.pastUrl}
        pastTitle={currentExamLinks.pastTitle} scoreTitle={currentExamLinks.scoreTitle}
        onScoreQuery={handleScoreQueryClick} onExamReminder={() => setIsExamReminderOpen(true)} />

      {activePage === 'home' && <div aria-hidden="true" className="header-announcement-spacer flex-none" />}
      <div aria-hidden="true" className="h-[92px] flex-none md:h-[102px]" />

      <Suspense fallback={<PageLoading />}>
      {activePage === 'ranking' ? (
      <main id="main-content" className="relative z-10 mx-auto w-full max-w-[108rem] px-4 pb-12 opacity-0 animate-fade-in-up delay-100 sm:px-6 lg:px-8">
        <RankingBoard
          isOpen={true}
          onClose={() => setActivePage('home')}
          currentUser={user}
          challengeRecords={challengeRecords}
          studySessions={studySessions}
          team={team}
          onJoinTeam={(newTeam) => setSyncedTeam(newTeam)}
          variant="page"
        />
      </main>
      ) : activePage === 'community' ? (
      <main id="main-content" className="relative z-10 mx-auto w-full max-w-[108rem] px-4 pb-12 opacity-0 animate-fade-in-up delay-100 sm:px-6 lg:px-8">
        <TodayCommunityStudy sessions={studySessions} variant="page" onBack={() => setActivePage('home')} onStartFocus={() => {
          setActivePage('home');
          requestAnimationFrame(() => document.getElementById('home-focus')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }} />
      </main>
      ) : activePage === 'learning' ? (
          <main id="main-content" className="mx-auto w-full max-w-[108rem] relative z-10 pb-12 opacity-0 animate-fade-in-up delay-100">
          <FocusStatsModal
            isOpen={true}
            onClose={() => setActivePage('home')}
            sessions={studySessions}
            dailyGoal={dailyGoal}
            variant="page"
            onCheckSync={handleCheckStudySync}
          />
      </main>
      ) : activePage === 'achievements' ? (
      <main id="main-content" className="mx-auto w-full max-w-[92rem] relative z-10 pb-12 opacity-0 animate-fade-in-up delay-100">
        <AchievementsModal
          isOpen={true}
          onClose={() => setActivePage('home')}
          data={getCurrentData()}
          variant="page"
        />
      </main>
      ) : activePage === 'temple' ? (
      <main id="main-content" className="w-full min-w-0 max-w-7xl mx-auto relative z-10 pb-12 opacity-0 animate-fade-in-up delay-100">
        <TempleModal
          isVerified={isTempleVerified}
          isOpen={true}
          onClose={() => setActivePage('home')}
          incenseCoins={incenseCoins}
          incenseRecords={incenseRecords}
          templeState={templeState}
          onPerformRitual={handleTempleRitual}
          onCheckSync={handleCheckStudySync}
          pendingStudyCount={pendingStudySessionIds.length}
          syncMessage={studySyncError}
          variant="page"
          userName={user?.name}
          targetSchool={targetSchool}
        />
      </main>
      ) : activePage === 'account' && user ? (
        <AccountPage
          currentUser={user}
          onPrepareLogout={prepareLogout}
          onBack={() => setActivePage('home')}
          onLogout={handleLogout}
          onUserUpdate={(updatedUser) => {
            setUser(updatedUser);
            safeLocalStorage.setItem('gsat_user_profile', JSON.stringify(updatedUser));
          }}
          onSync={() => triggerSync(true)}
          isSyncing={isSyncing}
        />
      ) : activePage === 'schedule' ? (
        <OfficialSchedulePage targetExam={targetExam} onBack={() => setActivePage('home')} />
      ) : activePage === 'donation' ? (
        <DonationPage targetExam={targetExam} onBack={() => setActivePage('home')} />
      ) : activePage === 'settings' ? (
      <main id="main-content" className="w-full max-w-7xl mx-auto relative z-10 pb-12 opacity-0 animate-fade-in-up delay-100">
        <SettingsPage
          onClose={() => {
            setActivePage('home');
            setConfirmResetType(null);
          }}
          targetExam={targetExam}
          setTargetExam={setSyncedTargetExam}
          targetDateStr={targetDateStr}
          setTargetDateStr={setSyncedTargetDateStr}
          targetSchool={targetSchool}
          setTargetSchool={setSyncedTargetSchool}
          targetMajor={targetMajor}
          setTargetMajor={setSyncedTargetMajor}
          dailyGoal={dailyGoal}
          setDailyGoal={setSyncedDailyGoal}
          tvetCategory={tvetCategory}
          setIsTvetCategoryModalOpen={setIsTvetCategoryModalOpen}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          setPendingExamSwitch={setPendingExamSwitch}
          isAuthenticated={Boolean(user)}
          confirmResetType={confirmResetType}
          setConfirmResetType={setConfirmResetType}
          executeReset={executeReset}
        />
      </main>
      ) : activePage === 'announcements' ? (
        <AnnouncementsPage onBack={() => setActivePage('home')} />
      ) : activePage === 'privacy' ? (
        <PrivacyPage examId={targetExam} onNavigate={setActivePage} />
      ) : activePage === 'support' ? (
        <CustomerSupportPage examId={targetExam} onNavigate={setActivePage} />
      ) : activePage === 'refund' ? (
        <RefundPage examId={targetExam} onNavigate={setActivePage} />
      ) : activePage === 'terms' ? (
        <TermsPage examId={targetExam} onNavigate={setActivePage} />
      ) : activePage === 'instructions' ? (
        <InstructionsPage examId={targetExam} onNavigate={setActivePage} sections={completeDocumentPages.instructions.sections} />
      ) : null}
      </Suspense>
      {/* Keep the timer mounted while visiting statistics and other pages. */}
      <HomePage
        isVisible={activePage === 'home'}
        examId={targetExam}
        examName={EXAM_PRESETS.find(p => p.id === targetExam)?.name || '備考'}
        userName={user?.name}
        targetSchool={targetSchool}
        targetMajor={targetMajor}
        onNavigate={setActivePage}
        pastUrl={currentExamLinks.pastUrl}
        pastTitle={currentExamLinks.pastTitle}
        scoreTitle={currentExamLinks.scoreTitle}
        onScoreQuery={handleScoreQueryClick}
        countdown={<CountdownDisplay
  targetDate={parseTaipeiDateTime(targetDateStr)} 
  user={user} 
  examName={EXAM_PRESETS.find(p => p.id === targetExam)?.name}
  examShortName={EXAM_PRESETS.find(p => p.id === targetExam)?.shortName}
  currentExamId={targetExam}
  tvetCategory={tvetCategory}
  onExamChange={(id) => {
    const preset = EXAM_PRESETS.find(e => e.id === id);
    if (!preset) return;
    const currentPreset = EXAM_PRESETS.find(e => e.id === targetExam);
    if (user && currentPreset && currentPreset.category !== preset.category) {
      setPendingExamSwitch(preset);
    } else {
      setSyncedTargetExam(preset.id);
      setSyncedTargetDateStr(preset.date);
    }
  }}
           />}
        timer={<StudyTimer
              onSaveSession={handleSaveSession} 
              onSaveChallenge={handleSaveChallenge}
              challengeRecords={challengeRecords}
              targetSchool={targetSchool}
              targetMajor={targetMajor}
              tasks={tasks}
              setTasks={setSyncedTasks}
              playlists={playlists}
              setPlaylists={setPlaylists}
              onDeleteTrack={(playlistId, trackId) => {
                setDeletedTrackIds(prev => ({
                  ...prev,
                  [playlistId]: mergeDeletedIds(prev[playlistId], [trackId]),
                }));
              }}
              onDeletePlaylist={(playlistId) => {
                setDeletedPlaylistIds(prev => mergeDeletedIds(prev, [playlistId]));
              }}
              activePlaylistId={activePlaylistId}
              setActivePlaylistId={setActivePlaylistId}
              targetExam={targetExam}
           />}
        stats={<FocusStats
              compact
              sessions={studySessions} 
              dailyGoal={dailyGoal}
              streak={streak}
              onClick={() => setActivePage('learning')} 
           />}
        tasks={<TaskList tasks={tasks} setTasks={setSyncedTasks} previewLimit={3} />}
        schedule={<ScheduleTable targetExam={targetExam} tvetCategory={tvetCategory} />}
        dates={<ImportantDates
                customDates={customDates}
                setCustomDates={setCustomDates}
                onDeleteCustomDate={(id) => {
                  setCustomDates(prev => prev.filter(date => date.id !== id));
                  setDeletedCustomDateIds(prev => mergeDeletedIds(prev, [id]));
                }}
                targetExam={targetExam}
                onOpenOfficialSchedule={() => setActivePage('schedule')}
              />}
        promo={currentExamPreset.category === 'cap' ? <CapAnalysisCard year={currentExamPreset.year} /> : IdentityPromoCard}
      />

      {/* Footer */}
      <footer className="-mb-4 mt-auto w-full pt-7 opacity-0 animate-fade-in delay-500 md:-mb-8">
        <div className="border-y border-slate-200/80 bg-white/85 px-5 py-5 shadow-lg shadow-slate-200/40 backdrop-blur-xl sm:px-8 lg:px-12">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200"><Sparkles className="h-4 w-4" /></span>
              <div>
                <div className="text-sm font-black tracking-tight text-slate-900">Focus Space</div>
                <div className="mt-0.5 text-xs font-medium text-slate-500">為 {EXAM_PRESETS.find(p => p.id === targetExam)?.name || '每一位備考者'} 留下專注的軌跡</div>
              </div>
              {user && <span className="ml-1 hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 sm:inline-flex"><Cloud className="h-3 w-3" />{!isCloudStateReady ? '等待同步連線' : isSyncing ? '同步中' : pendingStudySessionIds.length ? '有專注紀錄待同步' : '雲端同步已啟用'}</span>}
            </div>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-slate-500">
              <PageLink page={'announcements'} examId={targetExam} onClick={() => setActivePage('announcements')} className="transition hover:text-indigo-600">最新公告</PageLink>
              <PageLink page={'learning'} examId={targetExam} onClick={() => setActivePage('learning')} className="transition hover:text-indigo-600">學習歷程</PageLink>
              <PageLink page={'schedule'} examId={targetExam} onClick={() => setActivePage('schedule')} className="transition hover:text-indigo-600">考試日程</PageLink>
              <PageLink page={'instructions'} examId={targetExam} onClick={() => setActivePage('instructions')} className="transition hover:text-indigo-600">使用說明</PageLink>
              <PageLink page={'donation'} examId={targetExam} onClick={() => setActivePage('donation')} className="inline-flex items-center gap-1 text-rose-500 transition hover:text-rose-600"><Heart className="h-3 w-3 fill-current" /> 贊助</PageLink>
            </nav>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>Stay focused, one day at a time.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <PageLink page={'privacy'} examId={targetExam} onClick={() => setActivePage('privacy')} className="transition hover:text-slate-700">隱私權政策</PageLink>
              <PageLink page={'terms'} examId={targetExam} onClick={() => setActivePage('terms')} className="transition hover:text-slate-700">服務條款</PageLink>
              <button onClick={openAnalyticsSettings} className="transition hover:text-slate-700">Cookie 設定</button>
              <a href="mailto:tyctw.analyze@gmail.com" className="transition hover:text-slate-700">聯絡我們</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <ModalLayer className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsSettingsOpen(false); setConfirmResetType(null); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
              role="dialog"
              aria-modal="true"
              aria-label="設定"
            >
              {/* Decorative Header */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-30"></div>
              
              <div className="p-8 pb-5 flex justify-between items-start bg-white border-b border-slate-100 relative z-20 pt-10">
                <div>
                   <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">個人設定</h2>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Settings & Configuration</p>
                </div>
                <button 
                  onClick={() => { setIsSettingsOpen(false); setConfirmResetType(null); }} 
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-all"
                  aria-label="關閉設定"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar p-8 pt-6 flex-grow space-y-8">
                {confirmResetType ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-4 text-center space-y-5"
                  >
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 border-4 border-red-50 ring-8 ring-red-50/50">
                      <AlertTriangle className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-black text-slate-900 tracking-tight">
                         {confirmResetType === 'tasks' ? '清空任務清單' : confirmResetType === 'sessions' ? '清空讀書紀錄' : '清空重要日程'}
                       </h3>
                       <p className="text-sm text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                         此動作<strong className="text-red-600">無法復原</strong>且將同步刪除雲端備份。您確定要永久刪除所有資料嗎？
                       </p>
                    </div>
                    <div className="flex flex-col gap-3 w-full pt-4">
                      <button 
                        onClick={executeReset}
                        className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 text-white font-black rounded-xl hover:from-red-700 hover:to-red-600 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-200/60 flex items-center justify-center gap-2"
                      >
                        確認永久刪除
                      </button>
                      <button 
                        onClick={() => setConfirmResetType(null)}
                        className="w-full py-3.5 bg-white border-2 border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:text-slate-600 transition-all text-sm"
                      >
                        我再想想
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {/* Exam Switcher */}
                    <div className="space-y-4">
                       <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                             <Trophy className="w-5 h-5 text-indigo-500" />
                             <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.25em]">考試類型切換</h4>
                          </div>
                       </div>
                       
                       <div className="bg-slate-50/70 border border-slate-100 rounded-[24px] p-2 space-y-2 relative overflow-hidden">
                          {/* Category Selector Tabs */}
                          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-100 min-[420px]:grid-cols-4">
                             {[
                               { id: 'gsat', name: '學測', icon: '📝', text: 'text-indigo-600', bg: 'bg-indigo-50' },
                               { id: 'cap', name: '會考', icon: '🎯', text: 'text-teal-600', bg: 'bg-teal-50' },
                               { id: 'tvet', name: '統測', icon: '🛠️', text: 'text-orange-600', bg: 'bg-orange-50' },
                               { id: 'ast', name: '分科', icon: '🔬', text: 'text-pink-600', bg: 'bg-pink-50' }
                             ].map((cat) => {
                               const isActive = selectedCategory === cat.id;
                               return (
                                 <button
                                   key={cat.id}
                                   onClick={() => setSelectedCategory(cat.id as any)}
                                   className={`relative flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-xs font-bold transition-all z-10 min-[420px]:px-3 min-[420px]:text-sm ${
                                     isActive
                                       ? cat.text
                                       : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                   }`}
                                 >
                                   <span className="text-base">{cat.icon}</span>
                                   {cat.name}
                                   {isActive && (
                                     <motion.div
                                       layoutId="settings-cat-bg-new"
                                       className={`absolute inset-0 ${cat.bg} rounded-lg -z-10`}
                                       transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                     />
                                   )}
                                 </button>
                               );
                             })}
                          </div>

                          {/* Year Selector */}
                          <div className="grid grid-cols-2 gap-2 relative z-10 pt-1">
                             {EXAM_PRESETS.filter(exam => exam.category === selectedCategory).sort((a, b) => b.year - a.year).map((exam) => {
                               const isActive = targetExam === exam.id;
                               const catTheme = [
                                 { id: 'gsat', text: 'text-indigo-700', activeBorder: 'border-indigo-400', activeShadow: 'shadow-indigo-200/50', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-600' },
                                 { id: 'cap', text: 'text-teal-700', activeBorder: 'border-teal-400', activeShadow: 'shadow-teal-200/50', badgeBg: 'bg-teal-100', badgeText: 'text-teal-600' },
                                 { id: 'tvet', text: 'text-orange-700', activeBorder: 'border-orange-400', activeShadow: 'shadow-orange-200/50', badgeBg: 'bg-orange-100', badgeText: 'text-orange-600' },
                                 { id: 'ast', text: 'text-pink-700', activeBorder: 'border-pink-400', activeShadow: 'shadow-pink-200/50', badgeBg: 'bg-pink-100', badgeText: 'text-pink-600' }
                               ].find(c => c.id === exam.category) || { text: 'text-indigo-700', activeBorder: 'border-indigo-400', activeShadow: 'shadow-indigo-200/50', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-600' };

                               return (
                                 <button
                                   key={exam.id}
                                   onClick={() => {
                                     if (exam.id !== targetExam) {
                                       const currentPreset = EXAM_PRESETS.find(e => e.id === targetExam);
                                       if (user && currentPreset && currentPreset.category !== exam.category) {
                                         setPendingExamSwitch(exam);
                                       } else {
                                         setSyncedTargetExam(exam.id);
                                         setSyncedTargetDateStr(exam.date);
                                       }
                                     }
                                   }}
                                   className={`relative py-4 px-4 rounded-2xl text-left transition-all group border-2 overflow-hidden ${
                                     isActive
                                       ? `bg-white ${catTheme.activeBorder} shadow-md ${catTheme.activeShadow} scale-[1.02]`
                                       : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                                   }`}
                                 >
                                   <div className="flex flex-col gap-0.5 relative z-10">
                                     <div className="flex items-center justify-between">
                                        <span className={`text-xl font-black ${isActive ? catTheme.text : 'text-slate-700'}`}>
                                          {exam.year} 年
                                        </span>
                                        {isActive && <CheckCircle2 className={`w-5 h-5 ${catTheme.badgeText}`} />}
                                     </div>
                                     <span className="text-[11px] font-bold text-slate-400 mb-1">
                                       {exam.name.replace(`${exam.year}`, '').trim()}
                                     </span>
                                   </div>
                                   
                                   {exam.isEstimated && (
                                     <div className={`inline-block mt-2 px-2 py-0.5 text-[10px] font-bold tracking-widest rounded transition-colors ${
                                       isActive 
                                         ? `${catTheme.badgeBg} ${catTheme.badgeText}` 
                                         : 'bg-slate-100 text-slate-500'
                                     }`}>
                                       預計
                                     </div>
                                   )}
                                   {!exam.isEstimated && (
                                     <div className={`inline-block mt-2 px-2 py-0.5 text-[10px] font-bold tracking-widest rounded transition-colors ${
                                       isActive 
                                         ? `${catTheme.badgeBg} ${catTheme.badgeText} opacity-100` 
                                         : 'bg-slate-100 text-slate-500 opacity-0 hidden'
                                     }`}>
                                       正式
                                     </div>
                                   )}
                                 </button>
                               );
                             })}
                          </div>
                       </div>
                    </div>

                    {(targetExam === '116tvet' || targetExam === '115tvet') && (
                       <div className="space-y-4">
                           <div className="flex items-center gap-2 mb-1">
                              <LayoutGrid className="w-5 h-5 text-indigo-500" />
                              <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.25em]">統測報考群(類)別</h4>
                           </div>
                           <button 
                              onClick={() => setIsTvetCategoryModalOpen(true)}
                              className="w-full flex items-center justify-between bg-white border-2 border-slate-100 rounded-[1.25rem] py-4 px-5 text-slate-800 font-bold text-sm hover:border-indigo-200 hover:shadow-md transition-all text-left group"
                           >
                              <span className={`${!tvetCategory ? 'text-slate-400' : 'text-indigo-700'}`}>
                                 {TVET_CATEGORIES.find(cat => cat.id === tvetCategory) 
                                    ? `${tvetCategory} ${TVET_CATEGORIES.find(cat => cat.id === tvetCategory)?.name}`
                                    : '請選擇報考群別'}
                              </span>
                              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                           </button>
                       </div>
                    )}

                    {/* Goal Selection Section */}
                    <div className="space-y-3">
                       <div className="flex items-center gap-2 mb-1 pt-2">
                          <Target className="w-5 h-5 text-indigo-500" />
                          <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.25em]">備考目標設定</h4>
                       </div>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="relative group">
                             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                <GraduationCap className="w-5 h-5" />
                             </div>
                             <input 
                                type="text" 
                                value={targetSchool} 
                                maxLength={15} 
                                onChange={(e) => setSyncedTargetSchool(e.target.value)} 
                                aria-label="目標學校"
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] py-3.5 pl-12 pr-4 text-slate-800 font-bold text-sm outline-none hover:bg-white hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all" 
                                placeholder="目標大學 (例如：國立台灣大學)" 
                             />
                          </div>
                          
                          <div className="relative group">
                             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                <Search className="w-5 h-5" />
                             </div>
                             <input 
                                type="text" 
                                value={targetMajor} 
                                maxLength={15} 
                                onChange={(e) => setSyncedTargetMajor(e.target.value)} 
                                aria-label="目標科系"
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] py-3.5 pl-12 pr-4 text-slate-800 font-bold text-sm outline-none hover:bg-white hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all" 
                                placeholder="目標科系 (例如：醫學系)" 
                             />
                          </div>
                       </div>
                    </div>

                    {/* Date Selection */}
                    <div className="space-y-3">
                       <div className="flex items-center gap-2 mb-1 pt-2">
                          <CalendarDays className="w-5 h-5 text-indigo-500" />
                          <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.25em]">大考日期調整</h4>
                       </div>
                       <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                             <Clock className="w-5 h-5" />
                          </div>
                          <input 
                            type="datetime-local" 
                            value={targetDateStr} 
                            onChange={(e) => { if(e.target.value) setSyncedTargetDateStr(e.target.value); }} 
                            aria-label="考試日期與時間"
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] py-3.5 pl-12 pr-4 text-slate-800 font-bold text-sm outline-none hover:bg-white hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all appearance-none" 
                          />
                       </div>
                    </div>

                    {/* Study Goal Slider */}
                    <div className="space-y-4">
                       <div className="flex justify-between items-end mb-1 pt-2">
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2">
                                <Flame className="w-5 h-5 text-orange-500" />
                                <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.25em]">每日讀書目標</h4>
                             </div>
                             <p className="text-[10px] text-slate-400 ml-7 font-bold">每天專注的時間指標</p>
                          </div>
                          <div className="flex items-baseline gap-1 bg-orange-50 px-3 py-1.5 border border-orange-100 rounded-xl shadow-sm">
                             <span className="text-xl font-black text-orange-600 leading-none">{Math.floor(dailyGoal/60)}</span>
                             <span className="text-[10px] font-black text-orange-400 uppercase leading-none">hr</span>
                             <span className="text-xl font-black text-orange-600 leading-none ml-1">{dailyGoal%60}</span>
                             <span className="text-[10px] font-black text-orange-400 uppercase leading-none">min</span>
                          </div>
                       </div>
                       
                       <div className="px-1 bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] p-4 hover:border-slate-200 transition-colors">
                          <div className="relative h-8 flex items-center group cursor-pointer w-full">
                             <div className="absolute left-0 right-0 h-2 bg-slate-200 rounded-full"></div>
                             <div 
                               className="absolute left-0 h-2 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-300"
                               style={{ width: `${(dailyGoal - 30) / (600 - 30) * 100}%` }}
                             ></div>
                             <input 
                                type="range" 
                                min="30" 
                                max="600" 
                                step="10" 
                                value={dailyGoal} 
                                onChange={(e) => setSyncedDailyGoal(Number(e.target.value))} 
                                aria-label="每日讀書目標"
                                aria-valuetext={`${Math.floor(dailyGoal / 60)} 小時 ${dailyGoal % 60} 分鐘`}
                                className="absolute inset-0 w-full bg-transparent appearance-none cursor-pointer z-20 slider-thumb-custom"
                             />
                          </div>
                          <div className="flex justify-between mt-3">
                             <div className="flex flex-col items-start bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Min</span>
                                <span className="text-xs font-bold text-slate-500">30m</span>
                             </div>
                             <div className="flex flex-col items-end bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Target</span>
                                <span className="text-xs font-bold text-slate-500">10h</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-8 border-t-2 border-slate-100/80">
                       <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <h4 className="text-[12px] font-black text-red-400 uppercase tracking-[0.25em]">危險區域</h4>
                       </div>
                       
                       <div className="grid grid-cols-1 gap-3">
                          <button 
                            onClick={() => setConfirmResetType('tasks')}
                            className="group w-full p-4 bg-white border-2 border-slate-100 rounded-[1.25rem] hover:bg-red-50 hover:border-red-200 hover:shadow-md transition-all flex items-center justify-between"
                          >
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl group-hover:bg-red-500 group-hover:text-white group-hover:border-red-600 transition-all shadow-sm">
                                   <ClipboardCheck className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                   <div className="text-base font-black text-slate-700 group-hover:text-red-700">重置任務清單</div>
                                   <div className="text-xs font-semibold text-slate-400 mt-0.5">永久清空所有待辦事項</div>
                                </div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-red-500 transition-colors" />
                          </button>
                          
                          <button 
                            onClick={() => setConfirmResetType('sessions')}
                            className="group w-full p-4 bg-white border-2 border-slate-100 rounded-[1.25rem] hover:bg-red-50 hover:border-red-200 hover:shadow-md transition-all flex items-center justify-between"
                          >
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl group-hover:bg-red-500 group-hover:text-white group-hover:border-red-600 transition-all shadow-sm">
                                   <Clock className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                   <div className="text-base font-black text-slate-700 group-hover:text-red-700">重置讀書紀錄</div>
                                   <div className="text-xs font-semibold text-slate-400 mt-0.5">永久清空時長統計數據</div>
                                </div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-red-500 transition-colors" />
                          </button>
                          
                          <button 
                            onClick={() => setConfirmResetType('dates')}
                            className="group w-full p-4 bg-white border-2 border-slate-100 rounded-[1.25rem] hover:bg-red-50 hover:border-red-200 hover:shadow-md transition-all flex items-center justify-between"
                          >
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl group-hover:bg-red-500 group-hover:text-white group-hover:border-red-600 transition-all shadow-sm">
                                   <CalendarDays className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                   <div className="text-base font-black text-slate-700 group-hover:text-red-700">重置重要日程</div>
                                   <div className="text-xs font-semibold text-slate-400 mt-0.5">永久清空自定義日程內容</div>
                                </div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-red-500 transition-colors" />
                          </button>
                       </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Footer */}
              {!confirmResetType && (
                <div className="p-8 border-t border-slate-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)] relative z-20">
                  <button 
                    onClick={() => setIsSettingsOpen(false)} 
                    className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all hover:shadow-lg hover:shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                  >
                    儲存設定並返回
                  </button>
                </div>
              )}
            </motion.div>
          </ModalLayer>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <DeferredContent active={isTempleOpen}>
      <TempleModal
        isVerified={isTempleVerified}
        isOpen={isTempleOpen}
        onClose={() => setIsTempleOpen(false)}
        incenseCoins={incenseCoins}
        incenseRecords={incenseRecords}
        templeState={templeState}
        onPerformRitual={handleTempleRitual}
        onCheckSync={handleCheckStudySync}
        pendingStudyCount={pendingStudySessionIds.length}
        syncMessage={studySyncError}
        userName={user?.name}
        targetSchool={targetSchool}
      />
      </DeferredContent>
      
      {/* Achievements Modal */}
      <DeferredContent active={isAchievementsOpen}>
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        data={getCurrentData()}
      />
      </DeferredContent>

      {/* Info Modals */}
      <ScoreQueryModal 
         isOpen={isScoreWarningOpen} 
         onClose={() => setIsScoreWarningOpen(false)} 
         onConfirm={handleConfirmScoreQuery} 
         examName={currentScoreInfo.label}
         openTime={currentScoreInfo.displayStr}
      />
      <LoginSuggestionModal isOpen={isLoginSuggestionOpen} onClose={handleCloseLoginSuggestion} onLogin={handleSuggestionToAuth} />
      <ExamReminderModal isOpen={isExamReminderOpen} onClose={handleCloseExamReminder} checkedItems={examChecklist} onCheckChange={setSyncedExamChecklist} />

      <TvetCategoryModal
        isOpen={isTvetCategoryModalOpen}
        onClose={() => setIsTvetCategoryModalOpen(false)}
        selectedCategory={tvetCategory}
        onSelect={(id) => setSyncedTvetCategory(id)}
      />

      <ConfirmExamSwitchModal
        isOpen={pendingExamSwitch !== null}
        onClose={() => setPendingExamSwitch(null)}
        onConfirm={() => {
          if (pendingExamSwitch) {
            setSyncedTargetExam(pendingExamSwitch.id);
            setSyncedTargetDateStr(pendingExamSwitch.date);
            setPendingExamSwitch(null);
            if (isSettingsOpen) setIsSettingsOpen(false);
          }
        }}
        targetPreset={pendingExamSwitch}
      />

      <AchievementToast 
        achievement={currentAchievementToast} 
        onClose={handleAchievementToastClose} 
      />

      <AnalyticsConsent />

    </div>
  );
};

export default App;
