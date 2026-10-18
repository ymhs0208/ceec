import MusicListPopupContent from './MusicPlayerPanel';
import './TimerSettings.css';
import './StudyTimerPanel.css';
import './FocusRoom.css';
import FocusBackdrop from './FocusBackdrop';
import './FocusThemeSelector.css';
import ModalLayer from './ModalLayer';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Play, Pause, RotateCcw, Maximize2, Minimize2, 
  Brain, Timer, Watch, FileText, 
  Volume2, VolumeX, SkipForward, SkipBack, Save, Youtube, ChevronDown, ChevronUp,
  ListTodo, Palette, Check, Trophy, Flame, Music2, Plus, Trash2, X, Clock, Target,
  Bell, BellOff, Shuffle, Repeat, Repeat1, History, ArrowLeft, Calendar, ListMusic, MoreVertical, Settings,
  Shield, ShieldAlert
} from 'lucide-react';
import { StudySession, TodoItem, ChallengeRecord, AudioTrack, Playlist } from '../types';
import { readStoredJson, safeLocalStorage } from '../utils/storage';
import { startStudyClock } from '../utils/studyTimer';
import { loadYouTubePlayerApi } from '../services/youtubePlayer';

type TimerMode = 'pomodoro' | 'stopwatch' | 'exam' | 'challenge';
type PlayMode = 'sequential' | 'shuffle' | 'repeat_one';

interface ExamSubject {
  id: string;
  name: string;
  duration: number; // in minutes
}

// Theme Interface
interface FocusTheme {
  id: string;
  name: string;
  bgClass: string; // Background gradient/color
  textClass: string; // Primary text color
  subTextClass: string; // Secondary text color
  accentClass: string; // Progress bar & highlights
  uiBgClass: string; // Glassmorphism background for UI elements
  menuBgClass: string; // Opaque background for menus
  borderClass: string;
  iconColor: string;
  glowColor: string; // For the breathing effect
}

const THEMES: FocusTheme[] = [
  {
    id: 'morning',
    name: '晨光微曦',
    bgClass: 'bg-[#fdfbf7] bg-[radial-gradient(at_0%_0%,_#e0e7ff_0,_transparent_50%),_radial-gradient(at_50%_100%,_#fefce8_0,_transparent_50%)]',
    textClass: 'text-slate-800',
    subTextClass: 'text-slate-500',
    accentClass: 'bg-indigo-600',
    uiBgClass: 'bg-white/40 backdrop-blur-xl',
    menuBgClass: 'bg-white/95',
    borderClass: 'border-white/40',
    iconColor: 'text-indigo-600',
    glowColor: 'bg-indigo-400'
  },
  {
    id: 'midnight',
    name: '深海靜謐',
    bgClass: 'bg-[#0f172a] bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#0f172a_100%)]',
    textClass: 'text-blue-50',
    subTextClass: 'text-slate-400',
    accentClass: 'bg-blue-500',
    uiBgClass: 'bg-slate-900/40 backdrop-blur-xl',
    menuBgClass: 'bg-slate-900/95',
    borderClass: 'border-white/10',
    iconColor: 'text-blue-400',
    glowColor: 'bg-blue-600'
  },
  {
    id: 'forest',
    name: '迷霧森林',
    bgClass: 'bg-[#1a2e22] bg-[radial-gradient(ellipse_at_top_right,_#2d4a3e_0%,_#1a2e22_100%)]',
    textClass: 'text-emerald-50',
    subTextClass: 'text-emerald-400/60',
    accentClass: 'bg-emerald-500',
    uiBgClass: 'bg-emerald-950/30 backdrop-blur-xl',
    menuBgClass: 'bg-[#1a2e22]/95',
    borderClass: 'border-emerald-500/20',
    iconColor: 'text-emerald-400',
    glowColor: 'bg-emerald-500'
  },
  {
    id: 'sunset',
    name: '落日餘暉',
    bgClass: 'bg-[#2a1b15] bg-[conic-gradient(at_top_left,_#431407,_#2a1b15,_#1c1917)]',
    textClass: 'text-orange-50',
    subTextClass: 'text-orange-200/50',
    accentClass: 'bg-orange-500',
    uiBgClass: 'bg-orange-950/30 backdrop-blur-xl',
    menuBgClass: 'bg-[#2a1b15]/95',
    borderClass: 'border-orange-500/20',
    iconColor: 'text-orange-400',
    glowColor: 'bg-orange-600'
  },
  {
    id: 'nebula',
    name: '星雲夢境',
    bgClass: 'bg-[#180d26] bg-[radial-gradient(circle_at_50%_50%,_#3b0764_0%,_#180d26_100%)]',
    textClass: 'text-fuchsia-50',
    subTextClass: 'text-fuchsia-200/50',
    accentClass: 'bg-fuchsia-500',
    uiBgClass: 'bg-fuchsia-950/30 backdrop-blur-xl',
    menuBgClass: 'bg-[#180d26]/95',
    borderClass: 'border-fuchsia-500/20',
    iconColor: 'text-fuchsia-400',
    glowColor: 'bg-fuchsia-600'
  },
  {
    id: 'zen',
    name: '極簡白',
    bgClass: 'bg-[#ffffff]',
    textClass: 'text-slate-900',
    subTextClass: 'text-slate-400',
    accentClass: 'bg-black',
    uiBgClass: 'bg-slate-100/50 backdrop-blur-xl',
    menuBgClass: 'bg-white',
    borderClass: 'border-slate-200',
    iconColor: 'text-slate-900',
    glowColor: 'bg-slate-300'
  },
  {
    id: 'aurora',
    name: '極光漫步 (動態)',
    bgClass: 'bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] animate-gradient bg-[length:200%_200%]',
    textClass: 'text-teal-50',
    subTextClass: 'text-teal-200/50',
    accentClass: 'bg-teal-500',
    uiBgClass: 'bg-teal-950/30 backdrop-blur-xl',
    menuBgClass: 'bg-[#0f172a]/95',
    borderClass: 'border-teal-500/20',
    iconColor: 'text-teal-400',
    glowColor: 'bg-teal-600'
  },
  {
    id: 'ocean',
    name: '深海湧動 (動態)',
    bgClass: 'bg-gradient-to-r from-[#020617] via-[#1e3a8a] to-[#020617] animate-gradient bg-[length:200%_200%]',
    textClass: 'text-cyan-50',
    subTextClass: 'text-cyan-200/50',
    accentClass: 'bg-cyan-500',
    uiBgClass: 'bg-cyan-950/30 backdrop-blur-xl',
    menuBgClass: 'bg-[#020617]/95',
    borderClass: 'border-cyan-500/20',
    iconColor: 'text-cyan-400',
    glowColor: 'bg-cyan-600'
  },
  {
    id: 'cyberpunk',
    name: '霓虹幻境 (動態)',
    bgClass: 'bg-gradient-to-tr from-[#2e1065] via-[#831843] to-[#172554] animate-gradient bg-[length:200%_200%]',
    textClass: 'text-pink-50',
    subTextClass: 'text-pink-200/50',
    accentClass: 'bg-pink-500',
    uiBgClass: 'bg-pink-950/30 backdrop-blur-xl',
    menuBgClass: 'bg-[#2e1065]/95',
    borderClass: 'border-pink-500/20',
    iconColor: 'text-pink-400',
    glowColor: 'bg-pink-600'
  },
  {
    id: 'breeze',
    name: '微風輕拂 (動態)',
    bgClass: 'bg-gradient-to-br from-[#f0fdf4] via-[#dcfce7] to-[#e0f2fe] animate-gradient bg-[length:200%_200%]',
    textClass: 'text-emerald-900',
    subTextClass: 'text-emerald-600',
    accentClass: 'bg-emerald-500',
    uiBgClass: 'bg-white/40 backdrop-blur-xl',
    menuBgClass: 'bg-white/95',
    borderClass: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    glowColor: 'bg-emerald-400'
  },
  {
    id: 'lofi',
    name: 'Lofi 房間 (動態)',
    bgClass: 'bg-gradient-to-bl from-[#2a1b15] via-[#4c1d95] to-[#0f172a] animate-gradient bg-[length:200%_200%]',
    textClass: 'text-purple-50',
    subTextClass: 'text-purple-200/50',
    accentClass: 'bg-purple-500',
    uiBgClass: 'bg-purple-950/30 backdrop-blur-xl',
    menuBgClass: 'bg-[#2a1b15]/95',
    borderClass: 'border-purple-500/20',
    iconColor: 'text-purple-400',
    glowColor: 'bg-purple-600'
  },
  {
    id: 'starry',
    name: '星空流轉 (動態)',
    bgClass: 'bg-gradient-to-t from-[#0f2027] via-[#203a43] to-[#2c5364] animate-gradient bg-[length:200%_200%]',
    textClass: 'text-blue-50',
    subTextClass: 'text-blue-200/50',
    accentClass: 'bg-blue-400',
    uiBgClass: 'bg-slate-900/40 backdrop-blur-xl',
    menuBgClass: 'bg-[#0f2027]/95',
    borderClass: 'border-blue-500/20',
    iconColor: 'text-blue-300',
    glowColor: 'bg-blue-500'
  }
];

