
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
  '115cap': [
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

const CHALLENGE_DURATIONS = [
  { label: '10 分鐘', value: 10 * 60 },
  { label: '20 分鐘', value: 20 * 60 },
  { label: '30 分鐘', value: 30 * 60 },
  { label: '45 分鐘', value: 45 * 60 },
  { label: '60 分鐘', value: 60 * 60 },
  { label: '80 分鐘', value: 80 * 60 },

];

interface MusicMenuProps {
  theme?: FocusTheme;
  showCustomInput: boolean;
  setShowCustomInput: (v: boolean) => void;
  customVideoUrl: string;
  setCustomVideoUrl: (v: string) => void;
  customTrackName: string;
  setCustomTrackName: (v: string) => void;
  handleAddCustomMusic: (e: React.FormEvent) => void;
  isAddingMusic: boolean;
  currentPlaylist: Playlist;
  currentTrackIndex: number;
  setCurrentTrackIndex: (i: number) => void;
  isPlayingMusic: boolean;
  toggleMusic: () => void;
  handleRemoveTrack: (e: React.MouseEvent, i: number) => void;
  playMode: PlayMode;
  togglePlayMode: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  closeMenu: () => void;
  volume: number;
  setVolume: (v: number) => void;
  
  // Playlist Management
  playlists: Playlist[];
  activePlaylistId: string;
  onChangePlaylist: (id: string) => void;
  onAddPlaylist: (name: string) => void;
  onDeletePlaylist: (id: string) => void;
}

const MusicListPopupContent: React.FC<MusicMenuProps> = ({ 
  theme, showCustomInput, setShowCustomInput, customVideoUrl, setCustomVideoUrl,
  customTrackName, setCustomTrackName,
  handleAddCustomMusic, isAddingMusic, currentPlaylist, currentTrackIndex, setCurrentTrackIndex,
  isPlayingMusic, toggleMusic, handleRemoveTrack, playMode, togglePlayMode, nextTrack, prevTrack, closeMenu,
  volume, setVolume,
  playlists, activePlaylistId, onChangePlaylist, onAddPlaylist, onDeletePlaylist
}) => {
    const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);

    const handleCreatePlaylist = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPlaylistName.trim()) {
            onAddPlaylist(newPlaylistName.trim());
            setNewPlaylistName('');
            setIsCreatingPlaylist(false);
        }
    };

    const currentTrack = currentPlaylist?.tracks?.[currentTrackIndex];
    const trackImageUrl = currentTrack?.youtubeId ? `https://img.youtube.com/vi/${currentTrack.youtubeId}/maxresdefault.jpg` : '';
    const fallbackImageUrl = currentTrack?.youtubeId ? `https://img.youtube.com/vi/${currentTrack.youtubeId}/hqdefault.jpg` : '';

    const [isScrolled, setIsScrolled] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (scrollContainerRef.current) {
                // Use a larger threshold to prevent rapid flickering
                const currentScrolled = scrollContainerRef.current.scrollTop > 40;
                if (currentScrolled !== isScrolled) {
                    setIsScrolled(currentScrolled);
                }
            }
        };
        const el = scrollContainerRef.current;
        el?.addEventListener('scroll', handleScroll, { passive: true });
        return () => el?.removeEventListener('scroll', handleScroll);
    }, [isScrolled]);

    const isLight = theme?.id === 'morning' || theme?.id === 'zen';
    const dynamicThemeText = isLight ? 'text-slate-800' : 'text-white';
    const dynamicThemeSubText = isLight ? 'text-slate-500' : 'text-white/75';
    const panelBgClass = theme ? (isLight ? 'bg-white/95' : 'bg-slate-950/95') : 'bg-white/95';
    const softSurfaceClass = theme ? (isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-white/10 border-white/10') : 'bg-slate-50/90 border-slate-200';

    return (
     <div 
        className={`w-[calc(100vw-24px)] max-w-[430px] overflow-hidden rounded-[28px] border shadow-2xl shadow-slate-950/25 backdrop-blur-2xl flex flex-col min-h-[560px] max-h-[88vh] animate-fade-in-up origin-bottom transition-all duration-300 ease-out ${panelBgClass} ${theme ? theme.borderClass : 'border-white text-slate-800'}`}
        onClick={(e) => e.stopPropagation()}
     >
        {/* Player Console */}
        <div 
            className="relative overflow-hidden flex-shrink-0 transition-all duration-300 ease-in-out"
        >
            {currentTrack?.youtubeId && (
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-25 transform scale-110 blur-2xl pointer-events-none" 
                    style={{ backgroundImage: `url(${fallbackImageUrl})` }} 
                />
            )}
            <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-b from-white/35 via-white/70 to-white/95' : 'bg-gradient-to-b from-slate-900/55 via-slate-950/85 to-slate-950/95'}`} />

            <div className="relative p-4 sm:p-5 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <div className={`flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-md ${softSurfaceClass}`}>
                        <Music2 className={`w-3.5 h-3.5 flex-shrink-0 ${isLight ? 'text-indigo-600' : 'text-blue-200'}`} />
                        <span className={`truncate text-[11px] font-black tracking-wide ${dynamicThemeText}`}>專注音樂播放器</span>
                    </div>
                    <button onClick={closeMenu} className={`p-2 rounded-full border backdrop-blur-md transition-colors ${theme ? (isLight ? 'bg-white/70 border-slate-200 hover:bg-white text-slate-700' : 'bg-white/10 border-white/10 hover:bg-white/20 text-white') : 'bg-white/70 border-slate-200 hover:bg-white text-slate-700'}`} type="button" aria-label="關閉音樂播放器">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className={`rounded-[24px] border p-3 shadow-xl shadow-slate-950/10 ${softSurfaceClass}`}>
                <div className="flex gap-4 items-center">
                    <div className={`relative h-24 w-24 sm:h-28 sm:w-28 rounded-[22px] overflow-hidden flex-shrink-0 shadow-xl transition-all duration-700 ${isPlayingMusic ? 'ring-4 ring-indigo-500/30 scale-[1.02] shadow-indigo-500/20' : 'opacity-90'}`}>
                        {currentTrack?.youtubeId ? (
                            <img 
                                src={fallbackImageUrl} 
                                alt="cover" 
                                className={`w-full h-full object-cover transition-transform duration-[10s] ease-in-out ${isPlayingMusic ? 'scale-110' : 'scale-100'}`} 
                                referrerPolicy="no-referrer" 
                            />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center ${theme ? (isLight ? 'bg-slate-200' : 'bg-black/20') : 'bg-slate-200'}`}>
                                <Music2 className={`w-10 h-10 ${theme ? (isLight ? 'text-slate-400' : 'text-white/30') : 'text-slate-400'}`} />
                            </div>
                        )}
                        {/* Playing Visualizer Overlay */}
                        {isPlayingMusic && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="flex gap-1.5 items-end h-8">
                                    <div className="w-1.5 bg-white rounded-t-sm animate-[music-bar_0.6s_ease-in-out_infinite] origin-bottom shadow-sm" style={{ height: '60%' }}></div>
                                    <div className="w-1.5 bg-white rounded-t-sm animate-[music-bar_0.6s_ease-in-out_infinite] origin-bottom shadow-sm" style={{ height: '100%', animationDelay: '0.1s' }}></div>
                                    <div className="w-1.5 bg-white rounded-t-sm animate-[music-bar_0.6s_ease-in-out_infinite] origin-bottom shadow-sm" style={{ height: '40%', animationDelay: '0.2s' }}></div>
                                    <div className="w-1.5 bg-white rounded-t-sm animate-[music-bar_0.6s_ease-in-out_infinite] origin-bottom shadow-sm" style={{ height: '100%', animationDelay: '0.3s' }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1 overflow-hidden">
                        <div className={`text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 transition-all duration-300 ${isPlayingMusic ? 'text-indigo-500' : dynamicThemeSubText}`}>
                            {isPlayingMusic ? 'NOW PLAYING' : 'READY'}
                        </div>
                        
                        <div className="relative w-full min-w-0 overflow-hidden">
                            <div className={`truncate text-lg sm:text-xl font-black leading-tight transition-colors duration-500 ${theme ? (isLight ? 'text-slate-900' : 'text-white drop-shadow-md') : 'text-slate-900'}`}>
                                {currentTrack?.name || '尚未選擇音樂'}
                            </div>
                        </div>
                        <div className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${dynamicThemeSubText}`}>
                            <ListMusic className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{currentPlaylist?.name || '預設歌單'}</span>
                        </div>
                        
                        {/* Playback Controls Mini */}
                        <div className="flex items-center gap-3 mt-3">
                            <button onClick={prevTrack} className={`p-2 rounded-full transition-transform active:scale-90 ${theme ? (isLight ? 'hover:bg-indigo-100 text-indigo-700' : 'hover:bg-white/20 text-white') : 'hover:bg-indigo-100 text-indigo-700'}`} type="button" aria-label="上一首">
                                <SkipBack className="w-4 h-4" fill="currentColor" />
                            </button>
                            <button 
                                onClick={toggleMusic} 
                                className={`w-11 h-11 flex items-center justify-center rounded-full transition-all shadow-lg active:scale-95 ${theme ? (isLight ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-white text-slate-900 hover:bg-slate-200') : 'bg-slate-950 text-white hover:bg-slate-800'}`}
                                type="button"
                                aria-label={isPlayingMusic ? '暫停' : '播放'}
                            >
                                {isPlayingMusic ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
                            </button>
                            <button onClick={nextTrack} className={`p-2 rounded-full transition-transform active:scale-90 ${theme ? (isLight ? 'hover:bg-indigo-100 text-indigo-700' : 'hover:bg-white/20 text-white') : 'hover:bg-indigo-100 text-indigo-700'}`} type="button" aria-label="下一首">
                                <SkipForward className="w-4 h-4" fill="currentColor" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`mt-4 p-3 rounded-2xl flex items-center gap-3 relative z-10 border backdrop-blur-md ${theme ? (isLight ? 'bg-white/80 border-slate-200' : 'bg-black/20 border-white/10') : 'bg-white/80 border-slate-200'}`}>
                    <button onClick={() => setVolume(volume === 0 ? 0.5 : 0)} className={`focus:outline-none flex-shrink-0 transition-opacity hover:opacity-100 ${theme ? (isLight ? 'text-slate-500 hover:text-slate-700' : 'text-white opacity-70') : 'text-slate-500 hover:text-slate-700'}`} type="button">
                        {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer outline-none bg-transparent"
                        style={{
                            background: `linear-gradient(to right, ${theme ? (isLight ? '#4f46e5' : '#ffffff') : '#4f46e5'} 0%, ${theme ? (isLight ? '#4f46e5' : '#ffffff') : '#4f46e5'} ${volume * 100}%, ${theme ? (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)') : '#cbd5e1'} ${volume * 100}%, ${theme ? (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)') : '#cbd5e1'} 100%)`
                        }}
                    />
                    <button 
                        onClick={togglePlayMode}
                        className={`ml-1 focus:outline-none transition-all flex-shrink-0 ${theme ? (isLight ? 'text-slate-500' : 'text-white') : 'text-slate-500'} ${playMode !== 'sequential' ? (theme ? (isLight ? 'text-indigo-600' : 'opacity-100 drop-shadow-md') : 'text-indigo-600') : 'opacity-50'}`}
                        title={playMode === 'sequential' ? '順序播放' : playMode === 'shuffle' ? '隨機播放' : '單曲循環'}
                    >
                         {playMode === 'sequential' && <Repeat className="w-4 h-4" />}
                         {playMode === 'shuffle' && <Shuffle className="w-4 h-4" />}
                         {playMode === 'repeat_one' && <Repeat1 className="w-4 h-4" />}
                    </button>
                </div>
                </div>
            </div>
        </div>

        {/* Playlist & Content Area */}
        <div className={`flex flex-col flex-1 min-h-0 bg-transparent ${theme ? (isLight ? 'bg-white/70' : 'bg-slate-950/50') : 'bg-white/70'}`}>
            
            {/* Playlist Switching Trigger Button - Replaces the inline dropdown */}
            <div className={`px-4 py-3 border-b ${theme ? (isLight ? 'border-slate-200/70' : 'border-white/10') : 'border-slate-200/70'} transition-all duration-300 ease-in-out will-change-[transform,opacity,max-height] ${isScrolled ? 'max-h-0 opacity-0 -translate-y-2 pointer-events-none overflow-hidden py-0' : 'max-h-24 opacity-100 translate-y-0 py-3'}`}>
                <button 
                    onClick={() => setShowPlaylistSelector(true)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all border shadow-sm group ${theme ? (isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-200' : 'bg-white/10 border-white/10 ' + theme.textClass + ' hover:bg-white/20') : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${theme ? (isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-white/10 text-white') : 'bg-indigo-50 text-indigo-600'}`}>
                            <ListMusic className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">目前歌單：{currentPlaylist?.name}</span>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px]">切換歌單</span>
                        <ChevronDown className="w-3 h-3" />
                    </div>
                </button>
            </div>

            {/* Playlist Selector Modal Overlay */}
            {showPlaylistSelector && createPortal(
                <div className="fixed inset-0 z-[81000] flex items-center justify-center p-4 animate-fade-in" onClick={(e) => { e.stopPropagation(); setShowPlaylistSelector(false); }}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div 
                        className={`relative w-full max-w-[320px] rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in border ${theme ? `${theme.menuBgClass} ${theme.borderClass}` : 'bg-white border-slate-200'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-opacity-10 border-black flex items-center justify-between">
                            <h3 className={`font-bold text-sm flex items-center gap-2 ${theme ? (isLight ? 'text-slate-800' : 'text-white') : ''}`}>
                                <ListMusic className="w-4 h-4 text-indigo-500" />
                                我的歌單
                            </h3>
                            <button onClick={() => setShowPlaylistSelector(false)} className={`p-1.5 rounded-full hover:bg-black/5 transition-colors ${theme ? (isLight ? 'text-slate-400' : 'text-white/60') : ''}`}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
                            <div className="space-y-1">
                                {playlists.map(p => (
                                    <div 
                                        key={p.id}
                                        onClick={() => { onChangePlaylist(p.id); setShowPlaylistSelector(false); }}
                                        className={`group w-full flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${activePlaylistId === p.id ? (theme ? (isLight ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-white/20 border-white/20 shadow-sm') : 'bg-indigo-50 border-indigo-100 shadow-sm') : (theme ? (isLight ? 'bg-transparent border-transparent hover:bg-slate-50' : 'bg-transparent border-transparent hover:bg-white/5') : 'bg-transparent border-transparent hover:bg-slate-50')}`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activePlaylistId === p.id ? (theme ? (isLight ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-white text-slate-900') : 'bg-indigo-600 text-white') : (theme ? (isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-white/40') : 'bg-slate-100 text-slate-400')}`}>
                                                <ListMusic className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col items-start overflow-hidden">
                                                <span className={`text-xs font-bold truncate ${activePlaylistId === p.id ? (theme ? (isLight ? 'text-indigo-800' : 'text-white') : 'text-indigo-800') : (theme ? (isLight ? 'text-slate-700' : 'text-white/80') : 'text-slate-700')}`}>
                                                    {p.name}
                                                </span>
                                                <span className="text-[10px] opacity-40 leading-none mt-0.5">{p.tracks?.length || 0} 首音樂</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                            {activePlaylistId === p.id ? (
                                                <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                                    <Check className="w-3.5 h-3.5 text-indigo-500" strokeWidth={3} />
                                                </div>
                                            ) : (
                                                p.id !== 'default' && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); if(confirm('確定要刪除此歌單嗎？')) onDeletePlaylist(p.id); }}
                                                        className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all ${theme ? (isLight ? 'hover:bg-red-50 text-slate-300 hover:text-red-500' : 'hover:bg-red-500/20 text-white/30 hover:text-red-300') : ''}`}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t border-opacity-10 border-black bg-black/5 backdrop-blur-md">
                            {!isCreatingPlaylist ? (
                                <button 
                                    onClick={() => setIsCreatingPlaylist(true)}
                                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all shadow-sm ${theme ? (isLight ? 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50' : 'bg-white/10 text-white hover:bg-white/20 border border-white/5') : 'bg-white text-indigo-600 border border-indigo-100'}`}
                                >
                                    <Plus className="w-4 h-4" />
                                    建立新歌單
                                </button>
                            ) : (
                                <form onSubmit={handleCreatePlaylist} className="flex flex-col gap-2 w-full animate-fade-in shadow-xl p-3 rounded-2xl bg-white/5 border border-white/10 ring-1 ring-black/5">
                                    <input 
                                        type="text" 
                                        value={newPlaylistName}
                                        onChange={(e) => setNewPlaylistName(e.target.value)}
                                        placeholder="輸入歌單名稱..."
                                        className={`w-full px-4 py-2.5 rounded-xl text-xs outline-none border transition-all focus:ring-2 ${theme ? (isLight ? 'bg-white border-slate-300 focus:ring-indigo-100 text-slate-700' : 'bg-white/10 border-white/20 focus:ring-white/30 text-white placeholder-white/40') : 'bg-white border-slate-300 focus:ring-indigo-100 text-slate-700'}`}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button type="submit" className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-transform active:scale-95 shadow-md ${theme ? (isLight ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900') : 'bg-indigo-600 text-white'}`}>建立</button>
                                        <button type="button" onClick={() => setIsCreatingPlaylist(false)} className={`px-4 py-2.5 rounded-xl transition-colors border ${theme ? (isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-white') : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                            取消
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* List Header & Add Button */}
            <div className={`px-4 py-2 transition-all duration-300 ease-in-out transform will-change-[transform,opacity,max-height] ${isScrolled ? 'max-h-0 opacity-0 -translate-y-2 pointer-events-none overflow-hidden py-0' : 'max-h-40 opacity-100 translate-y-0 py-2'}`}>
                {showCustomInput ? (
                <form onSubmit={handleAddCustomMusic} className="mb-2 p-3 rounded-2xl animate-fade-in border border-dashed border-opacity-50" onClick={(e) => e.stopPropagation()} style={{ borderColor: theme ? (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.4)') : '#cbd5e1' }}>
                    <div className="space-y-2 mb-3">
                        <input 
                            type="text" 
                            value={customVideoUrl}
                            onChange={(e) => setCustomVideoUrl(e.target.value)}
                            placeholder="貼上 YouTube 連結"
                            className={`w-full text-xs px-3 py-2.5 rounded-xl border outline-none focus:ring-2 transition-all ${theme ? (isLight ? 'bg-white border-slate-200 text-slate-700 focus:ring-indigo-100 focus:border-indigo-400' : 'bg-white/10 border-white/20 text-white placeholder-white/40 focus:ring-white/30') : 'bg-white border-slate-200 text-slate-700 focus:ring-indigo-100 focus:border-indigo-400'}`}
                            autoFocus
                        />
                        <input 
                            type="text" 
                            value={customTrackName}
                            onChange={(e) => setCustomTrackName(e.target.value)}
                            placeholder="音樂名稱 (選填，自動抓取標題)"
                            className={`w-full text-xs px-3 py-2.5 rounded-xl border outline-none focus:ring-2 transition-all ${theme ? (isLight ? 'bg-white border-slate-200 text-slate-700 focus:ring-indigo-100 focus:border-indigo-400' : 'bg-white/10 border-white/20 text-white placeholder-white/40 focus:ring-white/30') : 'bg-white border-slate-200 text-slate-700 focus:ring-indigo-100 focus:border-indigo-400'}`}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowCustomInput(false)} className={`flex-1 py-2 text-xs rounded-xl font-bold transition-colors ${theme ? (isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-white/10 hover:bg-white/20 text-white') : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`} disabled={isAddingMusic}>取消</button>
                        <button type="submit" className={`flex-1 py-2 text-xs rounded-xl font-bold flex items-center justify-center gap-1 transition-transform active:scale-95 shadow-sm disabled:opacity-50 disabled:active:scale-100 ${theme ? (isLight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-slate-900') : 'bg-indigo-600 text-white hover:bg-indigo-700'}`} disabled={isAddingMusic}>
                            {isAddingMusic ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            {isAddingMusic ? '抓取中...' : '加入歌單'}
                        </button>
                    </div>
                </form>
                ) : (
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowCustomInput(true); }}
                    className={`w-full text-center px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-dashed border-opacity-40 hover:border-opacity-100 ${theme ? (isLight ? 'text-slate-500 border-slate-400 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300' : 'text-white/80 border-white hover:bg-white/10') : 'text-slate-500 border-slate-400 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300'}`}
                    type="button"
                >
                    <Plus className="w-4 h-4" />
                    新增 YouTube 歌曲
                </button>
                )}
            </div>

            {/* Tracks Container */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-2 pb-20 custom-scrollbar will-change-scroll overscroll-contain touch-pan-y"
            >
                <div className="space-y-1 pb-20">
                    {currentPlaylist?.tracks?.length === 0 && (
                        <div className={`text-center py-8 text-xs font-medium flex flex-col items-center gap-3 opacity-60 ${theme ? (isLight ? 'text-slate-400' : 'text-white') : 'text-slate-400'}`}>
                            <div className="w-12 h-12 rounded-full border border-dashed flex items-center justify-center border-current opacity-30">
                                <Music2 className="w-6 h-6 outline-none" />
                            </div>
                            這裡目前還沒有任何音樂
                        </div>
                    )}
                    {currentPlaylist?.tracks?.map((track, idx) => {
                        const isActive = currentTrackIndex === idx;
                        return (
                        <div
                            key={track.id}
                            className={`w-full text-left p-2 rounded-2xl text-sm transition-all flex items-center justify-between group cursor-pointer border ${isActive ? (theme ? (isLight ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-white/20 border-white/20 shadow-sm') : 'bg-indigo-50 border-indigo-100 shadow-sm') : (theme ? (isLight ? 'bg-transparent border-transparent hover:bg-slate-50' : 'bg-transparent border-transparent hover:bg-white/10') : 'bg-transparent border-transparent hover:bg-slate-50')}`}
                            onClick={(e) => { 
                                e.stopPropagation();
                                setCurrentTrackIndex(idx); 
                                if(!isPlayingMusic || !isActive) toggleMusic(); 
                            }}
                        >
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                {/* Track Thumbnail Icon */}
                                <div className={`relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm transition-all duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-105'} ${theme ? (isLight ? 'bg-slate-200' : 'bg-white/10') : 'bg-slate-200'}`}>
                                    {track.youtubeId ? (
                                        <img 
                                        src={`https://img.youtube.com/vi/${track.youtubeId}/default.jpg`} 
                                        alt="cover" 
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Music2 className={`w-4 h-4 ${theme ? (isLight ? 'text-slate-400' : 'text-white/50') : 'text-slate-400'}`} />
                                        </div>
                                    )}
                                    {/* Mini Equilizer on list item if playing */}
                                    {isActive && isPlayingMusic && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                                            <div className="flex gap-0.5 items-end h-3">
                                                <div className="w-0.5 bg-white rounded-t-sm animate-[music-bar_0.4s_ease-in-out_infinite] origin-bottom" style={{ height: '60%' }}></div>
                                                <div className="w-0.5 bg-white rounded-t-sm animate-[music-bar_0.4s_ease-in-out_infinite] origin-bottom" style={{ height: '100%', animationDelay: '0.1s' }}></div>
                                                <div className="w-0.5 bg-white rounded-t-sm animate-[music-bar_0.4s_ease-in-out_infinite] origin-bottom" style={{ height: '40%', animationDelay: '0.2s' }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Track Details */}
                                <div className="flex flex-col flex-1 overflow-hidden">
                                   <span className={`truncate font-bold text-sm ${isActive ? (theme ? (isLight ? 'text-indigo-800' : 'text-white') : 'text-indigo-800') : (theme ? (isLight ? 'text-slate-700' : 'text-white/80') : 'text-slate-700')}`}>
                                      {track.name}
                                   </span>
                                   <span className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 truncate ${isActive ? (theme ? (isLight ? 'text-indigo-500/70' : 'text-white/60') : 'text-indigo-500/70') : (theme ? (isLight ? 'text-slate-400' : 'text-white/40') : 'text-slate-400')}`}>
                                      {track.youtubeId ? 'YouTube Audio' : 'Local Track'}
                                   </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1 pl-2">
                                <button 
                                    onClick={(e) => handleRemoveTrack(e, idx)}
                                    className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 ${theme ? (isLight ? 'text-slate-300 hover:text-red-500 hover:bg-red-50' : 'text-white/40 hover:text-red-300 hover:bg-red-500/20') : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                                    title="刪除"
                                    type="button"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        );
                    })}
                    {/* Bottom Spacer to ensure last item is scrollable */}
                    <div className="h-32 flex-shrink-0" />
                </div>
            </div>
        </div>
     </div>
    );
};

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
    const saved = localStorage.getItem('gsat_sound_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Strict Mode State
  const [isStrictMode, setIsStrictMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('gsat_strict_mode');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [showViolation, setShowViolation] = useState(false);
  const [strictModeWarnings, setStrictModeWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Music State
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [customTrackName, setCustomTrackName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isAddingMusic, setIsAddingMusic] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>('sequential');
  const [trackCurrentTime, setTrackCurrentTime] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  
  // Theme State
  const [activeThemeId, setActiveThemeId] = useState<string>(() => localStorage.getItem('gsat_focus_theme') || 'morning');
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
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const timerRef = useRef<number | null>(null);
  
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
    localStorage.setItem('gsat_sound_enabled', JSON.stringify(isSoundEnabled));
  }, [isSoundEnabled]);

  useEffect(() => {
    localStorage.setItem('gsat_strict_mode', JSON.stringify(isStrictMode));
    if (!isStrictMode) {
      setStrictModeWarnings(0);
    }
  }, [isStrictMode]);

  // Strict Mode Visibility Listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive && isStrictMode && sessionType === 'focus') {
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
  }, [isActive, isStrictMode, sessionType, isPlayingMusic, strictModeWarnings]);

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
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
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

  // Initialize YouTube API
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
    
    const onPlayerStateChange = (event: any) => {
        // YT.PlayerState.ENDED is 0
        if (event.data === 0) {
            handleTrackEnd();
        }
    };

    const initPlayer = () => {
      if (playerRef.current) return;
      // Just load a dummy video or first track to init
      const trackId = musicTracks[0]?.youtubeId || 'jfKfPfyJRdk';

      playerRef.current = new (window as any).YT.Player('youtube-audio-player', {
        height: '0',
        width: '0',
        videoId: trackId,
        playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'fs': 0 },
        events: {
          'onReady': (event: any) => { setIsPlayerReady(true); event.target.setVolume(volume * 100); },
          'onStateChange': onPlayerStateChange,
        }
      });
    };
    if ((window as any).YT && (window as any).YT.Player) initPlayer();
    else (window as any).onYouTubeIframeAPIReady = initPlayer;
  }, []);

  useEffect(() => {
    localStorage.setItem('gsat_focus_theme', activeThemeId);
  }, [activeThemeId]);

  // Load track when index changes or playlist changes
  useEffect(() => {
    if (isPlayerReady && playerRef.current) {
      const track = musicTracks[currentTrackIndex];
      if (track) {
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
          if (playerRef.current.getCurrentTime) {
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

        const name = customTrackName.trim() || fetchedName || `自訂音樂 ${musicTracks.length + 1}`;
        const newTrack: AudioTrack = {
            id: `custom-${Date.now()}`,
            name: name,
            youtubeId: id
        };
        
        // Update current playlist
        setPlaylists(prev => prev.map(p => {
            if (p.id === activePlaylistId) {
                return { ...p, tracks: [...p.tracks, newTrack] };
            }
            return p;
        }));

        // Select new track
        setCurrentTrackIndex(musicTracks.length); // length before add is index of new
        setIsPlayingMusic(true);
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
    
    // Logic to calculate new index after removal
    let newIndex = currentTrackIndex;
    if (index < currentTrackIndex) {
        newIndex = currentTrackIndex - 1;
    } else if (index === currentTrackIndex) {
        newIndex = 0; 
    }

    setPlaylists(prev => prev.map(p => {
        if (p.id === activePlaylistId) {
            return { ...p, tracks: p.tracks.filter((_, i) => i !== index) };
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
          tracks: [] // Empty initially
      };
      setPlaylists(prev => [...prev, newPlaylist]);
      setActivePlaylistId(newPlaylist.id);
  };

  const handleDeletePlaylist = (id: string) => {
      if (!setPlaylists || !setActivePlaylistId) return;
      setPlaylists(prev => {
          const filtered = prev.filter(p => p.id !== id);
          if (activePlaylistId === id) {
              setActivePlaylistId(filtered[0]?.id || 'default');
          }
          return filtered;
      });
  };

  const completeSession = (durationSecs: number) => {
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
          timestamp: Date.now()
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
        timestamp: Date.now()
      });
    }
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (mode === 'stopwatch') return prev + 1;
          else {
            if (prev <= 1) {
              setIsActive(false);
              if (timerRef.current) clearInterval(timerRef.current);
              
              // Play Sound if enabled
              if (isSoundEnabled) {
                 const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                 audio.play().catch(() => {});
              }
              
              completeSession(initialDuration);
              return 0;
            }
            return prev - 1;
          }
        });
      }, 1000);
    } else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, mode, initialDuration, isSoundEnabled]);

  const toggleTimer = () => {
    if (!isActive && mode === 'challenge') {
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
  
  const handleStopwatchSave = () => { setIsActive(false); completeSession(timeLeft); setTimeLeft(0); };
  
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

  const toggleMusic = () => setIsPlayingMusic(!isPlayingMusic);
  
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
    const isLight = activeTheme?.id === 'morning' || activeTheme?.id === 'zen';
    const themeTextClass = isFocusModeView ? activeTheme.textClass : (activeTheme ? activeTheme.textClass : 'text-slate-700');
    const themeSubTextClass = isFocusModeView ? activeTheme.subTextClass : (activeTheme ? activeTheme.subTextClass : 'text-slate-500');
    const themeAccentClass = isFocusModeView ? activeTheme.accentClass : (activeTheme ? activeTheme.accentClass : 'bg-indigo-600');
    const currentTrack = musicTracks[currentTrackIndex];
    const widgetSurfaceClass = isLight
      ? 'bg-white/90 border-white/70 shadow-slate-900/10'
      : 'bg-slate-950/75 border-white/10 shadow-black/30';
    const widgetControlClass = isLight
      ? 'bg-slate-950 text-white hover:bg-slate-800'
      : 'bg-white text-slate-950 hover:bg-slate-200';

    return (
      <div className="w-full flex justify-center px-3 pb-6 z-30 relative mt-auto">
        <div className="relative w-full max-w-[420px]">
            <div 
              className={`relative grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-[24px] border p-2.5 pr-3 transition-all backdrop-blur-2xl cursor-pointer hover:scale-[1.01] shadow-2xl overflow-hidden ${widgetSurfaceClass} ${isPlayingMusic ? 'animate-[breathe-glow_3s_ease-in-out_infinite]' : ''}`}
              onClick={() => setShowMusicSelector(true)}
            >
              <div className={`relative h-14 w-14 rounded-[18px] overflow-hidden flex-shrink-0 bg-slate-200 shadow-lg transition-all duration-500 ${isPlayingMusic ? 'ring-2 ring-indigo-500/30 scale-[1.03]' : ''}`}>
                {currentTrack?.youtubeId ? (
                  <img 
                    src={`https://img.youtube.com/vi/${currentTrack.youtubeId}/mqdefault.jpg`} 
                    alt="cover" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <Music2 className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                {isPlayingMusic && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="flex gap-0.5 items-end h-3">
                        <div className="w-0.5 bg-white animate-[music-bar_0.5s_ease-in-out_infinite] origin-bottom" style={{ height: '60%' }}></div>
                        <div className="w-0.5 bg-white animate-[music-bar_0.5s_ease-in-out_infinite] origin-bottom" style={{ height: '100%', animationDelay: '0.1s' }}></div>
                        <div className="w-0.5 bg-white animate-[music-bar_0.5s_ease-in-out_infinite] origin-bottom" style={{ height: '40%', animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex min-w-0 flex-col overflow-hidden text-left">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${isPlayingMusic ? themeAccentClass : 'bg-slate-300'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-[0.16em] ${themeSubTextClass}`}>
                    {isPlayingMusic ? 'Playing' : 'Music'}
                  </span>
                </div>
                <span className={`truncate text-sm font-black leading-tight ${themeTextClass}`}>
                    {currentTrack?.name || '尚未選擇音樂'}
                </span>
                <div className="mt-1 flex min-w-0 items-center gap-1.5">
                  <Youtube className="w-3 h-3 text-red-500 flex-shrink-0" />
                  <span className={`text-xs truncate ${themeSubTextClass}`}>
                      {activePlaylist.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleMusic(); }} 
                    className={`w-11 h-11 flex items-center justify-center rounded-full transition-all shadow-lg active:scale-95 ${isPlayingMusic ? `${themeAccentClass} text-white` : widgetControlClass}`}
                    type="button"
                    aria-label={isPlayingMusic ? '暫停音樂' : '播放音樂'}
                >
                  {isPlayingMusic ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); nextTrack(); }} className={`hidden sm:flex w-9 h-9 items-center justify-center rounded-full transition-colors ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'} ${themeTextClass}`} type="button" aria-label="下一首">
                  <SkipForward className="w-4 h-4" fill="currentColor" />
                </button>
              </div>

              {trackDuration > 0 && (
                <div className={`absolute bottom-0 left-4 right-4 h-1 overflow-hidden rounded-full ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}>
                  <div 
                    className={`h-full transition-all duration-1000 ease-linear ${themeAccentClass}`}
                    style={{ width: `${(trackCurrentTime / trackDuration) * 100}%` }}
                  />
                </div>
              )}
            </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div id="youtube-audio-player" className="fixed top-0 left-0 w-0 h-0 overflow-hidden opacity-0 pointer-events-none z-[-1]" />
      
      {isFocusMode ? (
        createPortal(
          <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between transition-all duration-1000 ${activeTheme.bgClass} overflow-hidden font-sans`}>
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] md:w-[60vh] md:h-[60vh] rounded-full blur-[120px] transition-colors duration-1000 opacity-40 ${activeTheme.glowColor} ${isActive ? 'animate-breathing-blob' : ''}`}></div>
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
            </div>

            {/* Top Bar: Info & Exit */}
            <div className="relative z-50 w-full px-6 py-6 md:px-12 md:py-8 landscape:py-3 flex items-start justify-between flex-shrink-0">
                <div className="flex flex-col gap-1">
                    <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-widest ${activeTheme.textClass} opacity-80`}>
                        {mode === 'stopwatch' ? <Watch className="w-4 h-4" /> : mode === 'challenge' ? <Trophy className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                        <span>{mode === 'stopwatch' ? 'Stopwatch' : mode === 'exam' ? 'Exam' : mode === 'challenge' ? 'Challenge' : 'Focus Mode'}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${activeTheme.textClass} opacity-60 text-xs`}>
                        <Clock className="w-3 h-3" />
                        <span className="font-mono pt-0.5">{formatClock(now)}</span>
                    </div>
                </div>

                {/* Target Pill - Top Right */}
                {(targetSchool || targetMajor) && (
                   <div className={`hidden md:flex items-center gap-3 px-4 py-2 rounded-full border ${activeTheme.borderClass} ${activeTheme.uiBgClass} shadow-sm backdrop-blur-md transition-all hover:scale-105`}>
                      <div className={`p-1.5 rounded-full ${activeTheme.accentClass} text-white`}>
                         <Target className="w-3 h-3" />
                      </div>
                      <div className={`flex flex-col ${activeTheme.textClass}`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 leading-none mb-0.5">Target</span>
                          <span className="text-xs font-bold leading-none">
                             {targetSchool} {targetSchool && targetMajor && '·'} {targetMajor}
                          </span>
                      </div>
                   </div>
                )}

                <button 
                  onClick={toggleFocusMode}
                  className={`md:hidden p-2 rounded-full ${activeTheme.textClass} hover:bg-white/10 transition-colors bg-white/10 backdrop-blur-md border border-white/10`}
                >
                    <Minimize2 className="w-6 h-6" />
                </button>
            </div>

            {/* Main Content: Timer */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-7xl px-4 landscape:mt-0 min-h-0">
                {/* Subject Label */}
                <div className={`text-base md:text-xl font-bold tracking-[0.2em] uppercase mb-4 md:mb-8 landscape:mb-2 opacity-70 ${activeTheme.textClass} flex items-center gap-3`}>
                    {currentExamSubjects.find(s => s.id === selectedSubject)?.name || '專注時段'}
                    {mode === 'challenge' && <span className="text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded text-sm tracking-normal">Score: {challengeScore}</span>}
                </div>

                {/* The Timer - Responsive Font Size */}
                <div 
                   className={`font-mono font-light leading-none tracking-tighter tabular-nums select-none transition-all duration-700 ${activeTheme.textClass} ${isActive ? 'scale-105 drop-shadow-2xl' : 'scale-100 opacity-90'} ${isLongTime ? 'text-[12vw] md:text-[160px]' : 'text-[20vw] md:text-[220px]'}`} 
                   style={{ 
                     textShadow: isActive ? '0 0 60px rgba(var(--accent-color), 0.2)' : 'none',
                     fontVariantNumeric: 'tabular-nums',
                     fontSize: 'min(20vw, 30vh)' // Ensure it fits vertically too
                   }}
                >
                  {timeString}
                </div>
                
                {/* Pending Task / Status or Challenge List */}
                <div className={`mt-8 md:mt-12 landscape:mt-4 flex flex-col items-center justify-center gap-2 min-h-[40px] w-full`}>
                    {mode === 'challenge' ? (
                        <div className="flex flex-col gap-2 w-full max-w-sm px-4">
                             {pendingTasks.length > 0 ? pendingTasks.slice(0, 3).map(task => (
                                 <button 
                                    key={task.id}
                                    onClick={() => toggleTask(task.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border backdrop-blur-md transition-all text-left group ${activeTheme.uiBgClass} ${activeTheme.borderClass} ${activeTheme.textClass}`}
                                 >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${activeTheme.borderClass}`}>
                                       <div className="w-2.5 h-2.5 rounded-full bg-current opacity-0 group-hover:opacity-50 transition-opacity"></div>
                                    </div>
                                    <span className="truncate flex-1 text-sm font-medium">{task.text}</span>
                                 </button>
                             )) : (
                                 <div className={`text-center text-sm opacity-60 ${activeTheme.textClass}`}>
                                    所有任務已完成！
                                 </div>
                             )}
                        </div>
                    ) : pendingTasks.length > 0 && mode !== 'stopwatch' ? (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${activeTheme.borderClass} ${activeTheme.uiBgClass} ${activeTheme.textClass} text-sm opacity-80 backdrop-blur-md`}>
                        <ListTodo className="w-4 h-4" />
                        <span className="truncate max-w-[200px] md:max-w-xs">{pendingTasks[0].text}</span>
                      </div>
                    ) : (targetSchool || targetMajor) && (
                       /* Mobile Target Display if no task */
                       <div className={`md:hidden flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 ${activeTheme.textClass}`}>
                          <Target className="w-3.5 h-3.5 opacity-70" />
                          <span className="text-xs font-bold">{targetSchool} {targetSchool && targetMajor && '·'} {targetMajor}</span>
                       </div>
                    )}
                </div>
            </div>

            {renderMusicPlayerWidget(true)}

            {/* Bottom Dock Control Bar */}
            <div className="relative z-50 mb-8 md:mb-12 landscape:mb-3 flex-shrink-0">
                <div className={`flex items-center gap-1 md:gap-2 p-2 rounded-[2rem] border shadow-2xl backdrop-blur-2xl transition-all duration-300 ${activeTheme.uiBgClass} ${activeTheme.borderClass}`}>
                    
                    {/* Left Group: Tools */}
                    <div className="flex items-center gap-1 px-2">
                       <button 
                          onClick={mode === 'stopwatch' ? handleStopwatchSave : resetTimer}
                          className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all hover:bg-white/10 ${activeTheme.textClass}`}
                          title="重置"
                       >
                          {mode === 'stopwatch' && timeLeft > 60 && !isActive ? <Save className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
                       </button>

                       <button 
                          onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                          className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all hover:bg-white/10 ${isSoundEnabled ? activeTheme.textClass : 'opacity-40 ' + activeTheme.textClass}`}
                          title="提示音效"
                       >
                          {isSoundEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                       </button>
                    </div>

                    <div className={`w-px h-6 mx-1 ${activeTheme.borderClass} bg-current opacity-20`}></div>

                    {/* Center: Play/Pause */}
                    <button 
                        onClick={toggleTimer}
                        className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 hover:scale-105 mx-1 ${activeTheme.accentClass} text-white`}
                    >
                        {isActive ? <Pause className="w-8 h-8 md:w-10 md:h-10 fill-current" /> : <Play className="w-8 h-8 md:w-10 md:h-10 fill-current ml-1" />}
                    </button>

                    <div className={`w-px h-6 mx-1 ${activeTheme.borderClass} bg-current opacity-20`}></div>

                    {/* Right Group: Environment */}
                    <div className="flex items-center gap-1 px-2 relative">
                        {/* Settings Toggle */}
                        <div className="relative">
                           <button 
                             onClick={() => { setShowSettingsSelector(true); setShowThemeSelector(false); setShowMusicSelector(false); }}
                             className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all hover:bg-white/10 ${activeTheme.textClass}`}
                             title="設定"
                           >
                             <Settings className="w-5 h-5" />
                           </button>
                        </div>

                        {/* Music Toggle */}
                        <div className="relative">
                            <button 
                              onClick={() => { setShowMusicSelector(true); setShowThemeSelector(false); setShowSettingsSelector(false); }}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all hover:bg-white/10 ${activeTheme.textClass} ${isPlayingMusic ? 'bg-white/10' : ''}`}
                              title="背景音樂"
                            >
                               {isPlayingMusic ? <Volume2 className="w-5 h-5" /> : <Music2 className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Theme Toggle */}
                        <div className="relative">
                           <button 
                             onClick={() => { setShowThemeSelector(true); setShowMusicSelector(false); setShowSettingsSelector(false); }}
                             className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all hover:bg-white/10 ${activeTheme.textClass}`}
                             title="主題"
                           >
                             <Palette className="w-5 h-5" />
                           </button>
                        </div>
                    </div>

                    {/* Desktop Exit Button in Dock */}
                    <div className="hidden md:flex items-center border-l border-white/10 pl-2 ml-1">
                        <button 
                          onClick={toggleFocusMode}
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:bg-red-500/20 hover:text-red-400 ${activeTheme.textClass}`}
                          title="退出"
                        >
                            <Minimize2 className="w-5 h-5" />
                        </button>
                    </div>

                </div>
            </div>

            {/* Backdrop for closing menus */}
            {(showMusicSelector || showThemeSelector) && (
                <div className="fixed inset-0 z-40" onClick={() => { setShowMusicSelector(false); setShowThemeSelector(false); }}></div>
            )}
          </div>,
          document.body
        )
      ) : (
        <div className="w-full relative group min-h-[450px]">
          {/* Background Layer (Clipped for aesthetics) */}
          <div className="absolute inset-0 glass-card rounded-[2rem] overflow-hidden bg-white/60 z-0">
             <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[60px] transition-colors duration-1000 pointer-events-none ${isActive ? (mode === 'challenge' ? 'bg-orange-100' : sessionType === 'break' ? 'bg-emerald-100' : 'bg-indigo-100') : 'bg-transparent'}`}></div>
          </div>

          {/* Content Layer (Not Clipped to allow dropdowns) */}
          <div className="relative z-10 flex flex-col h-full min-h-[450px]">
             <div className="m-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-2xl border border-white/60 bg-white/50 p-1.5 shadow-sm backdrop-blur-xl flex-shrink-0 z-20">
                <div className="grid min-w-0 grid-cols-4 gap-1">
                      <ModeButton id="pomodoro" label="倒數" icon={Timer} />
                      <ModeButton id="stopwatch" label="正數" icon={Watch} />
                      <ModeButton id="exam" label="模擬考" icon={FileText} />
                      <ModeButton id="challenge" label="挑戰" icon={Trophy} />
                </div>
                <button onClick={toggleFocusMode} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] text-slate-400 transition-colors hover:bg-white/40 hover:text-slate-700" title="全螢幕">
                  <Maximize2 className="w-4 h-4" />
                </button>
             </div>

             <div className="flex-grow flex flex-col items-center justify-center relative p-4">
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
                        <div className="flex flex-col items-center mb-4 z-10 w-full max-w-xs relative">
                            <button 
                               onClick={() => setShowChallengeHistory(true)}
                               className="self-end mb-3 text-[10px] text-indigo-500 hover:text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1.5 rounded-full flex items-center gap-1 transition-colors border border-indigo-100 shadow-sm"
                            >
                               <History className="w-3 h-3" /> 歷史紀錄
                            </button>

                            <div className="flex justify-between w-full text-xs font-bold text-slate-400 uppercase tracking-wider px-4 mb-2">
                              <span>Current Score</span>
                              <span>Best: {getHighScore(selectedSubject, challengeDuration)}</span>
                            </div>
                            <div className="w-full bg-white rounded-2xl border border-slate-200 p-3 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-orange-100 text-orange-500 rounded-lg">
                                      <Flame className="w-5 h-5" />
                                  </div>
                                  <div className="flex flex-col">
                                      <span className="text-xl font-bold text-slate-800 leading-none">{challengeScore}</span>
                                      <span className="text-[10px] text-slate-400">已完成任務</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-slate-400">完成待辦清單任務</div>
                                  <div className="text-[10px] text-slate-400">以累積挑戰分數</div>
                                </div>
                            </div>
                        </div>
                      ) : (
                        <div className={`text-xs font-medium uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'animate-pulse' : ''} ${sessionType === 'break' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                            {mode === 'stopwatch' ? '經過時間' : mode === 'exam' ? '剩餘時間' : sessionType === 'focus' ? '專注時段' : '休息時間'}
                        </div>
                      )}

                      <div className="relative z-10 mb-7 flex flex-col items-center">
                        <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 md:h-24 blur-3xl opacity-45 ${sessionType === 'break' ? 'bg-emerald-300/45' : 'bg-indigo-300/45'}`}></div>
                        <div
                          className={`relative tabular-nums text-[5.25rem] leading-none md:text-[7.65rem] font-black tracking-[-0.065em] select-none drop-shadow-[0_18px_28px_rgba(15,23,42,0.14)] ${
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

                      <div className="flex items-center gap-6 relative z-10">
                        <button 
                          onClick={resetTimer}
                          className="w-14 h-14 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-white transition-colors hover:shadow-sm bg-white/50"
                        >
                          {mode === 'stopwatch' && timeLeft > 60 && !isActive ? <Save className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
                        </button>
                        
                        <button 
                          onClick={toggleTimer}
                          className="w-20 h-20 rounded-full flex items-center justify-center bg-slate-900 text-white hover:scale-105 transition-transform shadow-lg shadow-slate-900/10"
                        >
                          {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </button>

                        <div className="w-14 h-14 flex items-center justify-center relative">
                          <button 
                            onClick={() => setShowSettingsSelector(!showSettingsSelector)}
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
        <div className="fixed inset-0 z-[25000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
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
        </div>,
        document.body
      )}

      {/* Violation Overlay */}
      {showViolation && createPortal(
        <div className="fixed inset-0 z-[25000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
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
        </div>,
        document.body
      )}

      {/* Music Modal */}
      {showMusicSelector && createPortal(
        <div className="fixed inset-0 z-[80000] bg-slate-950/55 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in" onClick={() => setShowMusicSelector(false)}>
          <MusicListPopupContent theme={activeTheme} {...musicMenuProps} />
        </div>,
        document.body
      )}

      {/* Theme Modal */}
      {showThemeSelector && createPortal(
        <div className="fixed inset-0 z-[20000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowThemeSelector(false)}>
          <div className={`w-[85vw] max-w-[320px] p-4 rounded-3xl backdrop-blur-xl border shadow-2xl flex flex-col gap-1 animate-scale-in ${activeTheme.menuBgClass} ${activeTheme.borderClass}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <Palette className={`w-3.5 h-3.5 ${activeTheme.subTextClass}`} />
                <span className={activeTheme.subTextClass}>專注背景選擇</span>
              </div>
              <button onClick={() => setShowThemeSelector(false)} className={`p-1 rounded-full transition-colors hover:bg-white/10 ${activeTheme.textClass}`} type="button">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => { setActiveThemeId(theme.id); setShowThemeSelector(false); }}
                  className={`flex items-center justify-between p-3 rounded-xl text-sm transition-colors ${activeTheme.textClass} hover:bg-white/10 ${activeThemeId === theme.id ? 'bg-white/10' : ''}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full shadow-sm ${theme.accentClass}`}></span>
                    <span className="font-medium">{theme.name}</span>
                  </span>
                  {activeThemeId === theme.id && <Check className="w-4 h-4 text-indigo-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Settings Modal */}
      {showSettingsSelector && createPortal(
        <div className="fixed inset-0 z-[30000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowSettingsSelector(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-scale-in max-h-[85vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" />
                計時設定
              </h3>
              <button onClick={() => setShowSettingsSelector(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Subject Selection */}
            <div className="flex flex-col gap-1.5 mb-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  選擇科目
                </label>
                <div className="relative group/select">
                    <button 
                      onClick={() => setShowSubjectSelector(true)}
                      className="w-full flex items-center justify-between bg-slate-50/50 hover:bg-slate-100/50 border border-slate-200/60 text-slate-700 text-sm font-medium rounded-2xl p-3 pl-4 pr-4 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer shadow-sm"
                    >
                      <span>{currentExamSubjects.find(s => s.id === selectedSubject)?.name}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Time Selection (Pomodoro) */}
            {mode === 'pomodoro' && (
              <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Timer className="w-3 h-3" />
                    時間設定
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setSessionType('focus'); setTimeLeft(25*60); setInitialDuration(25*60); setIsActive(false); setShowSettingsSelector(false); }} className={`p-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 border ${sessionType === 'focus' && initialDuration === 25*60 ? 'bg-indigo-600 text-white border-transparent scale-105' : 'bg-white border-slate-200/60 text-slate-600 hover:bg-slate-50'}`}>25分 專注</button>
                    <button onClick={() => { setSessionType('focus'); setTimeLeft(50*60); setInitialDuration(50*60); setIsActive(false); setShowSettingsSelector(false); }} className={`p-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 border ${sessionType === 'focus' && initialDuration === 50*60 ? 'bg-indigo-600 text-white border-transparent scale-105' : 'bg-white border-slate-200/60 text-slate-600 hover:bg-slate-50'}`}>50分 專注</button>
                    <button onClick={() => { setSessionType('break'); setTimeLeft(5*60); setInitialDuration(5*60); setIsActive(false); setShowSettingsSelector(false); }} className={`p-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 border ${sessionType === 'break' && initialDuration === 5*60 ? 'bg-emerald-500 text-white border-transparent scale-105' : 'bg-white border-slate-200/60 text-emerald-600 hover:bg-emerald-50'}`}>5分 休息</button>
                    <button onClick={() => { setSessionType('break'); setTimeLeft(10*60); setInitialDuration(10*60); setIsActive(false); setShowSettingsSelector(false); }} className={`p-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 border ${sessionType === 'break' && initialDuration === 10*60 ? 'bg-emerald-500 text-white border-transparent scale-105' : 'bg-white border-slate-200/60 text-emerald-600 hover:bg-emerald-50'}`}>10分 休息</button>
                  </div>
              </div>
            )}
            
            {/* Time Selection (Challenge) */}
            {mode === 'challenge' && (
              <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Trophy className="w-3 h-3" />
                    挑戰時間
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                      {CHALLENGE_DURATIONS.map(dur => (
                        <button 
                          key={dur.value}
                          onClick={() => { handleChallengeDurationChange(dur.value); setShowSettingsSelector(false); }}
                          className={`p-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 border ${challengeDuration === dur.value ? 'bg-indigo-600 text-white border-transparent scale-105' : 'bg-white border-slate-200/60 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {dur.label}
                        </button>
                      ))}
                  </div>
              </div>
            )}

            <div className="h-px bg-slate-200/60 my-3"></div>

            {/* Sound Toggle */}
            <button 
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors border border-transparent hover:border-slate-200/60"
            >
               <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${isSoundEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                    {isSoundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </div>
                  <span>提示音效</span>
               </div>
               <div className={`w-10 h-5 rounded-full relative transition-colors shadow-inner ${isSoundEnabled ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${isSoundEnabled ? 'left-[22px]' : 'left-[2px]'}`}></div>
               </div>
            </button>

            {/* Strict Mode Toggle */}
            <button 
              onClick={() => setIsStrictMode(!isStrictMode)}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors border border-transparent hover:border-slate-200/60 mt-1"
            >
               <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${isStrictMode ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span>嚴格模式</span>
                    <span className="text-[10px] text-slate-400 font-normal">離開網頁即中斷</span>
                  </div>
               </div>
               <div className={`w-10 h-5 rounded-full relative transition-colors shadow-inner ${isStrictMode ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${isStrictMode ? 'left-[22px]' : 'left-[2px]'}`}></div>
               </div>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Subject Selector Modal */}
      {showSubjectSelector && createPortal(
        <div className="fixed inset-0 z-[30000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowSubjectSelector(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-scale-in max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                選擇科目
              </h3>
              <button onClick={() => setShowSubjectSelector(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto custom-scrollbar pr-2 space-y-2 flex-1">
              {currentExamSubjects.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => {
                    handleSubjectChange(sub.id);
                    setShowSubjectSelector(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between border ${selectedSubject === sub.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200'}`}
                >
                  {sub.name}
                  {selectedSubject === sub.id && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default StudyTimer;
