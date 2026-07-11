
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Greeting from './components/Greeting';
import CountdownDisplay from './components/CountdownDisplay';
import QuoteCard from './components/QuoteCard';
import TaskList from './components/TaskList';
import ScheduleTable from './components/ScheduleTable';
import StudyTimer from './components/StudyTimer';
import ImportantDates from './components/ImportantDates';
import FocusStats from './components/FocusStats';
import FocusStatsModal from './components/FocusStatsModal';
import TodayCommunityStudy from './components/TodayCommunityStudy';
import AuthModal from './components/AuthModal';
import RankingBoard from './components/RankingBoard';
import AccountPage from './components/AccountPage';
import TempleModal from './components/TempleModal';
import AchievementsModal from './components/AchievementsModal';
import SettingsPage from './components/SettingsPage';
import WelcomeSplash from './components/WelcomeSplash';
import { TvetCategoryModal } from './components/TvetCategoryModal';
import ConfirmExamSwitchModal from './components/ConfirmExamSwitchModal';
import { AnnouncementModal, ScoreQueryModal, LoginSuggestionModal, ExamReminderModal } from './components/InfoModals';
import { ACHIEVEMENTS, Achievement } from './utils/achievements';
import { AchievementToast } from './components/AchievementToast';
import { TimeLeft, TodoItem, StudySession, User, AppData, ChallengeRecord, CustomDate, StreakData, Playlist, AudioTrack } from './types';
import { EXAM_PRESETS, ExamPreset, TVET_CATEGORIES } from './constants';
import { Settings, X, ExternalLink, Sparkles, Target, UserCircle, Cloud, Menu, CalendarDays, ArrowRight, ArrowLeft, FileText, Search, ClipboardCheck, AlertTriangle, Trophy, LayoutGrid, GraduationCap, Flame, Clock, Medal, ChevronRight, CheckCircle2, UsersRound, Shield, BookOpen, ScrollText, Lock, Server, ListChecks, RefreshCw, Headphones } from 'lucide-react';
import { authService } from './services/authService';
import { getTimeLeft, parseTaipeiDateTime } from './utils/time';
import { updateSeoMetadata } from './utils/seo';

// Helper to merge arrays by ID (Client-side Union)
// This prevents data loss when switching devices by merging local and cloud records
const mergeById = <T extends { id: string }>(local: T[], remote: T[] | undefined): T[] => {
  if (!remote || !Array.isArray(remote)) return local;
  
  const map = new Map<string, T>();
  
  // 1. Add remote items first
  remote.forEach(item => map.set(item.id, item));
  
  // 2. Add local items (Local state takes precedence for modifications, but since ID is timestamp for logs, it acts as a Union)
  local.forEach(item => map.set(item.id, item));
  
  return Array.from(map.values());
};

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

const getInitialExamId = () => {
  const params = new URLSearchParams(window.location.search);
  const examParam = params.get('exam')?.toLowerCase();
  if (examParam && EXAM_PRESETS.some(p => p.id === examParam)) {
    return examParam;
  }
  
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const examFromPath = pathParts.find(part => EXAM_PRESETS.some(p => p.id === part.toLowerCase()));
  if (examFromPath) {
    return examFromPath.toLowerCase();
  }
  
  return localStorage.getItem('gsat_target_exam') || '116gsat';
};

const getInitialDate = (initialExamId: string) => {
  const params = new URLSearchParams(window.location.search);
  const examParam = params.get('exam')?.toLowerCase();
  let fromUrl = false;
  if (examParam && EXAM_PRESETS.some(p => p.id === examParam)) {
    fromUrl = true;
  }
  
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  fromUrl = fromUrl || pathParts.some(part => EXAM_PRESETS.some(p => p.id === part.toLowerCase()));

  if (fromUrl) {
    const preset = EXAM_PRESETS.find(p => p.id === initialExamId);
    if (preset) return preset.date;
  }

  return localStorage.getItem('gsat_target_date') || EXAM_PRESETS.find(p => p.id === initialExamId)?.date || '2027-01-16T09:20:00';
};

const SEO_PAGE_LABELS = {
  home: '',
  ranking: '排行榜',
  learning: '讀書統計',
  achievements: '成就徽章',
  temple: '祈福神社',
  settings: '設定',
  account: '帳號管理',
  instructions: '使用說明',
  privacy: '隱私權政策',
  terms: '服務條款',
} as const;

type ActivePage = keyof typeof SEO_PAGE_LABELS;

const isActivePage = (page: unknown): page is ActivePage =>
  typeof page === 'string' && page in SEO_PAGE_LABELS;

const getInitialActivePage = (): ActivePage => {
  const historyPage = window.history.state?.appPage;
  if (isActivePage(historyPage)) return historyPage;

  const params = new URLSearchParams(window.location.search);
  const pageParam = params.get('page');
  return isActivePage(pageParam) ? pageParam : 'home';
};

const hasAuthCallbackParams = () => {
  const href = window.location.href;
  return (
    href.includes('reset=true') ||
    href.includes('login=otp') ||
    href.includes('type=magiclink') ||
    href.includes('type=email') ||
    href.includes('code=') ||
    href.includes('token_hash=') ||
    href.includes('access_token=') ||
    href.includes('refresh_token=') ||
    href.includes('error_code=')
  );
};

const getAppMountPath = () => {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0 && EXAM_PRESETS.some(p => p.id === pathParts[pathParts.length - 1].toLowerCase())) {
    pathParts.pop();
  }

  return pathParts.length > 0 ? `/${pathParts.join('/')}/` : '/';
};

const getAppRouteUrl = (page: ActivePage, examId: string) => {
  const url = new URL(getAppMountPath(), window.location.origin);
  url.searchParams.set('exam', examId);
  if (page !== 'home') {
    url.searchParams.set('page', page);
  }

  return `${url.pathname}${url.search}`;
};