interface StudyTimerProps {
  onSaveSession?: (session: Omit<StudySession, 'id'>) => void;
  onSaveChallenge?: (record: Omit<ChallengeRecord, 'id'>) => void;
  challengeRecords?: ChallengeRecord[];
  targetSchool?: string;
  targetMajor?: string;
  tasks?: TodoItem[];
  setTasks?: React.Dispatch<React.SetStateAction<TodoItem[]>>;
  playlists?: Playlist[];
  setPlaylists?: React.Dispatch<React.SetStateAction<Playlist[]>>;
  onDeleteTrack?: (playlistId: string, trackId: string) => void;
  onDeletePlaylist?: (playlistId: string) => void;
  activePlaylistId?: string;
  setActivePlaylistId?: React.Dispatch<React.SetStateAction<string>>;
  targetExam?: string;
}

const EXAM_SUBJECTS_MAP: Record<string, ExamSubject[]> = {
  '116gsat': [
    { id: 'math_a', name: '數學 A', duration: 100 },
    { id: 'math_b', name: '數學 B', duration: 100 },
    { id: 'english', name: '英文', duration: 100 },
    { id: 'social', name: '社會', duration: 110 },
    { id: 'natural', name: '自然', duration: 110 },
    { id: 'chinese1', name: '國綜', duration: 90 },
    { id: 'chinese2', name: '國寫', duration: 90 },
    { id: 'self_study', name: '自主複習', duration: 0 },
  ],
  '115tvet': [
    { id: 'major2', name: '專業科目(二)', duration: 100 },
    { id: 'chinese', name: '國文', duration: 100 },
    { id: 'english', name: '英文', duration: 100 },
    { id: 'math', name: '數學', duration: 80 },
    { id: 'major1', name: '專業科目(一)', duration: 100 },
    { id: 'self_study', name: '自主複習', duration: 0 },
  ],
  '117cap': [
    { id: 'social', name: '社會', duration: 70 },
    { id: 'math', name: '數學', duration: 80 },
    { id: 'chinese', name: '國文', duration: 70 },
    { id: 'writing', name: '寫作測驗', duration: 50 },
    { id: 'natural', name: '自然', duration: 70 },
    { id: 'english_read', name: '英語 (閱讀)', duration: 60 },
    { id: 'english_listen', name: '英語 (聽力)', duration: 25 },
    { id: 'self_study', name: '自主複習', duration: 0 },
  ],
  '115ast': [
    { id: 'physics', name: '物理', duration: 80 },
    { id: 'chemistry', name: '化學', duration: 80 },
    { id: 'math_a', name: '數學甲', duration: 80 },
    { id: 'biology', name: '生物', duration: 80 },
    { id: 'history', name: '歷史', duration: 80 },
    { id: 'geography', name: '地理', duration: 80 },
    { id: 'math_b', name: '數學乙', duration: 80 },
    { id: 'civics', name: '公民與社會', duration: 80 },
    { id: 'self_study', name: '自主複習', duration: 0 },
  ],
};

// 116 會考沿用會考科目清單；時段仍以當年度簡章確認。
EXAM_SUBJECTS_MAP['116cap'] = EXAM_SUBJECTS_MAP['117cap'];

const CHALLENGE_DURATIONS = [
  { label: '10 分鐘', value: 10 * 60 },
  { label: '20 分鐘', value: 20 * 60 },
  { label: '30 分鐘', value: 30 * 60 },
  { label: '45 分鐘', value: 45 * 60 },
  { label: '60 分鐘', value: 60 * 60 },
  { label: '80 分鐘', value: 80 * 60 },

];

