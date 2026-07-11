
export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  category: 'chinese' | 'english' | 'math' | 'social' | 'natural' | 'other';
  dueDate?: string; // e.g. YYYY-MM-DD
}

export interface StudySession {
  id: string;
  subjectId: string;
  subjectName: string;
  durationMinutes: number;
  timestamp: number;
}

export interface ChallengeRecord {
  id: string;
  subjectId: string; // e.g., 'math', 'english'
  duration: number; // in seconds (e.g., 600 for 10 mins)
  tasksCompleted: number;
  timestamp: number;
}

export interface RankingItem {
  rank: number;
  name: string;
  team?: string;
  totalMinutes: number;
  isCurrentUser?: boolean;
  diffToNext?: number;
}

export interface TeamRankingItem {
  rank: number;
  name: string;
  points: number;
  isCurrentTeam?: boolean;
  diffToNext?: number;
}

export interface CustomDate {
  id: string;
  title: string;
  date: string;
}

export interface StreakData {
  current: number;
  max: number;
  lastDate: string; // ISO Date string (YYYY-MM-DD)
}

export interface AudioTrack {
  id: string;
  name: string;
  youtubeId: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: AudioTrack[];
}

export interface BackupItem {
  id: string; 
  date: string; 
  timestamp: string; 
}

export enum SubjectCategory {
  CHINESE = '國文',
  ENGLISH = '英文',
  MATH = '數學',
  SOCIAL = '社會',
  NATURAL = '自然',
  OTHER = '其他'
}

export const CATEGORY_COLORS: Record<string, string> = {
  chinese: 'bg-red-500/20 text-red-300 border-red-500/30',
  english: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  math: 'bg-green-500/20 text-green-300 border-green-500/30',
  social: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  natural: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  other: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

// Auth Related Types
export interface User {
  email: string;
  name: string;
  registrationDate?: string;
  lastLoginDate?: string;
}

export interface TempleState {
  lamps: { type: string; expireAt: number }[];
  fortunes: { text: string; type: string; date: number }[];
  ticketOffered: boolean;
}

export interface IncenseRecord {
  id: string;
  amount: number;
  reason: string;
  timestamp: number;
}

export interface AppData {
  tasks: TodoItem[];
  studySessions: StudySession[];
  challengeRecords: ChallengeRecord[];
  targetSchool: string;
  targetMajor: string;
  targetDateStr: string;
  targetExam?: string;
  tvetCategory?: string;
  customDates: CustomDate[];
  dailyGoal: number; // minutes
  streak: StreakData;
  playlists: Playlist[];
  activePlaylistId: string;
  incenseCoins: number;
  incenseRecords: IncenseRecord[];
  templeState: TempleState;
  unlockedAchievementIds?: string[];
  examChecklist?: Record<string, boolean>;
  team?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  code?: string;
  user?: User;
  data?: AppData;
  encryptedData?: string; // Raw encrypted string from server
  encryptionKey?: string; // The user's specific key to decrypt data
  isLocked?: boolean;
  ranking?: RankingItem[];
  backups?: BackupItem[];
}