const App: React.FC = () => {
  const DEFAULT_DATE = '2027-01-16T09:20:00';
  
  // Data State
  const initialExamId = getInitialExamId();
  const [targetExam, setTargetExam] = useState<string>(initialExamId);
  const currentExam = EXAM_PRESETS.find(p => p.id === targetExam);
  const [targetDateStr, setTargetDateStr] = useState<string>(getInitialDate(initialExamId));
  const [tvetCategory, setTvetCategory] = useState<string>(() => localStorage.getItem('gsat_tvet_category') || '');
  const [isTvetCategoryModalOpen, setIsTvetCategoryModalOpen] = useState(false);
  const [targetSchool, setTargetSchool] = useState<string>(() => localStorage.getItem('gsat_target_school') || '目標大學');
  const [targetMajor, setTargetMajor] = useState<string>(() => localStorage.getItem('gsat_target_major') || '目標科系');
  const [tasks, setTasks] = useState<TodoItem[]>(() => {
    const saved = localStorage.getItem('gsat_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [studySessions, setStudySessions] = useState<StudySession[]>(() => {
    const saved = localStorage.getItem('gsat_study_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [challengeRecords, setChallengeRecords] = useState<ChallengeRecord[]>(() => {
    const saved = localStorage.getItem('gsat_challenge_records');
    return saved ? JSON.parse(saved) : [];
  });
  const [customDates, setCustomDates] = useState<CustomDate[]>(() => {
    const saved = localStorage.getItem('gsat_custom_dates');
    return saved ? JSON.parse(saved) : [];
  });
  const [team, setTeam] = useState<string>(() => {
    return localStorage.getItem('gsat_team') || '';
  });

  // Playlist & Music State (Lifted Up)
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('gsat_playlists');
    if (saved) return JSON.parse(saved);
    
    // Migration: Convert old flat tracks to playlist if exists
    const oldTracks = localStorage.getItem('gsat_music_tracks');
    if (oldTracks) {
        try {
            const tracks = JSON.parse(oldTracks);
            return [{ id: 'default', name: '我的最愛', tracks }];
        } catch(e) {}
    }
    return DEFAULT_PLAYLISTS;
  });
  const [activePlaylistId, setActivePlaylistId] = useState<string>(() => {
      return localStorage.getItem('gsat_active_playlist_id') || 'default';
  });

  // Daily Goal & Streak State
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem('gsat_daily_goal');
    return saved ? parseInt(saved, 10) : 120; // Default 2 hours (120 mins)
  });
  const [streak, setStreak] = useState<StreakData>(() => {
    const saved = localStorage.getItem('gsat_streak');
    return saved ? JSON.parse(saved) : { current: 0, max: 0, lastDate: '' };
  });

  const [incenseCoins, setIncenseCoins] = useState<number>(() => {
    const saved = localStorage.getItem('gsat_incense_coins');
    const migrated = localStorage.getItem('gsat_incense_coins_migrated_v2');
    
    let coins = saved ? parseInt(saved, 10) : 0;
    
    if (!migrated) {
      const savedSessions = localStorage.getItem('gsat_study_history');
      if (savedSessions) {
        try {
          const sessions = JSON.parse(savedSessions);
          const pastCoins = sessions.reduce((acc: number, curr: any) => acc + (curr.durationMinutes || 0), 0);
          if (coins < pastCoins) {
             coins = pastCoins;
          }
        } catch (e) {}
      }
      localStorage.setItem('gsat_incense_coins_migrated_v2', 'true');
    }
    
    return coins;
  });
  const [incenseRecords, setIncenseRecords] = useState<AppData['incenseRecords']>(() => {
    const saved = localStorage.getItem('gsat_incense_records');
    return saved ? JSON.parse(saved) : [];
  });
  const [templeState, setTempleState] = useState<AppData['templeState']>(() => {
    const saved = localStorage.getItem('gsat_temple_state');
    return saved ? JSON.parse(saved) : { lamps: [], fortunes: [], ticketOffered: false };
  });
  const [examChecklist, setExamChecklist] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('gsat_exam_checklist');
    return saved ? JSON.parse(saved) : {};
  });

  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup' | 'forgot' | 'reset' | 'profile' | 'change-password' | 'devices' | undefined>(undefined);
  const [authInitialEmail, setAuthInitialEmail] = useState<string | undefined>(undefined);
  const [authInitialResetCode, setAuthInitialResetCode] = useState<string | undefined>(undefined);
  const [activePage, setActivePage] = useState<ActivePage>(() => getInitialActivePage());
  const [isScoreWarningOpen, setIsScoreWarningOpen] = useState(false);
  const [isLoginSuggestionOpen, setIsLoginSuggestionOpen] = useState(false);
  const [isExamReminderOpen, setIsExamReminderOpen] = useState(false);
  const [isCommunityStudyOpen, setIsCommunityStudyOpen] = useState(false);
  const [isTempleOpen, setIsTempleOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [pendingExamSwitch, setPendingExamSwitch] = useState<ExamPreset | null>(null);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('gsat_unlocked_achievements') || '[]');
  });
  const unlockedAchievementIdsRef = useRef(new Set(unlockedAchievementIds));
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const [currentAchievementToast, setCurrentAchievementToast] = useState<Achievement | null>(null);
  const [showWelcome, setShowWelcome] = useState(() => sessionStorage.getItem('gsat_welcome_pending') === 'true');
  
  // Confirm Reset State
  const [confirmResetType, setConfirmResetType] = useState<'tasks' | 'sessions' | 'dates' | null>(null);

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
    const savedUser = localStorage.getItem('gsat_user_profile');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (activePage !== 'account' || user) return;
    setActivePage('home');
    setIsAuthOpen(true);
  }, [activePage, user]);
  
  // Store encryption key separately
  const [encryptionKey, setEncryptionKey] = useState<string | null>(() => {
    return localStorage.getItem('gsat_user_key');
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<number | null>(null);
  const forceSyncRef = useRef(false);
  const authInvalidationHandledRef = useRef(false);
  const isHandlingPopStateRef = useRef(false);
  const hasInitializedHistoryRef = useRef(false);

  useEffect(() => {
    // Remove passwords stored by older versions. Supabase sessions handle authentication.
    localStorage.removeItem('gsat_temp_pass');
  }, []);

  // Exam Selection Selection State
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return EXAM_PRESETS.find(p => p.id === (localStorage.getItem('gsat_target_exam') || '116gsat'))?.category || 'gsat';
  });

  useEffect(() => {
    const exam = EXAM_PRESETS.find(p => p.id === targetExam);
    if (exam) {
      setSelectedCategory(exam.category);
    }
  }, [targetExam]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isHandlingPopStateRef.current = true;
      const page = event.state?.appPage;
      setActivePage(isActivePage(page) ? page : getInitialActivePage());
      setIsMenuOpen(false);
      setConfirmResetType(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isHandlingPopStateRef.current) {
      isHandlingPopStateRef.current = false;
      return;
    }

    const currentUrl = hasAuthCallbackParams()
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : getAppRouteUrl(activePage, targetExam);
    const state = { appPage: activePage };

    if (!hasInitializedHistoryRef.current || hasAuthCallbackParams()) {
      window.history.replaceState(state, document.title, currentUrl);
      hasInitializedHistoryRef.current = true;
      return;
    }

    window.history.pushState(state, document.title, currentUrl);
  }, [activePage, targetExam]);

  useEffect(() => {
    const examName = currentExam?.name || '大考';
    const pageLabel = SEO_PAGE_LABELS[activePage];
    const title = pageLabel
      ? `${pageLabel} - ${examName}倒數 | Focus Space`
      : `${examName}倒數 - 學測・會考・統測・分科讀書助手`;
    const description = `${examName}倒數計時與備考助手，提供精準倒數、番茄鐘專注計時、讀書計畫、歷屆試題、成就徽章與雲端同步紀錄。`;

    updateSeoMetadata({
      title,
      description,
      canonicalPath: activePage === 'home' ? `/${targetExam}` : `/${targetExam}?page=${activePage}`,
      image: '/og-image.png',
      imageAlt: 'Focus Space 大考倒數：學測、會考、統測、分科測驗讀書計時助手',
    });
  }, [activePage, currentExam, targetExam]);

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

       const hasSeenReminder = localStorage.getItem('gsat_exam_reminder_seen_116');
       
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
     localStorage.setItem('gsat_exam_reminder_seen_116', 'true');
  };

  // Login Suggestion Logic
  useEffect(() => {
     if (!user) {
        const hasSeenSuggestion = localStorage.getItem('gsat_login_suggestion_seen');
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
     localStorage.setItem('gsat_login_suggestion_seen', 'true');
  };

  const handleSuggestionToAuth = () => {
     setIsLoginSuggestionOpen(false);
     setIsAuthOpen(true);
     localStorage.setItem('gsat_login_suggestion_seen', 'true');
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
    localStorage.removeItem('gsat_user_profile');
    localStorage.removeItem('gsat_user_key');
    localStorage.removeItem('gsat_temp_pass');
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

  // Sync Logic (PUSH)
  const triggerSync = (immediate = false) => {
    if (!user || !encryptionKey) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    const doSync = async () => {
       syncTimeoutRef.current = null;
       setIsSyncing(true);
       const currentData: AppData = {
         tasks,
         studySessions,
         challengeRecords,
         targetSchool,
         targetMajor,
         targetDateStr,
         targetExam,
         tvetCategory,
         customDates,
         dailyGoal,
         streak,
         playlists,
         activePlaylistId,
         incenseCoins,
         incenseRecords,
         templeState,
         unlockedAchievementIds,
         examChecklist,
         team
       };
       
       try {
         const res = await authService.syncData(user.email, '', currentData, encryptionKey);
         if (!res.success && authService.isAuthError(res)) {
            handleAuthError();
         } else if (res.success) {
            const logRes = await authService.syncStudyLogs(currentData.studySessions, team);
            if (!logRes.success && authService.isAuthError(logRes)) {
               handleAuthError();
            }
         }
       } catch (e) {
         console.error("Sync failed", e);
       }
       setIsSyncing(false);
    };

    if (immediate) {
      doSync();
    } else {
      syncTimeoutRef.current = window.setTimeout(doSync, 2000);
    }
  };

  // Background Poll Logic (PULL) with MERGE
  useEffect(() => {
     if (!user || !encryptionKey) return;

     const pollInterval = setInterval(async () => {
        if (isSyncing || syncTimeoutRef.current) return;

        try {
            const res = await authService.getData(user.email, '', encryptionKey);
            
            if (!res.success && authService.isAuthError(res)) {
                handleAuthError();
                clearInterval(pollInterval);
                return;
            }

            if (res.success && res.data) {
                const cloud = res.data;
                
                // --- Merge Logic to prevent data loss ---
                
                // Tasks (Merge by ID)
                if (cloud.tasks) {
                    setTasks(prev => {
                       const merged = mergeById(prev, cloud.tasks);
                       return JSON.stringify(merged) !== JSON.stringify(prev) ? merged : prev;
                    });
                }
                
                // Sessions (Merge by ID + Sort)
                if (cloud.studySessions) {
                    setStudySessions(prev => {
                        const merged = mergeById(prev, cloud.studySessions);
                        merged.sort((a, b) => a.timestamp - b.timestamp);
                        return JSON.stringify(merged) !== JSON.stringify(prev) ? merged : prev;
                    });
                }

                // Challenge Records (Merge by ID)
                if (cloud.challengeRecords) {
                    setChallengeRecords(prev => {
                        const merged = mergeById(prev, cloud.challengeRecords);
                        return JSON.stringify(merged) !== JSON.stringify(prev) ? merged : prev;
                    });
                }

                // Custom Dates (Merge by ID + Sort)
                if (cloud.customDates) {
                    setCustomDates(prev => {
                        const merged = mergeById(prev, cloud.customDates);
                        merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        return JSON.stringify(merged) !== JSON.stringify(prev) ? merged : prev;
                    });
                }

                if (cloud.team !== undefined) {
                    setTeam(prev => prev !== cloud.team ? (cloud.team || '') : prev);
                }

                // Playlists (Direct overwrite from cloud to support track additions/deletions)
                if (cloud.playlists) {
                    setPlaylists(prev => {
                        return JSON.stringify(cloud.playlists) !== JSON.stringify(prev) ? cloud.playlists : prev;
                    });
                }

                // Single Value Fields (Cloud wins if different)
                if (cloud.dailyGoal && cloud.dailyGoal !== dailyGoal) setDailyGoal(cloud.dailyGoal);
                if (cloud.incenseCoins !== undefined && cloud.incenseCoins !== incenseCoins) setIncenseCoins(cloud.incenseCoins);
                
                if (cloud.incenseRecords) {
                    setIncenseRecords(prev => {
                        const merged = mergeById(prev, cloud.incenseRecords);
                        merged.sort((a, b) => b.timestamp - a.timestamp);
                        return JSON.stringify(merged) !== JSON.stringify(prev) ? merged : prev;
                    });
                }
                
                // Streak (Complex object, use Cloud as master usually)
                if (cloud.streak && JSON.stringify(cloud.streak) !== JSON.stringify(streak)) setStreak(cloud.streak);
                if (cloud.templeState && JSON.stringify(cloud.templeState) !== JSON.stringify(templeState)) setTempleState(cloud.templeState);

                if (cloud.unlockedAchievementIds) {
                    setUnlockedAchievementIds(prev => {
                        const merged = Array.from(new Set([...prev, ...(cloud.unlockedAchievementIds as string[])]));
                        if (JSON.stringify(merged) !== JSON.stringify(prev)) {
                            localStorage.setItem('gsat_unlocked_achievements', JSON.stringify(merged));
                            return merged;
                        }
                        return prev;
                    });
                }
                
                if (cloud.examChecklist && JSON.stringify(cloud.examChecklist) !== JSON.stringify(examChecklist)) {
                    setExamChecklist(cloud.examChecklist);
                }

                // Metadata
                if (cloud.targetSchool && cloud.targetSchool !== targetSchool) setTargetSchool(cloud.targetSchool);
                if (cloud.targetMajor && cloud.targetMajor !== targetMajor) setTargetMajor(cloud.targetMajor);
                if (cloud.targetDateStr && cloud.targetDateStr !== targetDateStr) setTargetDateStr(cloud.targetDateStr);
                if (cloud.targetExam && cloud.targetExam !== targetExam) setTargetExam(cloud.targetExam);
            }
        } catch (e) {
            console.error("Polling error", e);
        }
     }, 15000); 

     return () => clearInterval(pollInterval);
  }, [user, encryptionKey, isSyncing, dailyGoal, streak, targetSchool, targetMajor, targetDateStr, targetExam]); 
  // Note: We removed list dependencies (tasks, sessions) from useEffect to prevent reset loops.
  // We use functional state updates (setTasks(prev => ...)) inside to access latest state.

  // Persistence Effects
  useEffect(() => { 
    localStorage.setItem('gsat_tasks', JSON.stringify(tasks)); 
    triggerSync(forceSyncRef.current);
    if(forceSyncRef.current) forceSyncRef.current = false;
  }, [tasks]);

  useEffect(() => { 
    localStorage.setItem('gsat_target_date', targetDateStr); 
    triggerSync(); 
  }, [targetDateStr]);

  useEffect(() => { 
    localStorage.setItem('gsat_target_exam', targetExam); 
    triggerSync(); 
  }, [targetExam]);

  useEffect(() => { 
    localStorage.setItem('gsat_tvet_category', tvetCategory); 
    triggerSync(); 
  }, [tvetCategory]);

  useEffect(() => { 
    localStorage.setItem('gsat_target_school', targetSchool); 
    triggerSync(); 
  }, [targetSchool]);

  useEffect(() => { 
    localStorage.setItem('gsat_target_major', targetMajor); 
    triggerSync(); 
  }, [targetMajor]);

  useEffect(() => {
    localStorage.setItem('gsat_team', team);
    triggerSync(true); // force sync
  }, [team]);

  useEffect(() => { 
    localStorage.setItem('gsat_study_history', JSON.stringify(studySessions)); 
    triggerSync(forceSyncRef.current);
    if(forceSyncRef.current) forceSyncRef.current = false;
  }, [studySessions]);

  useEffect(() => { 
    localStorage.setItem('gsat_challenge_records', JSON.stringify(challengeRecords)); 
    triggerSync(); 
  }, [challengeRecords]);

  useEffect(() => { 
    localStorage.setItem('gsat_custom_dates', JSON.stringify(customDates)); 
    triggerSync(); 
  }, [customDates]);

  useEffect(() => { 
    localStorage.setItem('gsat_team', team); 
    triggerSync(); 
  }, [team]);

  useEffect(() => { 
    localStorage.setItem('gsat_daily_goal', dailyGoal.toString()); 
    triggerSync(); 
  }, [dailyGoal]);

  useEffect(() => { 
    localStorage.setItem('gsat_streak', JSON.stringify(streak)); 
    triggerSync(); 
  }, [streak]);

  useEffect(() => { 
    localStorage.setItem('gsat_playlists', JSON.stringify(playlists)); 
    triggerSync(); 
  }, [playlists]);

  useEffect(() => { 
    localStorage.setItem('gsat_active_playlist_id', activePlaylistId); 
    triggerSync(); 
  }, [activePlaylistId]);

  useEffect(() => { 
    localStorage.setItem('gsat_incense_coins', incenseCoins.toString()); 
    triggerSync(); 
  }, [incenseCoins]);

  useEffect(() => { 
    localStorage.setItem('gsat_incense_records', JSON.stringify(incenseRecords)); 
    triggerSync(); 
  }, [incenseRecords]);

  useEffect(() => { 
    localStorage.setItem('gsat_temple_state', JSON.stringify(templeState)); 
    triggerSync(); 
  }, [templeState]);

  useEffect(() => {
    localStorage.setItem('gsat_exam_checklist', JSON.stringify(examChecklist));
    triggerSync();
  }, [examChecklist]);

  useEffect(() => {
    localStorage.setItem('gsat_unlocked_achievements', JSON.stringify(unlockedAchievementIds));
    unlockedAchievementIdsRef.current = new Set(unlockedAchievementIds);
    triggerSync();
  }, [unlockedAchievementIds]);

  useEffect(() => { if(user) localStorage.setItem('gsat_user_profile', JSON.stringify(user)); }, [user]);
  useEffect(() => { if(encryptionKey) localStorage.setItem('gsat_user_key', encryptionKey); }, [encryptionKey]);

  // Streak Calculation Logic
  const checkStreakUpdate = (currentSessions: StudySession[]) => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = todayStart + 86400000;

      const todayTotal = currentSessions
        .filter(s => s.timestamp >= todayStart && s.timestamp < todayEnd)
        .reduce((acc, curr) => acc + curr.durationMinutes, 0);

      if (todayTotal >= dailyGoal) {
          if (streak.lastDate !== todayStr) {
              const yesterday = new Date(now);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];

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
    const newSession = { ...sessionData, id: Date.now().toString() };
    const updatedSessions = [...studySessions, newSession];
    setStudySessions(updatedSessions);
    
    // Add incense coins (1 minute = 1 coin)
    if (sessionData.durationMinutes > 0) {
      setIncenseCoins(prev => prev + sessionData.durationMinutes);
      setIncenseRecords(prev => [{
        id: Date.now().toString(),
        amount: sessionData.durationMinutes,
        reason: `專注學習 (${sessionData.subjectName})`,
        timestamp: Date.now()
      }, ...prev]);
    }

    checkStreakUpdate(updatedSessions);

    if (user) {
       authService.logSession(user.email, '', newSession, team)
         .then(res => {
            if (!res.success && authService.isAuthError(res)) {
               handleAuthError();
            }
         })
         .catch(err => console.error("Log session error", err));
    }
  };

  const handleSaveChallenge = (record: Omit<ChallengeRecord, 'id'>) => {
    setChallengeRecords(prev => [...prev, { ...record, id: Date.now().toString() }]);
  };
  
  const executeReset = () => {
    forceSyncRef.current = true;
    if (confirmResetType === 'tasks') {
        setTasks([]);
    } else if (confirmResetType === 'sessions') {
        setStudySessions([]);
    } else if (confirmResetType === 'dates') {
        setCustomDates([]);
    }
    setConfirmResetType(null);
    setIsSettingsOpen(false);
  };

  const handleLoginSuccess = (loggedInUser: User, cloudData?: AppData, key?: string) => {
    authInvalidationHandledRef.current = false;
    setUser(loggedInUser);
    localStorage.setItem('gsat_user_profile', JSON.stringify(loggedInUser));
    if (key) {
      setEncryptionKey(key);
      localStorage.setItem('gsat_user_key', key);
    }
    
    // Prepare remote data (empty if undefined) to allow merging with local data
    const remoteData = cloudData || {
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
    const mergedTasks = mergeById(tasks, remoteData.tasks);
    const mergedSessions = mergeById(studySessions, remoteData.studySessions);
    mergedSessions.sort((a, b) => a.timestamp - b.timestamp);
    
    const mergedChallenges = mergeById(challengeRecords, remoteData.challengeRecords);
    
    const mergedCustomDates = mergeById(customDates, remoteData.customDates);
    mergedCustomDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const mergedPlaylists = (remoteData.playlists && remoteData.playlists.length > 0) ? remoteData.playlists : playlists;
    
    const mergedIncenseRecords = mergeById(incenseRecords, remoteData.incenseRecords);
    mergedIncenseRecords.sort((a, b) => b.timestamp - a.timestamp);

    // Save merged state to local storage
    localStorage.setItem('gsat_tasks', JSON.stringify(mergedTasks));
    localStorage.setItem('gsat_study_history', JSON.stringify(mergedSessions));
    localStorage.setItem('gsat_challenge_records', JSON.stringify(mergedChallenges));
    localStorage.setItem('gsat_custom_dates', JSON.stringify(mergedCustomDates));
    localStorage.setItem('gsat_playlists', JSON.stringify(mergedPlaylists));
    localStorage.setItem('gsat_incense_records', JSON.stringify(mergedIncenseRecords));
    
    // For configuration values, prioritize remote if present, otherwise keep local (e.g. upload local to new account)
    if (remoteData.targetSchool) localStorage.setItem('gsat_target_school', remoteData.targetSchool);
    if (remoteData.targetMajor) localStorage.setItem('gsat_target_major', remoteData.targetMajor);
    if (remoteData.targetDateStr) localStorage.setItem('gsat_target_date', remoteData.targetDateStr);
    if (remoteData.targetExam) localStorage.setItem('gsat_target_exam', remoteData.targetExam);
    if (remoteData.tvetCategory) localStorage.setItem('gsat_tvet_category', remoteData.tvetCategory);
    if (remoteData.dailyGoal) localStorage.setItem('gsat_daily_goal', remoteData.dailyGoal.toString());
    if (remoteData.streak && remoteData.streak.lastDate) localStorage.setItem('gsat_streak', JSON.stringify(remoteData.streak));
    if (remoteData.activePlaylistId) localStorage.setItem('gsat_active_playlist_id', remoteData.activePlaylistId);
    if (remoteData.incenseCoins !== undefined) localStorage.setItem('gsat_incense_coins', remoteData.incenseCoins.toString());
    if (remoteData.templeState) localStorage.setItem('gsat_temple_state', JSON.stringify(remoteData.templeState));
    if (remoteData.team !== undefined) localStorage.setItem('gsat_team', remoteData.team);

    // Set welcome flag for next load
    sessionStorage.setItem('gsat_welcome_pending', 'true');

    // Force reload to pick up new state, trigger effects, and push sync to cloud
    window.location.reload(); 
  };

  const handleLogout = async () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    await authService.logout();
    const keysToRemove = [
      'gsat_user_profile',
      'gsat_user_key',
      'gsat_temp_pass',
      'gsat_tasks',
      'gsat_study_history',
      'gsat_challenge_records',
      'gsat_target_school',
      'gsat_target_major',
      'gsat_target_date',
      'gsat_target_exam',
      'gsat_custom_dates',
      'gsat_daily_goal',
      'gsat_streak',
      'gsat_playlists',
      'gsat_active_playlist_id',
      'gsat_incense_coins',
      'gsat_incense_records',
      'gsat_temple_state',
      'gsat_team',
      'gsat_login_suggestion_seen',
      'gsat_exam_reminder_seen_116'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setUser(null);
    setEncryptionKey(null);
    
    window.location.reload();
  };

  // Timer Interval
  useEffect(() => {
    let timeoutId: number | undefined;

    const updateTimeLeft = () => {
      const now = new Date();
      setTimeLeft(getTimeLeft(targetDateStr, now));
      const nextTickDelay = 1000 - (now.getTime() % 1000) + 12;
      timeoutId = window.setTimeout(updateTimeLeft, nextTickDelay);
    };

    updateTimeLeft();
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [targetDateStr]);

  const getCurrentData = (): AppData => ({
    tasks,
    studySessions,
    challengeRecords,
    targetSchool,
    targetMajor,
    targetDateStr,
    customDates,
    dailyGoal,
    streak,
    playlists,
    activePlaylistId,
    incenseCoins,
    incenseRecords,
    templeState,
    unlockedAchievementIds,
    examChecklist
  });

  const isInitialMount = useRef(true);

  useEffect(() => {
    const data = getCurrentData();
    const shouldNotify = !isInitialMount.current;
    const knownUnlockedIds = unlockedAchievementIdsRef.current;

    const newUnlocked = ACHIEVEMENTS.filter(achievement => {
      if (knownUnlockedIds.has(achievement.id)) return false;
      try {
        return achievement.condition(data);
      } catch {
        return false;
      }
    });

    if (newUnlocked.length > 0) {
      newUnlocked.forEach(achievement => knownUnlockedIds.add(achievement.id));
      const newUnlockedIds = newUnlocked.map(achievement => achievement.id);
      setUnlockedAchievementIds(prev => Array.from(new Set([...prev, ...newUnlockedIds])));

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
  }, [studySessions, tasks, streak, currentAchievementToast]);

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
    '115cap': {
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
      start: '2027-06-05T08:00:00',
      end: '2027-08-31T17:00:00',
      label: '116 會考',
      displayStr: '116.06.05 (預計)',
    },
    '115cap': {
      start: '2026-06-05T08:00:00',
      end: '2026-08-31T17:00:00',
      label: '115 會考',
      displayStr: '115.06.05 (08:00) ~ 08.31 (17:00)',
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
      start: '2027-07-28T09:00:00',
      end: '2027-08-31T17:00:00',
      label: '116 分科',
      displayStr: '116.07.28 (預計)'
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

  const PromoCard = (
     <a 
        href={promoResource.href}
        target="_blank" 
        rel="noopener noreferrer" 
        className={`relative overflow-hidden rounded-3xl p-5 border border-white/60 bg-gradient-to-br from-white/80 to-amber-50/50 shadow-sm hover:shadow-md ${promoResource.border} transition-all duration-300 group cursor-pointer block`}
     >
        <div className={`absolute -right-4 -top-4 w-28 h-28 bg-gradient-to-br ${promoResource.glow} rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity`}></div>
        
        <div className="relative z-10 flex flex-col gap-3">
           <div className="flex justify-between items-start">
              <div className={`px-2.5 py-1 rounded-lg bg-gradient-to-r ${promoResource.accent} text-white text-[0px] font-bold tracking-wider shadow-sm shadow-orange-200/50`}>
                 <span className="text-[10px]">{promoResource.badge}</span>
                 115 學測生必看
              </div>
              <ExternalLink className={`w-4 h-4 text-slate-400 transition-colors ${promoResource.text}`} />
           </div>
           
           <div>
              <h3 className="text-[0px] font-bold text-slate-800 mb-1 flex items-center gap-2">
                 <span className="text-base">{promoResource.title}</span>
                 升大學管道與日程
                 <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </h3>
              <p className="text-[0px] text-slate-500 font-medium leading-relaxed group-hover:text-slate-600 transition-colors">
                 <span className="text-xs">{promoResource.description}</span>
                 完整收錄 115 學年度升學重要日期整理、簡章公告與入學管道詳細解析。
              </p>
           </div>

           <div className={`flex items-center gap-1.5 text-[0px] font-bold ${promoResource.text} opacity-80 group-hover:opacity-100 transition-opacity mt-1`}>
              <CalendarDays className="w-3 h-3" />
              <span className="text-[10px]">{promoResource.action}</span>
              <span>點擊查看重要時程</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
           </div>
        </div>
     </a>
  );

  const IdentityPromoCard = (
     <a
        href={promoResource.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`relative overflow-hidden rounded-3xl p-5 border border-white/60 bg-gradient-to-br from-white/80 to-amber-50/50 shadow-sm hover:shadow-md ${promoResource.border} transition-all duration-300 group cursor-pointer block`}
     >
        <div className={`absolute -right-4 -top-4 w-28 h-28 bg-gradient-to-br ${promoResource.glow} rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity`}></div>

        <div className="relative z-10 flex flex-col gap-3">
           <div className="flex justify-between items-start gap-3">
              <div className={`px-2.5 py-1 rounded-lg bg-gradient-to-r ${promoResource.accent} text-white text-[10px] font-bold tracking-wider shadow-sm shadow-orange-200/50`}>
                 {promoResource.badge}
              </div>
              <ExternalLink className={`w-4 h-4 text-slate-400 transition-colors ${promoResource.text}`} />
           </div>

           <div>
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                 {promoResource.title}
                 <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed group-hover:text-slate-600 transition-colors">
                 {promoResource.description}
              </p>
           </div>

           <div className={`flex items-center gap-1.5 text-[10px] font-bold ${promoResource.text} opacity-80 group-hover:opacity-100 transition-opacity mt-1`}>
              <CalendarDays className="w-3 h-3" />
              <span>{promoResource.action}</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
           </div>
        </div>
     </a>
  );

  const handleWelcomeComplete = React.useCallback(() => {
    setShowWelcome(false);
    sessionStorage.removeItem('gsat_welcome_pending');
  }, []);

  const documentPages = {
    instructions: {
      eyebrow: 'Guide',
      title: '使用說明',
      subtitle: '快速掌握 Focus Space 的核心工作流，從設定目標、開始專注，到同步紀錄與查看榜單。',
      icon: BookOpen,
      accent: 'indigo',
      updated: '適用於目前版本',
      highlights: ['設定考試與目標', '管理任務與日程', '使用讀書計時器', '同步資料與榜單'],
      sections: [
        {
          title: '先設定你的考試目標',
          icon: Target,
          body: '在主畫面或設定中選擇考試類型、年份與倒數日期。你也可以填入目標學校與科系，讓倒數、讀書紀錄與提醒都圍繞同一個目標運作。'
        },
        {
          title: '用計時器建立讀書節奏',
          icon: Clock,
          body: '計時器支援倒數、正數、模擬考與挑戰模式。完成一次專注後，系統會累積讀書時間；挑戰模式則會結合待辦清單，讓完成任務也能轉成挑戰分數。'
        },
        {
          title: '把任務、日程與統計放在一起看',
          icon: ListChecks,
          body: '待辦清單適合拆解每天要完成的題本、章節或複習項目；重要日程可以記錄報名、查分、考試與自訂提醒。讀書統計會幫你追蹤每日目標與連續紀錄。'
        },
        {
          title: '登入後跨裝置同步',
          icon: Cloud,
          body: '登入後可以同步任務、讀書紀錄、挑戰紀錄、播放清單與部分設定。若暫時不登入，資料仍會保存在目前瀏覽器的本機儲存空間。'
        }
      ]
    },
    privacy: {
      eyebrow: 'Privacy',
      title: '隱私權政策',
      subtitle: '我們只收集維持功能所需的資料，並盡量讓你的讀書紀錄保持可控、可理解。',
      icon: Shield,
      accent: 'emerald',
      updated: '最後更新：2026/07/08',
      highlights: ['本機優先儲存', '登入才會同步', '不販售個人資料', '可自行清除資料'],
      sections: [
        {
          title: '我們會儲存哪些資料',
          icon: FileText,
          body: '為了提供倒數、任務、讀書統計、挑戰紀錄、播放清單與個人設定等功能，系統會在瀏覽器本機儲存相關資料。登入後，這些資料才會依同步功能上傳到雲端。'
        },
        {
          title: '帳號與同步資料',
          icon: Lock,
          body: '當你建立帳號或登入時，我們會使用帳號資訊辨識你的同步資料。讀書紀錄、任務與設定只用於提供服務功能，例如跨裝置同步、排行榜與個人統計。'
        },
        {
          title: '第三方服務',
          icon: Server,
          body: '本服務可能使用資料庫、登入、音樂播放或 AI 輔助等第三方服務。這些服務可能有各自的資料處理方式，我們會盡量只傳送完成該功能所需的最少資料。'
        },
        {
          title: '你的控制權',
          icon: CheckCircle2,
          body: '你可以在設定中重置任務、讀書紀錄或重要日程，也可以登出停止同步。若你清除瀏覽器資料，本機儲存的內容也可能被移除。'
        }
      ]
    },
    terms: {
      eyebrow: 'Terms',
      title: '服務條款',
      subtitle: '使用 Focus Space 代表你理解這是一個讀書輔助工具，並同意以合理、合法且尊重他人的方式使用。',
      icon: ScrollText,
      accent: 'amber',
      updated: '最後更新：2026/07/08',
      highlights: ['讀書輔助用途', '自行負責資料備份', '合理使用榜單', '服務可能調整'],
      sections: [
        {
          title: '服務定位',
          icon: Sparkles,
          body: 'Focus Space 提供考試倒數、讀書計時、任務管理、日程提醒、統計與排行榜等功能。它能協助你建立讀書節奏，但不保證任何考試結果。'
        },
        {
          title: '使用者責任',
          icon: ClipboardCheck,
          body: '請勿利用本服務進行干擾系統、冒用他人身份、提交不實資料、破壞排行榜公平性或其他違法行為。你也應自行確認考試資訊與官方公告。'
        },
        {
          title: '資料與可用性',
          icon: Cloud,
          body: '我們會努力維持服務穩定，但仍可能因維護、網路、第三方服務或不可抗力造成中斷。重要資料建議自行備份，避免單一工具故障影響讀書安排。'
        },
        {
          title: '條款更新',
          icon: RefreshCw,
          body: '我們可能依功能調整、法規需求或服務營運狀況更新條款。更新後繼續使用本服務，即視為你理解並接受新的條款內容。'
        }
      ]
    }
  } as const;

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
        }
      ]
    },
    privacy: {
      eyebrow: 'Privacy',
      title: '隱私權政策',
      subtitle: '本政策說明 Focus Space 會如何儲存、同步與使用你的資料。原則是本機優先、登入才同步、僅為提供功能而使用。',
      icon: Shield,
      accent: 'emerald',
      updated: '最後更新：2026/07/08',
      highlights: ['本機優先儲存', '登入後才同步', '不販售個人資料', '可自行清除資料'],
      sections: [
        {
          title: '1. 本機儲存的資料',
          icon: FileText,
          body: '未登入時，本服務會使用瀏覽器 localStorage 儲存資料，包括考試設定、目標學校與科系、待辦清單、讀書紀錄、挑戰紀錄、自訂日期、每日目標、連續紀錄、播放清單、音樂設定、主題設定、成就、祈願相關資料與考前檢查清單。這些資料通常只存在你目前使用的瀏覽器與裝置。'
        },
        {
          title: '2. 帳號、登入與同步資料',
          icon: Lock,
          body: '當你註冊或登入時，系統會透過 Supabase 處理帳號驗證，並可能儲存電子郵件、名稱、考試類型、隊伍、裝置識別碼、裝置名稱、登入狀態與同步用資料。登入後，任務、讀書紀錄、挑戰紀錄、播放清單、部分設定與隊伍資訊可能會同步到雲端，以提供跨裝置使用、排行榜與裝置管理功能。'
        },
        {
          title: '3. 裝置資料與安全登入',
          icon: Server,
          body: '為了支援裝置管理與登入狀態檢查，系統會產生並儲存 deviceId，並根據瀏覽器 user agent 產生裝置名稱，例如 Chrome on Windows。若使用 Passkey，驗證流程會透過瀏覽器與 Supabase 支援的 WebAuthn/Passkey 機制處理；本服務不會取得你的生物辨識資料。'
        },
        {
          title: '4. 第三方服務',
          icon: ExternalLink,
          body: '本服務目前可能使用 Supabase 提供登入、資料庫、同步與排行榜功能；使用 YouTube IFrame API 播放背景音樂；使用 YouTube 縮圖顯示封面；新增 YouTube 歌曲時可能透過 noembed 查詢影片標題。瀏覽器載入這些第三方服務時，對方可能依其政策處理技術資訊，例如 IP 位址、瀏覽器資訊或請求紀錄。'
        },
        {
          title: '5. AI 與語錄功能',
          icon: Sparkles,
          body: '目前瀏覽器端不會直接夾帶 Gemini API key，也不會把你的個人讀書資料直接送往 Gemini。語錄服務在沒有安全後端端點時會使用內建備用語錄。若未來恢復 AI 生成或新增伺服器端 AI 功能，應另行更新本政策並清楚說明資料使用方式。'
        },
        {
          title: '6. 資料用途',
          icon: CheckCircle2,
          body: '資料會用於提供倒數、任務管理、讀書統計、學習歷程、排行榜、隊伍、今日共讀、登入同步、裝置管理、成就與播放清單等功能。我們不會販售你的個人資料，也不會將你的讀書內容用於與本服務無關的廣告交易。'
        },
        {
          title: '7. 你的控制權與刪除方式',
          icon: RefreshCw,
          body: '你可以在設定中重置任務、讀書紀錄或重要日程，也可以登出帳號、移除裝置或清除瀏覽器資料。清除瀏覽器 localStorage 會移除本機資料；若你已登入，雲端資料仍可能保留，除非服務提供相應刪除或重置流程。'
        },
        {
          title: '8. 資料安全與限制',
          icon: Shield,
          body: '我們會盡力使用登入驗證、Supabase 權限設定與瀏覽器安全機制保護資料。不過，任何網路服務都無法保證百分之百安全；請避免在任務、目標或自訂欄位輸入敏感個資、密碼、身分證字號、住址、金融資訊或不希望外洩的內容。'
        }
      ]
    },
    terms: {
      eyebrow: 'Terms',
      title: '服務條款',
      subtitle: '使用 Focus Space 即代表你了解本服務是讀書輔助工具，並同意以合法、合理且不干擾他人的方式使用。',
      icon: ScrollText,
      accent: 'amber',
      updated: '最後更新：2026/07/08',
      highlights: ['讀書輔助用途', '自行確認官方資訊', '合理使用同步與榜單', '服務可能調整'],
      sections: [
        {
          title: '1. 服務內容',
          icon: Sparkles,
          body: 'Focus Space 提供考試倒數、讀書計時、任務管理、重要日程、學習歷程、成就、排行榜、隊伍、今日共讀、背景音樂與登入同步等功能。這些功能是為了協助使用者整理讀書節奏與紀錄，並非官方考試服務。'
        },
        {
          title: '2. 考試資訊與提醒',
          icon: AlertTriangle,
          body: '本服務可能顯示考試日期、查分時間、公告提醒或考前清單，但這些內容僅供輔助參考。正式考試資訊、報名規則、成績查詢、考場規定與日程異動，請以大考中心、技專校院入學測驗中心、國中教育會考官方網站或其他主管機關公告為準。'
        },
        {
          title: '3. 使用者責任',
          icon: ClipboardCheck,
          body: '你同意不以本服務進行違法行為、干擾系統、嘗試未授權存取、冒用他人身分、提交不實資料、破壞排行榜公平性、散布惡意連結或侵犯他人權利。你也應自行妥善保管帳號、密碼、登入裝置與瀏覽器資料。'
        },
        {
          title: '4. 帳號、同步與資料備份',
          icon: Cloud,
          body: '登入同步是便利功能，不代表永久備份保證。因瀏覽器清除資料、網路異常、第三方服務中斷、同步衝突、使用者重置資料或其他不可預期因素，紀錄可能遺失或不完整。重要讀書紀錄、考試資訊與個人安排，建議自行備份或另行保存。'
        },
        {
          title: '5. 排行榜與社群功能',
          icon: Trophy,
          body: '排行榜、隊伍排名與今日共讀統計依系統可取得的同步資料計算，可能因延遲、網路、資料同步狀態或計算規則調整而變動。請勿使用程式化方式灌水、偽造紀錄或干擾他人排名；如偵測到異常使用，服務可限制、排除或重置相關資料。'
        },
        {
          title: '6. 第三方內容與服務',
          icon: ExternalLink,
          body: '背景音樂與自訂歌曲可能連結至 YouTube 或其他第三方資料來源。你需自行確認使用的影片、音樂或外部內容符合相關平台規範與著作權要求。第三方服務的可用性、內容正確性與資料處理方式，不由本服務完全控制。'
        },
        {
          title: '7. 免責聲明',
          icon: Shield,
          body: '本服務以現況提供，不保證不中斷、無錯誤、完全符合你的需求，或必然提升成績。因使用或無法使用本服務、資料遺失、同步失敗、第三方服務中斷、考試資訊誤用或使用者自行操作造成的損失，除法律另有強制規定外，本服務不負超出合理範圍的責任。'
        },
        {
          title: '8. 條款更新與服務調整',
          icon: RefreshCw,
          body: '我們可能依功能更新、資安需求、法規變更或營運狀況調整服務內容與條款。更新後繼續使用本服務，即視為你理解並接受更新內容；若不同意，請停止使用並視需要清除本機資料或登出帳號。'
        }
      ]
    }
  } as const;

  const renderDocumentPage = () => {
    if (activePage !== 'instructions' && activePage !== 'privacy' && activePage !== 'terms') return null;
    const page = completeDocumentPages[activePage];
    const Icon = page.icon;
    const accentClasses = {
      indigo: {
        text: 'text-indigo-700',
        bg: 'bg-indigo-50',
        border: 'border-indigo-100',
        bar: 'from-indigo-500 via-violet-500 to-sky-400',
        button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/70'
      },
      emerald: {
        text: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        bar: 'from-emerald-500 via-teal-400 to-sky-400',
        button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/70'
      },
      amber: {
        text: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-100',
        bar: 'from-amber-500 via-orange-400 to-rose-400',
        button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200/70'
      }
    }[page.accent];

    return (
      <main id="main-content" className="max-w-6xl mx-auto relative z-10 pb-12 opacity-0 animate-fade-in-up delay-100">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-xl sm:p-8">
          <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentClasses.bar}`}></div>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setActivePage('home')}
                className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900"
                title="返回主頁"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className={`mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] ${accentClasses.text}`}>
                  <Icon className="h-4 w-4" />
                  {page.eyebrow}
                </p>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{page.title}</h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">{page.subtitle}</p>
              </div>
            </div>
            <div className={`rounded-2xl border ${accentClasses.border} ${accentClasses.bg} px-4 py-3 text-sm font-bold ${accentClasses.text}`}>
              {page.updated}
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-lg shadow-slate-200/50 backdrop-blur-xl">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Highlights</div>
            <div className="space-y-2">
              {page.highlights.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm font-bold text-slate-600">
                  <CheckCircle2 className={`h-4 w-4 ${accentClasses.text}`} />
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <article className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-xl shadow-slate-200/60 backdrop-blur-xl sm:p-6">
            <div className="grid grid-cols-1 gap-4">
              {page.sections.map((section, index) => {
                const SectionIcon = section.icon;
                return (
                  <section key={section.title} className="rounded-[1.25rem] border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${accentClasses.bg} ${accentClasses.text} border ${accentClasses.border}`}>
                        <SectionIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Section {index + 1}
                        </div>
                        <h2 className="text-lg font-black text-slate-900">{section.title}</h2>
                        <p className="mt-2 text-sm font-medium leading-7 text-slate-600">{section.body}</p>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </article>
        </section>
      </main>
    );
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-800 p-4 md:p-8 overflow-x-hidden">
      <a href="#main-content" className="skip-link">跳到主要內容</a>
      {/* Light Theme Dynamic Background */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200 blur-[120px] animate-blob mix-blend-multiply opacity-60 pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-200 blur-[120px] animate-blob animation-delay-2000 mix-blend-multiply opacity-60 pointer-events-none"></div>
      
      {/* Floating Header */}
      <header className="sticky top-4 z-50 mb-8 max-w-7xl mx-auto px-1 sm:px-4 opacity-0 animate-fade-in-down">
         <nav className="flex items-center justify-between p-2 pl-4 md:pl-6 bg-white/70 backdrop-blur-xl rounded-full border border-white/40 shadow-xl shadow-indigo-100/50 transition-all duration-300 hover:bg-white/80 hover:border-white/60" aria-label="主要導覽">
            <div className="flex items-center gap-3">
               <div className="relative group cursor-default" aria-label={`目前考試：${currentExam?.name || '未設定'}`}>
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform overflow-hidden px-1 text-center">
                     {currentExam?.year || '116'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
                     <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" aria-hidden="true"></div>
                  </div>
               </div>
               <div className="flex flex-col">
                  <span className="font-bold text-slate-800 leading-none tracking-tight text-sm md:text-base">{EXAM_PRESETS.find(p => p.id === targetExam)?.name || '學測'}倒數</span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest mt-0.5">FOCUS SPACE</span>
               </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-3">
                  <button
                     onClick={() => setActivePage('settings')}
                     aria-current={activePage === 'settings' ? 'page' : undefined}
                     aria-label={`開啟設定，目前目標學校：${targetSchool || '未設定'}`}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-white rounded-full transition-all border border-slate-100 hover:border-indigo-200 group"
               >
                  <div className="p-1 rounded-full bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                     <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col items-start leading-none pr-1">
                     <span className="text-[9px] text-slate-400 font-bold uppercase">Target</span>
                     <span className="text-xs font-bold text-slate-700 max-w-[100px] truncate">{targetSchool}</span>
                  </div>
               </button>

               <div className="h-6 w-px bg-slate-200 mx-0.5 hidden md:block"></div>

               <div className="flex items-center gap-1">
                  <button onClick={() => setActivePage('ranking')} aria-label="開啟排行榜" aria-current={activePage === 'ranking' ? 'page' : undefined} className="w-10 h-10 rounded-full hover:bg-yellow-50 flex items-center justify-center text-slate-400 hover:text-yellow-600 transition-all relative group" title="排行榜">
                     <Trophy className="w-5 h-5" />
                     <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">排行榜</span>
                  </button>

                  <button 
                     onClick={() => user ? setActivePage('account') : setIsAuthOpen(true)} 
                     className={`w-10 h-10 rounded-full flex items-center justify-center transition-all relative group ${user ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-400 hover:text-indigo-600'}`}
                     aria-label={user ? `開啟帳號設定，已登入為 ${user.name}` : '登入或註冊'}
                     aria-busy={isSyncing || undefined}
                     title={user ? '帳號設定' : '登入/註冊'}
                  >
                     <UserCircle className="w-5 h-5" />
                     {isSyncing && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border border-white animate-ping" aria-hidden="true"></span>
                     )}
                     <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {user ? user.name : '登入'}
                     </span>
                  </button>

                  <button onClick={() => setActivePage('settings')} className="md:hidden w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all relative group" title="設定">
                     <Settings className="w-5 h-5" />
                  </button>

                  <button onClick={() => setIsMenuOpen(true)} className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-white transition-all shadow-md shadow-slate-300 relative group ml-1">
                     <LayoutGrid className="w-4 h-4" />
                     <span className="absolute -bottom-10 right-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">選單</span>
                  </button>
               </div>
            </div>
         </nav>
      </header>

      {activePage === 'ranking' ? (
      <main id="main-content" className="max-w-5xl mx-auto relative z-10 pb-12 opacity-0 animate-fade-in-up delay-100">
        <RankingBoard
          isOpen={true}
          onClose={() => setActivePage('home')}
          currentUser={user}
          challengeRecords={challengeRecords}
          studySessions={studySessions}
          team={team}
          onJoinTeam={(newTeam) => setTeam(newTeam)}
          variant="page"
        />
      </main>
      ) : activePage === 'learning' ? (
      <main id="main-content" className="max-w-6xl mx-auto relative z-10 pb-12 opacity-0 animate-fade-in-up delay-100">
        <FocusStatsModal
          isOpen={true}
          onClose={() => setActivePage('home')}
          sessions={studySessions}
          variant="page"
        />
      </main>
      ) : activePage === 'achievements' ? (
      <main id="main-content" className="max-w-7xl mx-auto relative z-10 pb-12 opacity-0 animate-fade-in-up delay-100">
        <AchievementsModal
          isOpen={true}
          onClose={() => setActivePage('home')}
          data={getCurrentData()}
          variant="page"
        />
      </main>
      ) : activePage === 'temple' ? (
      <main id="main-content" className="max-w-7xl mx-auto relative z-10 pb-12 opacity-0 animate-fade-in-up delay-100">
        <TempleModal
          isOpen={true}
          onClose={() => setActivePage('home')}
          incenseCoins={incenseCoins}
          setIncenseCoins={setIncenseCoins}
          incenseRecords={incenseRecords}
          setIncenseRecords={setIncenseRecords}
          templeState={templeState}
          setTempleState={setTempleState}
          variant="page"
          userName={user?.name}
          targetSchool={targetSchool}
        />
      </main>
      ) : activePage === 'account' && user ? (
        <AccountPage
          currentUser={user}
          onBack={() => setActivePage('home')}
          onLogout={handleLogout}
          onUserUpdate={(updatedUser) => {
            setUser(updatedUser);
            localStorage.setItem('gsat_user_profile', JSON.stringify(updatedUser));
          }}
        />
      ) : activePage === 'settings' ? (
      <main id="main-content" className="max-w-7xl mx-auto relative z-10 pb-12 opacity-0 animate-fade-in-up delay-100">
        <SettingsPage
          onClose={() => {
            setActivePage('home');
            setConfirmResetType(null);
          }}
          targetExam={targetExam}
          setTargetExam={setTargetExam}
          targetDateStr={targetDateStr}
          setTargetDateStr={setTargetDateStr}
          targetSchool={targetSchool}
          setTargetSchool={setTargetSchool}
          targetMajor={targetMajor}
          setTargetMajor={setTargetMajor}
          dailyGoal={dailyGoal}
          setDailyGoal={setDailyGoal}
          tvetCategory={tvetCategory}
          setIsTvetCategoryModalOpen={setIsTvetCategoryModalOpen}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          setPendingExamSwitch={setPendingExamSwitch}
          confirmResetType={confirmResetType}
          setConfirmResetType={setConfirmResetType}
          executeReset={executeReset}
        />
      </main>
      ) : activePage !== 'home' ? (
        renderDocumentPage()
      ) : (
      <main id="main-content" className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 pb-12">
        
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-6 opacity-0 animate-fade-in-up delay-100">
           
<CountdownDisplay 
  timeLeft={timeLeft} 
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
    if (currentPreset && currentPreset.category !== preset.category) {
      setPendingExamSwitch(preset);
    } else {
      setTargetExam(preset.id);
      setTargetDateStr(preset.date);
    }
  }}
           />
           <QuoteCard />

           <button
              onClick={() => setIsAnnouncementOpen(true)}
              className="hidden w-full overflow-hidden rounded-3xl border border-rose-100 bg-white/90 shadow-lg shadow-rose-100/50 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-100/70 text-left"
           >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                 <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <AlertTriangle className="h-6 w-6" />
                 </div>
                 <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                       <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black tracking-widest text-rose-700">最新公告</span>
                       <span className="text-[11px] font-bold text-slate-400">115.07.08 大考中心新聞稿</span>
                    </div>
                    <h3 className="text-base font-black text-slate-800">115 分科測驗因應巴威颱風順延</h3>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                       考試改至 7 月 13 日（一）至 7 月 14 日（二）舉行；查看試場、成績公布與複查日程同步調整。
                    </p>
                 </div>
                 <div className="flex items-center gap-1 text-xs font-black text-rose-600">
                    查看詳情
                    <ArrowRight className="h-4 w-4" />
                 </div>
              </div>
           </button>

           {/* Featured Features */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <button 
                  onClick={() => setActivePage('temple')}
                  className="glass-card p-5 rounded-3xl flex items-center gap-4 group hover:bg-amber-50/50 transition-all border border-white/60 hover:shadow-md text-left"
               >
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform shadow-sm shadow-amber-200/50">
                     <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                     <span className="font-bold text-slate-700 text-base">線上文昌廟</span>
                     <span className="text-xs text-slate-400">祈福、求籤、點燈</span>
                  </div>
               </button>

               <button 
                   onClick={() => setActivePage('achievements')}
                  className="glass-card p-5 rounded-3xl flex items-center gap-4 group hover:bg-indigo-50/50 transition-all border border-white/60 hover:shadow-md text-left"
               >
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform shadow-sm shadow-indigo-200/50">
                     <Medal className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                     <span className="font-bold text-slate-700 text-base">成就與紀錄</span>
                     <span className="text-xs text-slate-400">個人榮譽與讀書歷程</span>
                  </div>
               </button>

               <button
                  onClick={() => setIsCommunityStudyOpen(true)}
                  className="glass-card p-5 rounded-3xl flex items-center gap-4 group hover:bg-emerald-50/50 transition-all border border-white/60 hover:shadow-md text-left"
               >
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform shadow-sm shadow-emerald-200/50">
                     <UsersRound className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col min-w-0">
                     <span className="font-bold text-slate-700 text-base truncate">今日共讀</span>
                     <span className="text-xs text-slate-400">看看大家今天讀多久</span>
                  </div>
               </button>
           </div>

           {/* Quick Links */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <a 
                 href={currentExamLinks.pastUrl} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="glass-card p-4 rounded-2xl flex items-center justify-between group hover:bg-white/80 transition-all border border-white/60 hover:shadow-md"
               >
                  <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                     </div>
                     <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-sm">{currentExamLinks.pastTitle}</span>
                        <span className="text-[10px] text-slate-400">考古題下載</span>
                     </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
               </a>

               <button 
                 onClick={handleScoreQueryClick}
                 className="glass-card p-4 rounded-2xl flex items-center justify-between group hover:bg-white/80 transition-all border border-white/60 text-left hover:shadow-md"
               >
                  <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                        <Search className="w-5 h-5" />
                     </div>
                     <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-sm">{currentExamLinks.scoreTitle}</span>
                        <span className="text-[10px] text-slate-400">成績查詢系統</span>
                     </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-amber-400 transition-colors" />
               </button>
           </div>
           
           <div className="lg:hidden">
              {IdentityPromoCard}
           </div>
<StudyTimer 
              onSaveSession={handleSaveSession} 
              onSaveChallenge={handleSaveChallenge}
              challengeRecords={challengeRecords}
              targetSchool={targetSchool}
              targetMajor={targetMajor}
              tasks={tasks}
              setTasks={setTasks}
              playlists={playlists}
              setPlaylists={setPlaylists}
              activePlaylistId={activePlaylistId}
              setActivePlaylistId={setActivePlaylistId}
              targetExam={targetExam}
           />

           <FocusStats 
              sessions={studySessions} 
              dailyGoal={dailyGoal}
              streak={streak}
              onClick={() => setActivePage('learning')} 
           />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 flex flex-col gap-6 opacity-0 animate-fade-in-up delay-200">
           <div className="hidden lg:block">
              {IdentityPromoCard}
           </div>

           <div className="flex-1 min-h-[300px]">
              <TaskList tasks={tasks} setTasks={setTasks} />
           </div>
           <button
              onClick={() => setIsAnnouncementOpen(true)}
              className="group relative overflow-hidden rounded-[1.5rem] border border-rose-100 bg-white/90 p-4 text-left shadow-lg shadow-rose-100/40 transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-100/70"
           >
              <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-rose-200/35 blur-2xl transition-transform group-hover:scale-125" />
              <div className="relative flex items-start gap-3">
                 <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                    <AlertTriangle className="h-5 w-5" />
                 </div>
                 <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                       <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black tracking-widest text-rose-700">最新公告</span>
                       <span className="text-[11px] font-bold text-slate-400">115.07.08 大考中心新聞稿</span>
                    </div>
                    <h3 className="mt-2 text-sm font-black leading-snug text-slate-850">
                       115 分科測驗因應巴威颱風順延
                    </h3>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                       考試改至 7 月 13 日（一）至 7 月 14 日（二）舉行，日程與查詢時間已同步調整。
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 text-xs font-black text-rose-600">
                       查看詳情
                       <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                 </div>
              </div>
           </button>
            <div className="h-[560px] lg:h-[620px]">
               <ScheduleTable targetExam={targetExam} tvetCategory={tvetCategory} />
            </div>
           <div className="h-[500px]">
              <ImportantDates 
                customDates={customDates}
                setCustomDates={setCustomDates}
                targetExam={targetExam}
              />
           </div>
        </div>

      </main>
      )}

      {/* Footer */}
      <footer className="text-center py-8 text-slate-400 text-xs flex flex-col items-center gap-4 relative z-10 border-t border-slate-200/50 pt-8 opacity-0 animate-fade-in delay-500">
        <div>
          <p className="mb-2">Built for {EXAM_PRESETS.find(p => p.id === targetExam)?.name || 'the class of 116'}. Stay Focused.</p>
          {user && <p className="text-indigo-400 flex items-center justify-center gap-1"><Cloud className="w-3 h-3" /> 資料已加密並同步至雲端</p>}
        </div>

        <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-[11px] font-medium text-slate-500">
           <button onClick={() => setActivePage('instructions')} className="hover:text-slate-800 transition-colors">使用說明</button>
           <button onClick={() => setActivePage('privacy')} className="hover:text-slate-800 transition-colors">隱私權政策</button>
           <button onClick={() => setActivePage('terms')} className="hover:text-slate-800 transition-colors">服務條款</button>
           <a href="mailto:tyctw.analyze@gmail.com" className="hover:text-slate-800 transition-colors">聯絡我們</a>
        </div>
      </footer>

      {/* Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" 
              onClick={() => setIsMenuOpen(false)}
            />
            
            <motion.div 
              initial={{ x: '100%', borderTopLeftRadius: '32px', borderBottomLeftRadius: '32px' }}
              animate={{ x: 0, borderTopLeftRadius: '24px', borderBottomLeftRadius: '24px' }}
              exit={{ x: '100%', borderTopLeftRadius: '32px', borderBottomLeftRadius: '32px' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-[85vw] max-w-[400px] h-full bg-white shadow-2xl flex flex-col overflow-hidden"
              id="app-menu-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="功能選單"
            >
              {/* Decorative top gradient */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-white -z-10" />

              <div className="p-6 md:p-8 pt-8 flex justify-between items-start">
                 <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">探索資源</h2>
                    <p className="text-xs font-bold text-indigo-500/80 uppercase tracking-widest mt-1">Explore Resources</p>
                 </div>
                 <button 
                   onClick={() => setIsMenuOpen(false)}
                   className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-all hover:rotate-90 hover:scale-105"
                   aria-label="關閉功能選單"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 custom-scrollbar space-y-8">
                 
                 {/* Group 1 */}
                 <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.05 }}
                 >
                    <div className="flex items-center gap-2 mb-4">
                       <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                       <h3 className="text-sm font-black text-slate-800 tracking-wide">大考專區</h3>
                    </div>
                    
                    <div className="space-y-3">
                        <a href={currentExamLinks.pastUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-2xl bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                               <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                               <div className="font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">{currentExamLinks.pastTitle}</div>
                               <div className="text-xs text-slate-400 font-medium mt-0.5">歷屆試題與解析</div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                        </a>

                        <button onClick={handleScoreQueryClick} className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all text-left">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                               <Search className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                               <div className="font-bold text-slate-700 group-hover:text-amber-700 transition-colors">{currentExamLinks.scoreTitle}</div>
                               <div className="text-xs text-slate-400 font-medium mt-0.5">成績與落點分析</div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                        </button>

                        <button onClick={() => { setIsExamReminderOpen(true); setIsMenuOpen(false); }} className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-left">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                               <ClipboardCheck className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                               <div className="font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">考前檢查表</div>
                               <div className="text-xs text-slate-400 font-medium mt-0.5">應考物品清單與規定</div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                        </button>
                    </div>
                 </motion.div>

                 {/* Group 2 */}
                 <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.15 }}
                 >
                    <div className="flex items-center gap-2 mb-4">
                       <div className="w-1.5 h-4 bg-slate-300 rounded-full"></div>
                       <h3 className="text-sm font-black text-slate-800 tracking-wide">關聯計畫</h3>
                    </div>
                    
                    <div className="grid gap-2.5">
                       {[
                         { name: '分科測驗倒數', sub: 'AST Exam', url: 'https://uactw.vercel.app/', color: 'indigo', border: 'hover:border-indigo-300' },
                         { name: '統測倒數', sub: 'TVET Exam', url: 'https://teece.vercel.app/', color: 'emerald', border: 'hover:border-emerald-300' },
                         { name: '會考倒數', sub: 'CAP Exam', url: 'https://tyctw.github.io/clock/', color: 'amber', border: 'hover:border-amber-300' },
                         { name: '115 會考倒數', sub: 'Legacy CAP', url: 'https://tyctw.github.io/115clock/', color: 'sky', border: 'hover:border-sky-300' }
                       ].map((link, i) => {
                         const colorMap: Record<string, string> = {
                           indigo: 'hover:bg-indigo-50/80 hover:text-indigo-700 hover:shadow-indigo-100/50',
                           emerald: 'hover:bg-emerald-50/80 hover:text-emerald-700 hover:shadow-emerald-100/50',
                           amber: 'hover:bg-amber-50/80 hover:text-amber-700 hover:shadow-amber-100/50',
                           sky: 'hover:bg-sky-50/80 hover:text-sky-700 hover:shadow-sky-100/50',
                         };
                         return (
                           <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white shadow-sm transition-all group ${colorMap[link.color]} ${link.border}`}>
                              <div className="flex flex-col">
                                 <div className="font-bold text-slate-700 text-sm group-hover:text-inherit transition-colors">{link.name}</div>
                                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{link.sub}</div>
                              </div>
                              <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-inherit opacity-50 group-hover:opacity-100 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                           </a>
                         );
                       })}
                    </div>
                 </motion.div>
                 
                 {/* Footer Links */}
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.25 }}
                   className="pt-6 mt-4 border-t border-slate-100/80 flex gap-3"
                 >
                    <button 
                      onClick={() => { setActivePage('instructions'); setIsMenuOpen(false); }}
                      className="flex-1 py-3 px-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-all border border-transparent hover:border-slate-200"
                    >
                      📖 使用說明
                    </button>
                    <button 
                      onClick={() => { setActivePage('privacy'); setIsMenuOpen(false); }}
                      className="flex-1 py-3 px-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-all border border-transparent hover:border-slate-200"
                    >
                      🛡️ 隱私權
                    </button>
                    <button 
                      onClick={() => { setActivePage('terms'); setIsMenuOpen(false); }}
                      className="flex-1 py-3 px-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-all border border-transparent hover:border-slate-200"
                    >
                      📜 服務條款
                    </button>
                 </motion.div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
                          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 overflow-x-auto no-scrollbar">
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
                                   className={`flex-1 relative py-2.5 px-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap z-10 flex items-center justify-center gap-1.5 ${
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
                                       if (currentPreset && currentPreset.category !== exam.category) {
                                         setPendingExamSwitch(exam);
                                       } else {
                                         setTargetExam(exam.id);
                                         setTargetDateStr(exam.date);
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
                                onChange={(e) => setTargetSchool(e.target.value)} 
                                aria-label="目標學校"
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] py-3.5 pl-12 pr-4 text-slate-800 font-bold text-sm outline-none hover:bg-white hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:shadow-md transition-all" 
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
                                onChange={(e) => setTargetMajor(e.target.value)} 
                                aria-label="目標科系"
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] py-3.5 pl-12 pr-4 text-slate-800 font-bold text-sm outline-none hover:bg-white hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:shadow-md transition-all" 
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
                            onChange={(e) => { if(e.target.value) setTargetDateStr(e.target.value); }} 
                            aria-label="考試日期與時間"
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] py-3.5 pl-12 pr-4 text-slate-800 font-bold text-sm outline-none hover:bg-white hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:shadow-md transition-all appearance-none" 
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
                                onChange={(e) => setDailyGoal(Number(e.target.value))} 
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
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <TempleModal
        isOpen={isTempleOpen}
        onClose={() => setIsTempleOpen(false)}
        incenseCoins={incenseCoins}
        setIncenseCoins={setIncenseCoins}
        incenseRecords={incenseRecords}
        setIncenseRecords={setIncenseRecords}
        templeState={templeState}
        setTempleState={setTempleState}
        userName={user?.name}
        targetSchool={targetSchool}
      />
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => {
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
      
      {/* Achievements Modal */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        data={getCurrentData()}
      />

      <AnimatePresence>
        {isCommunityStudyOpen && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-md"
            onClick={() => setIsCommunityStudyOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="relative w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsCommunityStudyOpen(false)}
                className="absolute -top-3 -right-3 z-10 h-10 w-10 rounded-full bg-white text-slate-500 shadow-lg border border-slate-100 flex items-center justify-center hover:text-rose-600 hover:border-rose-100 transition-colors"
                aria-label="關閉今日共讀彈窗"
              >
                <X className="w-5 h-5" />
              </button>
              <TodayCommunityStudy sessions={studySessions} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Info Modals */}
      <AnnouncementModal isOpen={isAnnouncementOpen} onClose={() => setIsAnnouncementOpen(false)} />
      <ScoreQueryModal 
         isOpen={isScoreWarningOpen} 
         onClose={() => setIsScoreWarningOpen(false)} 
         onConfirm={handleConfirmScoreQuery} 
         examName={currentScoreInfo.label}
         openTime={currentScoreInfo.displayStr}
      />
      <LoginSuggestionModal isOpen={isLoginSuggestionOpen} onClose={handleCloseLoginSuggestion} onLogin={handleSuggestionToAuth} />
      <ExamReminderModal isOpen={isExamReminderOpen} onClose={handleCloseExamReminder} checkedItems={examChecklist} onCheckChange={setExamChecklist} />

      <TvetCategoryModal
        isOpen={isTvetCategoryModalOpen}
        onClose={() => setIsTvetCategoryModalOpen(false)}
        selectedCategory={tvetCategory}
        onSelect={(id) => setTvetCategory(id)}
      />

      <ConfirmExamSwitchModal
        isOpen={pendingExamSwitch !== null}
        onClose={() => setPendingExamSwitch(null)}
        onConfirm={() => {
          if (pendingExamSwitch) {
            setTargetExam(pendingExamSwitch.id);
            setTargetDateStr(pendingExamSwitch.date);
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

      {/* Welcome Animation */}
      {showWelcome && user && (
        <WelcomeSplash 
          userName={user.name} 
          onComplete={handleWelcomeComplete} 
        />
      )}
    </div>
  );
};

export default App;