const StudyTimer: React.FC<StudyTimerProps> = ({ 
  onSaveSession, 
  onSaveChallenge, 
  challengeRecords = [], 
  targetSchool, 
  targetMajor, 
  tasks = [],
  setTasks,
  playlists = [],
  setPlaylists,
  onDeleteTrack,
  onDeletePlaylist,
  activePlaylistId = 'default',
  setActivePlaylistId,
  targetExam = '116gsat'
}) => {
  const currentExamSubjects = EXAM_SUBJECTS_MAP[targetExam] || EXAM_SUBJECTS_MAP['116gsat'];

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'break'>('focus');
  const [selectedSubject, setSelectedSubject] = useState<string>(currentExamSubjects[0].id);
  const [initialDuration, setInitialDuration] = useState(25 * 60); 
  const stopwatchSaveLockRef = useRef(false);

  // Effect to reset selected subject if targetExam changes
  useEffect(() => {
    setSelectedSubject(EXAM_SUBJECTS_MAP[targetExam]?.[0]?.id || EXAM_SUBJECTS_MAP['116gsat'][0].id);
  }, [targetExam]);

  // Challenge Mode State
  const [challengeScore, setChallengeScore] = useState(0);
  const [prevTaskCompletedCount, setPrevTaskCompletedCount] = useState(0);
  const [challengeDuration, setChallengeDuration] = useState(10 * 60);
  const [showChallengeHistory, setShowChallengeHistory] = useState(false);

  // Sound Settings
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('gsat_sound_enabled');
    return saved !== null ? readStoredJson<boolean>('gsat_sound_enabled', true) : true;
  });

  // Strict Mode State
  const [isStrictMode, setIsStrictMode] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('gsat_strict_mode');
    return saved !== null ? readStoredJson<boolean>('gsat_strict_mode', false) : false;
  });
  const [showViolation, setShowViolation] = useState(false);
  const [strictModeWarnings, setStrictModeWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Music State
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [hasRequestedMusic, setHasRequestedMusic] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [customTrackName, setCustomTrackName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTargetPlaylistId, setCustomTargetPlaylistId] = useState(activePlaylistId);
  const [isAddingMusic, setIsAddingMusic] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>('sequential');
  const [trackCurrentTime, setTrackCurrentTime] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  
  // Theme State
  const [activeThemeId, setActiveThemeId] = useState<string>(() => safeLocalStorage.getItem('gsat_focus_theme') || 'morning');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [showSettingsSelector, setShowSettingsSelector] = useState(false);
  const [showSubjectSelector, setShowSubjectSelector] = useState(false);
  
  // Real-time Clock State
  const [now, setNow] = useState(new Date());

  const activeTheme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];
  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || playlists[0] || { id: 'default', name: 'Default', tracks: [] };
  const musicTracks = activePlaylist.tracks || [];

  const playerRef = useRef<any>(null);
  const musicSeekingRef = useRef(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  // Refs for Access inside Event Listeners
  const playModeRef = useRef(playMode);
  const musicTracksRef = useRef(musicTracks);
  const currentTrackIndexRef = useRef(currentTrackIndex);

  useEffect(() => { playModeRef.current = playMode; }, [playMode]);
  useEffect(() => { musicTracksRef.current = musicTracks; }, [musicTracks]);
  useEffect(() => { currentTrackIndexRef.current = currentTrackIndex; }, [currentTrackIndex]);

  // Reset track index if playlist changes and index is out of bounds
  useEffect(() => {
      if (currentTrackIndex >= musicTracks.length && musicTracks.length > 0) {
          setCurrentTrackIndex(0);
      }
  }, [activePlaylistId, musicTracks.length]);

  const completedTasksCount = tasks.filter(t => t.completed).length;

  useEffect(() => {
    safeLocalStorage.setItem('gsat_sound_enabled', JSON.stringify(isSoundEnabled));
  }, [isSoundEnabled]);

  useEffect(() => {
    safeLocalStorage.setItem('gsat_strict_mode', JSON.stringify(isStrictMode));
    if (!isStrictMode) {
      setStrictModeWarnings(0);
    }
  }, [isStrictMode]);

  // Strict Mode Visibility Listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive && isStrictMode && (mode !== 'pomodoro' || sessionType === 'focus')) {
        if (strictModeWarnings < 2) {
          setStrictModeWarnings(prev => prev + 1);
          setShowWarningModal(true);
        } else {
          setIsActive(false);
          setShowViolation(true);
          if (isPlayingMusic) {
            setIsPlayingMusic(false);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, isStrictMode, sessionType, mode, isPlayingMusic, strictModeWarnings]);

  useEffect(() => {
    if (isActive && mode === 'challenge') {
      if (completedTasksCount > prevTaskCompletedCount) {
        setChallengeScore(prev => prev + (completedTasksCount - prevTaskCompletedCount));
        if (isSoundEnabled) {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3').play().catch(() => {});
        }
      }
    }
    setPrevTaskCompletedCount(completedTasksCount);
  }, [completedTasksCount, isActive, mode, isSoundEnabled]);

  const toggleTask = (id: string) => {
    if (setTasks && tasks) {
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t));
    }
  };

  const handleTrackEnd = () => {
    const mode = playModeRef.current;
    const tracks = musicTracksRef.current;
    const currentIndex = currentTrackIndexRef.current;

    if (tracks.length === 0) return;

    if (mode === 'repeat_one') {
        if (playerRef.current) {
            playerRef.current.seekTo(0);
            playerRef.current.playVideo();
        }
    } else if (mode === 'shuffle') {
        let nextIndex = Math.floor(Math.random() * tracks.length);
        if (tracks.length > 1) {
            while (nextIndex === currentIndex) {
                nextIndex = Math.floor(Math.random() * tracks.length);
            }
        }
        setCurrentTrackIndex(nextIndex);
    } else {
        // Sequential
        setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    }
  };

  // Initialize only after the user chooses playback, not on every homepage visit.
  useEffect(() => {
    if (!hasRequestedMusic) return;
    let cancelled = false;
    
    const onPlayerStateChange = (event: any) => {
        // YT.PlayerState.ENDED is 0
        if (event.data === 0) {
            handleTrackEnd();
        }
    };

    const initPlayer = (api: any) => {
      if (cancelled || playerRef.current) return;
      // Just load a dummy video or first track to init
      const trackId = musicTracks[0]?.youtubeId || 'jfKfPfyJRdk';

      playerRef.current = new api.Player('youtube-audio-player', {
        height: '0',
        width: '0',
        videoId: trackId,
        playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'fs': 0 },
        events: {
          'onReady': (event: any) => {
            if (cancelled) return;
            setIsPlayerReady(true);
            event.target.setVolume(volume * 100);
          },
          'onStateChange': onPlayerStateChange,
        }
      });
    };
    void loadYouTubePlayerApi().then(initPlayer).catch(error => {
      if (cancelled) return;
      console.error('Music player initialization failed', error);
      setIsPlayingMusic(false);
      setHasRequestedMusic(false);
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [hasRequestedMusic]);

  useEffect(() => {
    safeLocalStorage.setItem('gsat_focus_theme', activeThemeId);
  }, [activeThemeId]);

  // Load track when index changes or playlist changes
  useEffect(() => {
    if (isPlayerReady && playerRef.current) {
      const track = musicTracks[currentTrackIndex];
      if (track) {
        musicSeekingRef.current = false;
        setTrackCurrentTime(0);
        setTrackDuration(0);
        try {
           playerRef.current.loadVideoById({ videoId: track.youtubeId });
           if (!isPlayingMusic) playerRef.current.pauseVideo();
        } catch(e) { console.error(e); }
      }
    }
  }, [currentTrackIndex, activePlaylistId, isPlayerReady]); // Added activePlaylistId dependency

  useEffect(() => {
    if (isPlayerReady && playerRef.current) {
      isPlayingMusic ? playerRef.current.playVideo() : playerRef.current.pauseVideo();
    }
  }, [isPlayingMusic, isPlayerReady]);

  useEffect(() => {
    if (isPlayerReady && playerRef.current) playerRef.current.setVolume(volume * 100);
  }, [volume, isPlayerReady]);

  useEffect(() => {
    let interval: any;
    if (isPlayingMusic && isPlayerReady && playerRef.current) {
      interval = setInterval(() => {
        try {
          if (!musicSeekingRef.current && playerRef.current.getCurrentTime) {
            setTrackCurrentTime(playerRef.current.getCurrentTime() || 0);
          }
          if (playerRef.current.getDuration) {
            setTrackDuration(playerRef.current.getDuration() || 0);
          }
        } catch (e) {}
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayingMusic, isPlayerReady]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFocusMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (isFocusMode) {
       setNow(new Date());
       const interval = setInterval(() => setNow(new Date()), 1000);
       return () => clearInterval(interval);
    }
  }, [isFocusMode]);

  const formatClock = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddCustomMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setPlaylists || !customVideoUrl.trim()) return;

    const id = getYouTubeId(customVideoUrl);
    if (id) {
        setIsAddingMusic(true);
        let fetchedName = '';
        try {
            const response = await fetch(`https://noembed.com/embed?dataType=json&url=https://www.youtube.com/watch?v=${id}`);
            const data = await response.json();
            if (data && data.title) {
                fetchedName = data.title;
            }
        } catch (error) {
            console.error("Failed to fetch video title:", error);
        }

        const targetPlaylist = playlists.find((playlist) => playlist.id === customTargetPlaylistId) || activePlaylist;
        const name = customTrackName.trim() || fetchedName || `自訂音樂 ${(targetPlaylist.tracks?.length || 0) + 1}`;
        const newTrack: AudioTrack = {
            id: `custom-${Date.now()}`,
            name: name,
            youtubeId: id,
            updatedAt: Date.now(),
        };
        
        // Add to the playlist selected in the dialog, not necessarily the one being played.
        setPlaylists(prev => prev.map(p => {
            if (p.id === targetPlaylist.id) {
                return { ...p, tracks: [...p.tracks, newTrack], updatedAt: Date.now() };
            }
            return p;
        }));

        // Only switch playback when the song was added to the currently open playlist.
        if (targetPlaylist.id === activePlaylistId) {
            setHasRequestedMusic(true);
            setCurrentTrackIndex(musicTracks.length); // length before add is index of new
            setIsPlayingMusic(true);
        }
        setCustomVideoUrl('');
        setCustomTrackName('');
        setShowCustomInput(false);
        setIsAddingMusic(false);
    } else {
        alert('請輸入有效的 YouTube 影片網址');
    }
  };

  const handleRemoveTrack = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (!setPlaylists) return;

    if (musicTracks.length <= 1) {
       alert("請至少保留一首音樂");
       return;
    }

    const removedTrack = musicTracks[index];
    if (removedTrack) onDeleteTrack?.(activePlaylistId, removedTrack.id);
    
    // Logic to calculate new index after removal
    let newIndex = currentTrackIndex;
    if (index < currentTrackIndex) {
        newIndex = currentTrackIndex - 1;
    } else if (index === currentTrackIndex) {
        newIndex = 0; 
    }

    setPlaylists(prev => prev.map(p => {
        if (p.id === activePlaylistId) {
            return { ...p, tracks: p.tracks.filter((_, i) => i !== index), updatedAt: Date.now() };
        }
        return p;
    }));
    
    setCurrentTrackIndex(newIndex);
  };

  // Playlist Management Handlers
  const handleAddPlaylist = (name: string) => {
      if (!setPlaylists || !setActivePlaylistId) return;
      const newPlaylist: Playlist = {
          id: `list-${Date.now()}`,
          name: name,
          tracks: [], // Empty initially
          updatedAt: Date.now(),
      };
      setPlaylists(prev => [...prev, newPlaylist]);
      setActivePlaylistId(newPlaylist.id);
  };

  const handleDeletePlaylist = (id: string) => {
      if (!setPlaylists || !setActivePlaylistId) return;
      onDeletePlaylist?.(id);
      setPlaylists(prev => {
          const filtered = prev.filter(p => p.id !== id);
          if (activePlaylistId === id) {
              setActivePlaylistId(filtered[0]?.id || 'default');
          }
          return filtered;
      });
  };

  const completeSession = (durationSecs: number, completedAt = Date.now()) => {
    setStrictModeWarnings(0);
    // 1. Handle Challenge Record Saving
    if (mode === 'challenge') {
      const currentHighScore = getHighScore(selectedSubject, challengeDuration);
      
      // Save Challenge Record (Always, for history)
      if (onSaveChallenge) {
        onSaveChallenge({
          subjectId: selectedSubject,
          duration: challengeDuration,
          tasksCompleted: challengeScore,
          timestamp: completedAt
        });
      }

      if (challengeScore > currentHighScore) {
        alert(`恭喜！打破紀錄！\n科目：${currentExamSubjects.find(s=>s.id === selectedSubject)?.name}\n完成任務：${challengeScore}`);
      } else {
        alert(`挑戰結束！\n本次完成任務：${challengeScore}`);
      }
      // Proceed to save as study session for time tracking as well
    }

    if (sessionType === 'break' && mode === 'pomodoro') return;
    if (durationSecs < 60) return;
    
    const subject = currentExamSubjects.find(s => s.id === selectedSubject) || currentExamSubjects[currentExamSubjects.length - 1];
    
    if (onSaveSession) {
      onSaveSession({
        subjectId: subject.id,
        subjectName: subject.name,
        durationMinutes: Math.floor(durationSecs / 60),
        timestamp: completedAt
      });
    }
  };

  // Completion must use the latest subject and challenge score. Keep writes
  // outside React state updaters, which StrictMode may invoke more than once.
  const timerCompletionRef = useRef({ completeSession, initialDuration, isSoundEnabled });
  timerCompletionRef.current = { completeSession, initialDuration, isSoundEnabled };
  useEffect(() => {
    if (!isActive) return;
    const clock = startStudyClock({
      initialSeconds: timeLeft,
      countUp: mode === 'stopwatch',
      onTick: setTimeLeft,
      onComplete: completedAt => {
        setIsActive(false);
        const latest = timerCompletionRef.current;
        if (latest.isSoundEnabled) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        }
        latest.completeSession(latest.initialDuration, completedAt);
      },
    });
    document.addEventListener('visibilitychange', clock.update);
    window.addEventListener('focus', clock.update);
    return () => {
      clock.stop();
      document.removeEventListener('visibilitychange', clock.update);
      window.removeEventListener('focus', clock.update);
    };
  }, [isActive, mode]);

  const toggleTimer = () => {
    if (!isActive && mode === 'stopwatch') stopwatchSaveLockRef.current = false;
    if (!isActive && mode === 'challenge' && (timeLeft === initialDuration || timeLeft <= 0)) {
      setChallengeScore(0);
      setPrevTaskCompletedCount(completedTasksCount);
    }
    
    if (!isActive && timeLeft <= 0 && mode !== 'stopwatch') {
      setTimeLeft(initialDuration);
      setStrictModeWarnings(0);
    }
    
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setStrictModeWarnings(0);
    if (mode === 'stopwatch') setTimeLeft(0);
    else if (mode === 'exam') {
      const subject = currentExamSubjects.find(s => s.id === selectedSubject);
      const duration = subject && subject.duration > 0 ? subject.duration * 60 : 100 * 60;
      setTimeLeft(duration); setInitialDuration(duration);
    } else if (mode === 'challenge') {
      setTimeLeft(challengeDuration); setInitialDuration(challengeDuration);
      setChallengeScore(0);
    } else {
      setTimeLeft(sessionType === 'focus' ? 25 * 60 : 5 * 60);
      setInitialDuration(sessionType === 'focus' ? 25 * 60 : 5 * 60);
    }
  };
  
  const handleStopwatchSave = () => {
    if (stopwatchSaveLockRef.current) return;
    // React updates are asynchronous; two clicks in the same render share this lock.
    stopwatchSaveLockRef.current = true;
    setIsActive(false); completeSession(timeLeft); setTimeLeft(0);
  };
  
  const handleModeChange = (newMode: TimerMode) => {
    setIsActive(false); setMode(newMode); setShowChallengeHistory(false); setStrictModeWarnings(0);
    if (newMode === 'stopwatch') { 
      setTimeLeft(0); setInitialDuration(0); 
    } else if (newMode === 'exam') {
      const subject = currentExamSubjects.find(s => s.id === selectedSubject);
      const duration = subject && subject.duration > 0 ? subject.duration * 60 : 100 * 60;
      setTimeLeft(duration); setInitialDuration(duration);
    } else if (newMode === 'challenge') {
      setTimeLeft(challengeDuration); setInitialDuration(challengeDuration);
      setChallengeScore(0);
    } else {
      setSessionType('focus'); setTimeLeft(25 * 60); setInitialDuration(25 * 60);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    if (mode === 'exam') {
      setIsActive(false);
      const subject = currentExamSubjects.find(s => s.id === subjectId);
      if (subject && subject.duration > 0) { setTimeLeft(subject.duration * 60); setInitialDuration(subject.duration * 60); }
    }
  };

  const handleChallengeDurationChange = (seconds: number) => {
    setChallengeDuration(seconds);
    setTimeLeft(seconds);
    setInitialDuration(seconds);
    setIsActive(false);
    setChallengeScore(0);
  };

  const getHighScore = (subjectId: string, duration: number) => {
    const records = challengeRecords.filter(r => r.subjectId === subjectId && r.duration === duration);
    if (records.length === 0) return 0;
    return Math.max(...records.map(r => r.tasksCompleted));
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFocusMode = async () => {
    if (!isFocusMode) {
      setIsFocusMode(true);
      try {
        await document.documentElement.requestFullscreen();
      } catch (e) {
        console.error("Fullscreen denied", e);
      }
    } else {
      setIsFocusMode(false);
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    if (!isFocusMode) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement && !document.querySelector('dialog[open]')) setIsFocusMode(false);
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', escape);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [isFocusMode]);

  const toggleMusic = () => {
    setHasRequestedMusic(true);
    setIsPlayingMusic(playing => !playing);
  };

  const seekMusic = (seconds: number) => {
    if (!isPlayerReady || !playerRef.current?.seekTo || !Number.isFinite(seconds) || !Number.isFinite(trackDuration) || trackDuration <= 0) return;
    const position = Math.min(trackDuration, Math.max(0, seconds));
    playerRef.current.seekTo(position, true);
    setTrackCurrentTime(position);
  };
  
  const nextTrack = () => {
      // Manual Next Logic
      if (playMode === 'shuffle') {
          let nextIndex = Math.floor(Math.random() * musicTracks.length);
          if (musicTracks.length > 1) {
              while (nextIndex === currentTrackIndex) nextIndex = Math.floor(Math.random() * musicTracks.length);
          }
          setCurrentTrackIndex(nextIndex);
      } else {
          // Both Sequential and Repeat One (when manually clicked) go to next
          setCurrentTrackIndex((prev) => (prev + 1) % musicTracks.length);
      }
  };

  const prevTrack = () => {
      if (playMode === 'shuffle') {
          let nextIndex = Math.floor(Math.random() * musicTracks.length);
          if (musicTracks.length > 1) {
              while (nextIndex === currentTrackIndex) nextIndex = Math.floor(Math.random() * musicTracks.length);
          }
          setCurrentTrackIndex(nextIndex);
      } else {
          setCurrentTrackIndex((prev) => (prev - 1 + musicTracks.length) % musicTracks.length);
      }
  };

  const togglePlayMode = () => {
      if (playMode === 'sequential') setPlayMode('shuffle');
      else if (playMode === 'shuffle') setPlayMode('repeat_one');
      else setPlayMode('sequential');
  };
  
  const pendingTasks = tasks.filter(t => !t.completed).slice(0, 3);

  const timeString = formatTime(timeLeft);
  const isLongTime = timeString.length > 5;
  const sortedChallengeRecords = [...challengeRecords].sort((a, b) => b.timestamp - a.timestamp);

  const musicMenuProps = {
     showCustomInput, setShowCustomInput,
     customVideoUrl, setCustomVideoUrl,
     customTrackName, setCustomTrackName,
     customTargetPlaylistId, setCustomTargetPlaylistId,
     handleAddCustomMusic, isAddingMusic,
     currentPlaylist: activePlaylist,
     currentTrackIndex, setCurrentTrackIndex,
     isPlayingMusic, toggleMusic,
     handleRemoveTrack,
     playMode, togglePlayMode, nextTrack, prevTrack,
     closeMenu: () => setShowMusicSelector(false),
     volume, setVolume,
     playlists, activePlaylistId, 
     onChangePlaylist: (id: string) => setActivePlaylistId && setActivePlaylistId(id),
     onAddPlaylist: handleAddPlaylist,
     onDeletePlaylist: handleDeletePlaylist
  };

  const ModeButton = ({ id, label, icon: Icon }: { id: TimerMode, label: string, icon: any }) => {
    const selected = mode === id;

    return (
      <button
        onClick={() => handleModeChange(id)}
        aria-pressed={selected}
        className={`relative flex min-h-10 items-center justify-center gap-1 rounded-[14px] px-1.5 py-2 text-[11px] font-bold transition-all duration-300 z-10 sm:gap-2 sm:px-4 sm:text-xs md:text-sm ${
          selected
            ? 'text-indigo-600'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
        }`}
      >
        <div
          className={`absolute inset-0 rounded-[14px] border shadow-sm shadow-indigo-100/50 -z-10 transition-opacity duration-200 ${
            selected
              ? 'opacity-100 bg-indigo-50 border-indigo-100'
              : 'opacity-0 bg-transparent border-transparent'
          }`}
        />
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4 ${selected ? 'text-indigo-600' : 'text-slate-400'}`} />
        <span className="leading-none">{label}</span>
      </button>
    );
  };

  const renderMusicPlayerWidget = (isFocusModeView: boolean) => {
    const currentTrack = musicTracks[currentTrackIndex];
    const isDark = isFocusModeView && !['morning', 'zen', 'breeze', 'lofi'].includes(activeTheme.id);
    return (
      <div className="study-music-widget w-full flex justify-center px-3 pb-6 z-30 relative mt-auto">
        <div className={`focus-music-mini ${isDark ? 'focus-music-mini--dark' : ''}`}>
          <button className="focus-music-mini-open" onClick={() => setShowMusicSelector(true)} aria-label="開啟專注音樂播放器">
            <span className="focus-music-mini-cover"><Music2 size={21} aria-hidden="true" />{currentTrack?.youtubeId && <img key={currentTrack.youtubeId} src={`https://img.youtube.com/vi/${currentTrack.youtubeId}/mqdefault.jpg`} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = 'none'; }} />}</span>
            <span className="focus-music-mini-copy"><small><span className={isPlayingMusic ? 'is-playing' : ''} />{isPlayingMusic ? '正在播放' : '專注音樂'}</small><strong>{currentTrack?.name || '選一首音樂，陪你專注'}</strong><span>{activePlaylist.name} · 查看歌單</span></span>
          </button>
          <div className="focus-music-mini-controls"><button className="focus-music-mini-play" onClick={toggleMusic} aria-label={isPlayingMusic ? '暫停音樂' : '播放音樂'} disabled={!currentTrack}>{isPlayingMusic ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><button className="focus-music-mini-next" onClick={nextTrack} aria-label="下一首" disabled={!currentTrack}><SkipForward size={16} fill="currentColor" /></button></div>
          {Number.isFinite(trackDuration) && trackDuration > 0 && <input className="focus-music-mini-progress" type="range" min={0} max={trackDuration} step={1} value={Math.min(trackDuration, Math.max(0, trackCurrentTime))} aria-label="歌曲播放進度" aria-valuetext={`${formatTime(trackCurrentTime)}／${formatTime(trackDuration)}`} onChange={event => seekMusic(Number(event.target.value))} onPointerDown={() => { musicSeekingRef.current = true; }} onPointerUp={() => { musicSeekingRef.current = false; }} onPointerCancel={() => { musicSeekingRef.current = false; }} onBlur={() => { musicSeekingRef.current = false; }} style={{ '--music-progress': `${Math.min(100, Math.max(0, trackCurrentTime / trackDuration * 100))}%` } as React.CSSProperties} />}
        </div>
      </div>
    );
  };

  return (
    <>
      <div id="youtube-audio-player" className="fixed top-0 left-0 w-0 h-0 overflow-hidden opacity-0 pointer-events-none z-[-1]" />
      
      {isFocusMode ? (
        createPortal(
          <div className={`focus-room focus-atmosphere focus-atmosphere--${activeTheme.id}`} data-tone={['morning', 'zen', 'breeze'].includes(activeTheme.id) ? 'light' : 'dark'} data-running={isActive} role="dialog" aria-modal="true" aria-label="全螢幕專注模式">
            <FocusBackdrop themeId={activeTheme.id} animated={activeTheme.name.includes('(動態)')} />
            <div className="focus-room-wash" aria-hidden="true" />
            <header className="focus-room-header">
              <div className="focus-room-brand"><span className="focus-room-brand-icon"><Brain size={19} strokeWidth={1.4} /></span><div><strong>留一段時間，給專心的自己。</strong><span>FOCUS SPACE <i />{mode === 'stopwatch' ? '正數計時' : mode === 'exam' ? '模擬考' : mode === 'challenge' ? '專注挑戰' : sessionType === 'break' ? '休息時間' : '專注倒數'}</span></div></div>
              <div className="focus-room-header-right"><time className="focus-room-clock"><Clock size={12} aria-hidden="true" />{formatClock(now)}</time><button type="button" onClick={toggleFocusMode} className="focus-room-exit" aria-label="退出全螢幕專注" title="退出全螢幕"><Minimize2 size={16} /><span>退出專注</span></button></div>
            </header>

            <main className="focus-room-main">
              <button type="button" className="focus-room-subject" onClick={() => setShowSettingsSelector(true)} aria-label="選擇專注科目與時間"><span /><strong>{currentExamSubjects.find(subject => subject.id === selectedSubject)?.name || '自主複習'}</strong><ChevronDown size={13} /></button>
              <p className="focus-room-state">{isActive ? '專注正在累積' : '準備好了，就從現在開始'}{mode === 'challenge' && <span>已完成 {challengeScore} 件任務</span>}</p>
              <div className="focus-room-digits" data-long={isLongTime} role="timer" aria-label={mode === 'stopwatch' ? '已專注時間' : '剩餘時間'} aria-live="off">{timeString}</div>
              {mode !== 'stopwatch' && <div className="focus-room-progress" role="progressbar" aria-label="本次專注進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, Math.max(0, initialDuration > 0 ? (initialDuration - timeLeft) / initialDuration * 100 : 0)))}><span style={{ width: `${Math.min(100, Math.max(0, initialDuration > 0 ? (initialDuration - timeLeft) / initialDuration * 100 : 0))}%` }} /></div>}
              <div className="focus-room-intention">
                {mode === 'challenge' ? <div className="focus-room-challenge"><div className="focus-room-challenge-label"><span><ListTodo size={12} />把待辦，變成一步步的完成</span><small>最佳 {getHighScore(selectedSubject, challengeDuration)} 件</small></div>{pendingTasks.length ? pendingTasks.slice(0, 3).map(task => <button key={task.id} type="button" onClick={() => toggleTask(task.id)} aria-label={`完成挑戰任務：${task.text}`}><span className="focus-room-task-check"><Check size={12} /></span><span>{task.text}</span></button>) : <p className="focus-room-task-empty">{tasks.length ? '今天的任務都完成了，做得很好。' : '先在待辦清單安排任務，再開始挑戰。'}</p>}</div>
                  : pendingTasks.length && mode !== 'stopwatch' ? <div className="focus-room-next-task"><ListTodo size={14} aria-hidden="true" /><div><small>這段時間，先完成</small><span>{pendingTasks[0].text}</span></div></div>
                  : <p className="focus-room-quiet-note">{sessionType === 'break' && mode === 'pomodoro' ? '放鬆肩膀，讓思緒休息一下。' : '不用急，每一分鐘都在靠近更好的自己。'}</p>}
              </div>
            </main>

            <footer className="focus-room-footer">
              {renderMusicPlayerWidget(true)}
              <div className="focus-room-controls">
                <button type="button" onClick={mode === 'stopwatch' ? handleStopwatchSave : resetTimer} className="focus-room-tool" aria-label={mode === 'stopwatch' && timeLeft >= 60 ? '儲存專注紀錄' : '重設計時器'} title={mode === 'stopwatch' && timeLeft >= 60 ? '儲存專注紀錄' : '重設計時器'}>{mode === 'stopwatch' && timeLeft >= 60 ? <Save size={18} /> : <RotateCcw size={18} />}</button>
                <button type="button" onClick={toggleTimer} className="focus-room-start" aria-label={isActive ? '暫停專注' : '開始專注'}>{isActive ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}<span>{isActive ? '暫停一下' : '開始專注'}</span></button>
                <button type="button" onClick={() => setIsSoundEnabled(value => !value)} className="focus-room-tool" aria-label={isSoundEnabled ? '關閉提示音效' : '開啟提示音效'} aria-pressed={isSoundEnabled} title="提示音效">{isSoundEnabled ? <Bell size={18} /> : <BellOff size={18} />}</button>
              </div>
              <nav className="focus-room-tools" aria-label="專注環境設定"><button type="button" onClick={() => { setShowSettingsSelector(true); setShowThemeSelector(false); setShowMusicSelector(false); }}><Settings size={14} />計時設定</button><span /><button type="button" onClick={() => { setShowMusicSelector(true); setShowThemeSelector(false); }}><Music2 size={14} />專注音樂</button><span /><button type="button" onClick={() => { setShowThemeSelector(true); setShowMusicSelector(false); }}><Palette size={14} />更換風景</button></nav>
              <p className="focus-room-exit-hint">按 Esc 可離開專注畫面</p>
            </footer>
          </div>,
          document.body
        )
      ) : (
        <div className="study-timer-panel focus-workbench w-full relative group min-h-[450px]" data-mode={mode} data-running={isActive}>
          {/* Background Layer (Clipped for aesthetics) */}
          <div className="study-timer-background absolute inset-0 glass-card rounded-[2rem] overflow-hidden bg-white/60 z-0">
             <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[60px] transition-colors duration-1000 pointer-events-none ${isActive ? (mode === 'challenge' ? 'bg-orange-100' : sessionType === 'break' ? 'bg-emerald-100' : 'bg-indigo-100') : 'bg-transparent'}`}></div>
          </div>

          {/* Content Layer (Not Clipped to allow dropdowns) */}
          <div className="focus-workbench-content relative z-10 flex flex-col h-full min-h-[450px]">
             <header className="focus-workbench-heading"><span><Brain size={13} aria-hidden="true" /> FOCUS SPACE</span><button type="button" onClick={toggleFocusMode} title="全螢幕" aria-label="進入全螢幕專注"><Maximize2 size={15} /></button></header>
             <div className="study-timer-tabs" role="group" aria-label="專注計時模式">
               <ModeButton id="pomodoro" label="倒數" icon={Timer} />
               <ModeButton id="stopwatch" label="正數" icon={Watch} />
               <ModeButton id="exam" label="模擬考" icon={FileText} />
               <ModeButton id="challenge" label="挑戰" icon={Trophy} />
             </div>
             <div className="focus-subject-strip"><button type="button" onClick={() => setShowSettingsSelector(true)} aria-label="選擇專注科目與時間"><span className="focus-subject-dot" /><span>{currentExamSubjects.find(subject => subject.id === selectedSubject)?.name || '自主複習'}</span><ChevronDown size={12} /></button><span>{mode === 'stopwatch' ? '累積你的每一分鐘' : mode === 'challenge' ? '把待辦，變成挑戰' : mode === 'exam' ? '練習考場的節奏' : sessionType === 'break' ? '休息一下，再出發' : '給自己一段不被打擾的時間'}</span></div>

             <div className="focus-timer-body flex-grow flex flex-col items-center justify-center relative p-4">
                {mode === 'challenge' && showChallengeHistory ? (
                   <div className="w-full h-full flex flex-col animate-fade-in absolute inset-0 p-6 z-20">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                         <button 
                           onClick={() => setShowChallengeHistory(false)}
                           className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                         >
                            <ArrowLeft className="w-3.5 h-3.5" /> 返回
                         </button>
                         <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-orange-500" />
                            我的挑戰紀錄
                         </h3>
                         <div className="w-12"></div>
                      </div>

                      <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 pr-1">
                         {sortedChallengeRecords.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                               <Trophy className="w-10 h-10" />
                               <span className="text-xs">尚無挑戰紀錄</span>
                            </div>
                         ) : (
                            sortedChallengeRecords.map((record, idx) => (
                               <div key={idx} className="bg-white/60 p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                                  <div className="flex items-center gap-3">
                                     <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
                                        <Trophy className="w-4 h-4" />
                                     </div>
                                     <div>
                                        <div className="text-xs font-bold text-slate-700">
                                           {currentExamSubjects.find(s => s.id === record.subjectId)?.name || record.subjectId}
                                        </div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                           <Calendar className="w-3 h-3" />
                                           {new Date(record.timestamp).toLocaleDateString()}
                                        </div>
                                     </div>
                                  </div>
                                  <div className="text-right">
                                     <div className="text-lg font-bold text-slate-800 leading-none">
                                        {record.tasksCompleted}
                                     </div>
                                     <div className="text-[9px] text-slate-400">分 / {Math.floor(record.duration / 60)}mins</div>
                                  </div>
                               </div>
                            ))
                         )}
                      </div>
                   </div>
                ) : (
                   <>
                      {mode === 'challenge' ? (
                        <div className="focus-challenge-card">
                          <div className="focus-challenge-heading"><span><Trophy size={13} aria-hidden="true" />本次挑戰</span><button type="button" onClick={() => setShowChallengeHistory(true)}><History size={12} aria-hidden="true" />歷史紀錄</button></div>
                          <div className="focus-challenge-score"><div><strong>{challengeScore}</strong><span>件任務完成</span></div><span className="focus-challenge-best"><Trophy size={11} aria-hidden="true" />最佳 {getHighScore(selectedSubject, challengeDuration)} 件</span></div>
                          <p>計時期間完成待辦任務，即可累積挑戰分數。</p>
                        </div>
                      ) : (
                        <div className={`text-xs font-medium uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'animate-pulse' : ''} ${sessionType === 'break' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                            {mode === 'stopwatch' ? '經過時間' : mode === 'exam' ? '剩餘時間' : sessionType === 'focus' ? '專注時段' : '休息時間'}
                        </div>
                      )}

                      <div className="focus-clock-face relative z-10 mb-7 flex flex-col items-center">
                        <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 md:h-24 blur-3xl opacity-45 ${sessionType === 'break' ? 'bg-emerald-300/45' : 'bg-indigo-300/45'}`}></div>
                        <div
                          className={`study-timer-digits relative tabular-nums text-[5.25rem] leading-none md:text-[7.65rem] font-black tracking-[-0.065em] select-none drop-shadow-[0_18px_28px_rgba(15,23,42,0.14)] ${
                            sessionType === 'break'
                              ? 'text-emerald-950'
                              : 'text-slate-950'
                          }`}
                          style={{ fontFamily: '"SF Pro Display", "Inter", ui-sans-serif, system-ui, sans-serif' }}
                        >
                          <span className={`bg-clip-text text-transparent bg-gradient-to-b ${
                            sessionType === 'break'
                              ? 'from-emerald-950 via-emerald-900 to-teal-700'
                              : 'from-slate-950 via-slate-950 to-indigo-800'
                          }`}>
                            {timeString}
                          </span>
                        </div>
                      </div>

                      {mode !== 'stopwatch' && <div className="focus-session-progress" role="progressbar" aria-label="本次專注進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, Math.max(0, initialDuration > 0 ? (initialDuration - timeLeft) / initialDuration * 100 : 0)))}><span style={{ width: `${Math.min(100, Math.max(0, initialDuration > 0 ? (initialDuration - timeLeft) / initialDuration * 100 : 0))}%` }} /></div>}
                      <p className="focus-session-caption">{isActive ? '正在累積，屬於你的專注。' : mode === 'stopwatch' ? '準備好了，就從這一秒開始。' : '先開始，讓每一分鐘都有方向。'}</p>
                      <div className="focus-timer-actions flex items-center gap-6 relative z-10">
                        <button 
                          onClick={mode === 'stopwatch' ? handleStopwatchSave : resetTimer}
                          aria-label={mode === 'stopwatch' && timeLeft >= 60 ? '儲存專注紀錄' : '重設計時器'}
                          className="w-14 h-14 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-white transition-colors hover:shadow-sm bg-white/50"
                        >
                          {mode === 'stopwatch' && timeLeft >= 60 ? <Save className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
                        </button>
                        
                        <button 
                          onClick={toggleTimer}
                          aria-label={isActive ? '暫停專注' : '開始專注'}
                          className="study-timer-start h-14 px-5 gap-2 rounded-2xl flex items-center justify-center bg-slate-900 text-white hover:scale-105 transition-transform shadow-lg shadow-slate-900/10"
                        >
                          {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                          <span className="text-sm font-bold">{isActive ? '暫停' : '開始專注'}</span>
                        </button>

                        <div className="w-14 h-14 flex items-center justify-center relative">
                          <button 
                            onClick={() => setShowSettingsSelector(!showSettingsSelector)}
                            aria-label="專注計時設定"
                            aria-expanded={showSettingsSelector}
                            className={`w-full h-full rounded-full flex items-center justify-center border transition-colors shadow-sm ${showSettingsSelector && !isFocusMode ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white/50 border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-white'}`}
                          >
                              <Settings className="w-6 h-6" />
                          </button>
                          
                          {/* Settings Menu removed, using unified modal at the root */}
                        </div>
                      </div>
                   </>
                )}
             </div>
             
             {renderMusicPlayerWidget(false)}
          </div>
        </div>
      )}

      {/* Warning Overlay */}
      {showWarningModal && createPortal(
        <ModalLayer className="fixed inset-0 z-[25000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
            <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">警告！</h2>
            <p className="text-slate-600 mb-8">
              嚴格模式下，離開網頁會中斷目前的專注計時。
              <br/><br/>
              您還有 <span className="font-bold text-amber-600 text-lg">{2 - strictModeWarnings}</span> 次機會，請保持專注！
            </p>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors"
            >
              繼續專注
            </button>
          </div>
        </ModalLayer>,
        document.body
      )}

      {/* Violation Overlay */}
      {showViolation && createPortal(
        <ModalLayer className="fixed inset-0 z-[25000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">專注中斷！</h2>
            <p className="text-slate-600 mb-8">
              嚴格模式下，離開網頁會中斷目前的專注計時。請保持專注，不要分心喔！
            </p>
            <button
              onClick={() => {
                setShowViolation(false);
                resetTimer(); // Penalty: reset timer
              }}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
            >
              重新開始
            </button>
          </div>
        </ModalLayer>,
        document.body
      )}

      {/* Music Modal */}
      {showMusicSelector && createPortal(
        <ModalLayer className="focus-music-overlay fixed inset-0 z-[80000]" onClick={() => setShowMusicSelector(false)}>
          <MusicListPopupContent theme={activeTheme} {...musicMenuProps} />
        </ModalLayer>,
        document.body
      )}

      {/* Theme Modal */}
      {showThemeSelector && createPortal(
        <ModalLayer className="focus-theme-layer fixed inset-0 z-[20000] animate-fade-in" role="dialog" aria-modal="true" aria-label="專注背景選擇" onClick={() => setShowThemeSelector(false)}>
          <div className="focus-theme-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <header className="focus-theme-header">
              <span className="focus-theme-eyebrow"><Palette size={14} /> SET THE MOOD</span>
              <button type="button" onClick={() => setShowThemeSelector(false)} className="focus-theme-close" aria-label="關閉背景選擇"><X size={19} /></button>
              <h2>專注背景選擇</h2>
              <p>選一個舒服的色調，留一段時間給自己。</p>
              <div className="focus-theme-current"><span className={`focus-theme-current-dot ${activeTheme.accentClass}`} /><span>目前使用</span><strong>{activeTheme.name.replace(' (動態)', '')}</strong></div>
            </header>
            <div className="focus-theme-options">
              <div className="focus-theme-section-title"><h3>找到你的專注氛圍</h3><span>{THEMES.length} 種背景</span></div>
              <div className="focus-theme-grid">
                {THEMES.map(theme => {
                  const selected = activeThemeId === theme.id;
                  const animated = theme.name.includes('(動態)');
                  return <button type="button" key={theme.id} className="focus-theme-option" aria-pressed={selected} onClick={() => { setActiveThemeId(theme.id); setShowThemeSelector(false); }}>
                    <span className={`focus-theme-preview ${theme.textClass}`} aria-hidden="true"><FocusBackdrop themeId={theme.id} animated={animated} /><span className="focus-theme-preview-label">FOCUS TIME</span><span className="focus-theme-preview-time">25:00</span><span className={`focus-theme-preview-line ${theme.accentClass}`} />{selected && <span className="focus-theme-selected"><Check size={14} /></span>}</span>
                    <span className="focus-theme-option-caption"><strong>{theme.name.replace(' (動態)', '')}</strong><span className="focus-theme-type">{animated ? '動態' : ['morning', 'zen'].includes(theme.id) ? '淺色' : '深色'}</span></span>
                  </button>;
                })}
              </div>
            </div>
            <footer className="focus-theme-footer"><Check size={14} /><span>點選即套用至全螢幕專注畫面。動態背景可移至卡片上預覽。</span></footer>
          </div>
        </ModalLayer>, document.body
      )}

      {/* Settings Modal */}
      {showSettingsSelector && createPortal(
        <ModalLayer className="timer-settings-layer fixed inset-0 z-[30000] animate-fade-in" role="dialog" aria-modal="true" aria-label="計時設定" onClick={() => setShowSettingsSelector(false)}>
          <div className="timer-settings-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <header className="timer-settings-header">
              <span className="timer-settings-eyebrow"><Settings size={14} /> FIND YOUR RHYTHM</span>
              <button type="button" className="timer-settings-close" aria-label="關閉計時設定" onClick={() => setShowSettingsSelector(false)}><X size={19} /></button>
              <h2>計時設定</h2><p>調整節奏，為下一段專注做好準備。</p>
              <span className="timer-settings-mode">{({pomodoro:'倒數專注',stopwatch:'正數計時',exam:'模擬考',challenge:'專注挑戰'})[mode]}</span>
            </header>
            <div className="timer-settings-body">
              <section className="timer-settings-section">
                <div className="timer-settings-section-title"><h3><FileText size={15} />這次讀什麼？</h3><span>紀錄所屬科目</span></div>
                <button type="button" className="timer-settings-subject" aria-haspopup="dialog" aria-expanded={showSubjectSelector} onClick={() => setShowSubjectSelector(true)}><span>{currentExamSubjects.find(s => s.id === selectedSubject)?.name || '選擇科目'}</span><ChevronDown size={17} /></button>
              </section>
              {mode === 'pomodoro' && <section className="timer-settings-section">
                <div className="timer-settings-section-title"><h3><Timer size={15} />選擇你的節奏</h3><span>點選即重設計時</span></div>
                <div className="timer-settings-durations">
                  {[{minutes:25,type:'focus',label:'專注',note:'一段剛好的開始'},{minutes:50,type:'focus',label:'專注',note:'留給深入的學習'},{minutes:5,type:'break',label:'休息',note:'伸展一下，換口氣'},{minutes:10,type:'break',label:'休息',note:'充分充電再出發'}].map(option => <button type="button" key={option.minutes} aria-pressed={sessionType === option.type && initialDuration === option.minutes*60} data-kind={option.type} onClick={() => {setSessionType(option.type as 'focus'|'break');setTimeLeft(option.minutes*60);setInitialDuration(option.minutes*60);setIsActive(false);setShowSettingsSelector(false);}}>
                    <span className="timer-settings-duration-top"><span>{option.label}</span>{sessionType === option.type && initialDuration === option.minutes*60 && <Check size={14} />}</span>
                    <span className="timer-settings-duration-value">{option.minutes}<small>分鐘</small></span><span className="timer-settings-duration-note">{option.note}</span>
                  </button>)}
                </div>
              </section>}
              {mode === 'challenge' && <section className="timer-settings-section">
                <div className="timer-settings-section-title"><h3><Trophy size={15} />挑戰時間</h3><span>選一個能完成的目標</span></div>
                <div className="timer-settings-durations">{CHALLENGE_DURATIONS.map(dur => <button type="button" key={dur.value} aria-pressed={challengeDuration === dur.value} onClick={() => {handleChallengeDurationChange(dur.value);setShowSettingsSelector(false);}}><span className="timer-settings-duration-top"><span>專注挑戰</span>{challengeDuration === dur.value && <Check size={14} />}</span><span className="timer-settings-challenge-label">{dur.label}</span></button>)}</div>
              </section>}
              <section className="timer-settings-section timer-settings-preferences" aria-label="專注選項">
                <div className="timer-settings-section-title"><h3><Shield size={15} />專注小幫手</h3></div>
                <button type="button" role="switch" aria-checked={isSoundEnabled} aria-label="提示音效" className="timer-settings-toggle" onClick={() => setIsSoundEnabled(!isSoundEnabled)}><span className="timer-settings-toggle-icon">{isSoundEnabled ? <Bell size={18} /> : <BellOff size={18} />}</span><span className="timer-settings-toggle-copy"><strong>提示音效</strong><small>計時結束時播放提醒</small></span><span className="timer-settings-switch" aria-hidden="true"><span /></span></button>
                <button type="button" role="switch" aria-checked={isStrictMode} aria-label="嚴格模式" className="timer-settings-toggle" onClick={() => setIsStrictMode(!isStrictMode)}><span className="timer-settings-toggle-icon"><Shield size={18} /></span><span className="timer-settings-toggle-copy"><strong>嚴格模式</strong><small>離開網頁會中斷目前的專注</small></span><span className="timer-settings-switch" aria-hidden="true"><span /></span></button>
              </section>
            </div>
            <footer className="timer-settings-footer"><span>科目與專注選項立即套用</span><button type="button" onClick={() => setShowSettingsSelector(false)}>完成設定 <Check size={14} /></button></footer>
          </div>
        </ModalLayer>, document.body
      )}

      {/* Subject Selector Modal */}
      {showSubjectSelector && createPortal(
        <ModalLayer className="timer-settings-layer fixed inset-0 z-[30001] animate-fade-in" role="dialog" aria-modal="true" aria-label="選擇科目" onClick={() => setShowSubjectSelector(false)}>
          <div className="timer-settings-card timer-subject-card animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="timer-subject-header">
              <h3 className="timer-subject-title">
                <FileText className="w-5 h-5" />
                選擇科目
              </h3>
              <button type="button" aria-label="關閉科目選擇" onClick={() => setShowSubjectSelector(false)} className="timer-settings-close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="timer-subject-options">
              {currentExamSubjects.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => {
                    handleSubjectChange(sub.id);
                    setShowSubjectSelector(false);
                  }}
                  type="button" aria-pressed={selectedSubject === sub.id} className="timer-subject-option"
                >
                  {sub.name}
                  {selectedSubject === sub.id && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>
        </ModalLayer>,
        document.body
      )}
    </>
  );
};

export default StudyTimer;
