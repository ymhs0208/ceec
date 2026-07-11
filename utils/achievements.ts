import { AppData, StudySession, TodoItem } from '../types';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'time' | 'streak' | 'subject' | 'task' | 'special';
  condition: (data: AppData) => boolean;
}

const getStudyTimeBySubject = (sessions: StudySession[], subjectId: string) => {
  return sessions.filter(s => s.subjectId === subjectId).reduce((acc, s) => acc + s.durationMinutes, 0);
};

const getTotalStudyTime = (sessions: StudySession[]) => {
  return sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
};

const getSessionsByHour = (sessions: StudySession[], startHour: number, endHour: number) => {
  return sessions.filter(s => {
    const hour = new Date(s.timestamp).getHours();
    if (startHour > endHour) {
      return hour >= startHour || hour < endHour;
    }
    return hour >= startHour && hour < endHour;
  });
};

const getSessionsByDayOfWeek = (sessions: StudySession[], days: number[]) => {
  return sessions.filter(s => days.includes(new Date(s.timestamp).getDay()));
};

const getDailyStudyTimes = (sessions: StudySession[]) => {
  const daily: Record<string, number> = {};
  sessions.forEach(s => {
    const date = new Date(s.timestamp).toISOString().split('T')[0];
    daily[date] = (daily[date] || 0) + s.durationMinutes;
  });
  return daily;
};

const getDailySubjects = (sessions: StudySession[]) => {
  const daily: Record<string, Set<string>> = {};
  sessions.forEach(s => {
    const date = new Date(s.timestamp).toISOString().split('T')[0];
    if (!daily[date]) daily[date] = new Set();
    daily[date].add(s.subjectId);
  });
  return daily;
};

const getDailyTasks = (tasks: TodoItem[]) => {
  // We don't have task completion timestamp, so we just count total completed tasks
  return tasks.filter(t => t.completed).length;
};

export const ACHIEVEMENTS: Achievement[] = [
  // Time Category (15)
  { id: 't1', title: '初試啼聲', description: '累積讀書 1 小時', icon: '🌱', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 60 },
  { id: 't2', title: '漸入佳境', description: '累積讀書 5 小時', icon: '🌿', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 300 },
  { id: 't3', title: '持之以恆', description: '累積讀書 10 小時', icon: '🌲', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 600 },
  { id: 't4', title: '小有成就', description: '累積讀書 20 小時', icon: '🥉', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 1200 },
  { id: 't5', title: '學海無涯', description: '累積讀書 50 小時', icon: '🥈', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 3000 },
  { id: 't6', title: '百尺竿頭', description: '累積讀書 100 小時', icon: '🥇', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 6000 },
  { id: 't7', title: '更進一步', description: '累積讀書 200 小時', icon: '🚀', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 12000 },
  { id: 't8', title: '學霸之路', description: '累積讀書 300 小時', icon: '🎓', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 18000 },
  { id: 't9', title: '知識淵博', description: '累積讀書 400 小時', icon: '📚', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 24000 },
  { id: 't10', title: '半個專家', description: '累積讀書 500 小時', icon: '🧠', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 30000 },
  { id: 't11', title: '爐火純青', description: '累積讀書 600 小時', icon: '🔥', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 36000 },
  { id: 't12', title: '登峰造極', description: '累積讀書 700 小時', icon: '⛰️', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 42000 },
  { id: 't13', title: '出神入化', description: '累積讀書 800 小時', icon: '✨', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 48000 },
  { id: 't14', title: '超凡入聖', description: '累積讀書 900 小時', icon: '🌟', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 54000 },
  { id: 't15', title: '一千小時的淬鍊', description: '累積讀書 1000 小時', icon: '👑', category: 'time', condition: d => getTotalStudyTime(d.studySessions) >= 60000 },

  // Streak Category (10)
  { id: 's1', title: '三天打魚', description: '連續讀書 3 天', icon: '🔥', category: 'streak', condition: d => d.streak.max >= 3 },
  { id: 's2', title: '一週全勤', description: '連續讀書 7 天', icon: '📅', category: 'streak', condition: d => d.streak.max >= 7 },
  { id: 's3', title: '兩週不間斷', description: '連續讀書 14 天', icon: '🏃', category: 'streak', condition: d => d.streak.max >= 14 },
  { id: 's4', title: '三週養成', description: '連續讀書 21 天', icon: '🔄', category: 'streak', condition: d => d.streak.max >= 21 },
  { id: 's5', title: '滿月達成', description: '連續讀書 30 天', icon: '🌕', category: 'streak', condition: d => d.streak.max >= 30 },
  { id: 's6', title: '五十天挑戰', description: '連續讀書 50 天', icon: '🎯', category: 'streak', condition: d => d.streak.max >= 50 },
  { id: 's7', title: '兩個月堅持', description: '連續讀書 60 天', icon: '💪', category: 'streak', condition: d => d.streak.max >= 60 },
  { id: 's8', title: '百日維新', description: '連續讀書 100 天', icon: '💯', category: 'streak', condition: d => d.streak.max >= 100 },
  { id: 's9', title: '半年不輟', description: '連續讀書 180 天', icon: '⏳', category: 'streak', condition: d => d.streak.max >= 180 },
  { id: 's10', title: '一年之計', description: '連續讀書 365 天', icon: '🌍', category: 'streak', condition: d => d.streak.max >= 365 },

  // Daily Study Time (10)
  { id: 'd1', title: '小試身手', description: '單日讀書 1 小時', icon: '⏱️', category: 'time', condition: d => Math.max(0, ...Object.values(getDailyStudyTimes(d.studySessions))) >= 60 },
  { id: 'd2', title: '漸入佳境', description: '單日讀書 2 小時', icon: '⏳', category: 'time', condition: d => Math.max(0, ...Object.values(getDailyStudyTimes(d.studySessions))) >= 120 },
  { id: 'd3', title: '專注時刻', description: '單日讀書 3 小時', icon: '🕰️', category: 'time', condition: d => Math.max(0, ...Object.values(getDailyStudyTimes(d.studySessions))) >= 180 },
  { id: 'd4', title: '半天苦讀', description: '單日讀書 4 小時', icon: '🌞', category: 'time', condition: d => Math.max(0, ...Object.values(getDailyStudyTimes(d.studySessions))) >= 240 },
  { id: 'd5', title: '五小時戰士', description: '單日讀書 5 小時', icon: '⚔️', category: 'time', condition: d => Math.max(0, ...Object.values(getDailyStudyTimes(d.studySessions))) >= 300 },
  { id: 'd6', title: '六小時鐵人', description: '單日讀書 6 小時', icon: '🛡️', category: 'time', condition: d => Math.max(0, ...Object.values(getDailyStudyTimes(d.studySessions))) >= 360 },
  { id: 'd7', title: '八小時極限', description: '單日讀書 8 小時', icon: '⚡', category: 'time', condition: d => Math.max(0, ...Object.values(getDailyStudyTimes(d.studySessions))) >= 480 },
  { id: 'd8', title: '十小時神人', description: '單日讀書 10 小時', icon: '🤯', category: 'time', condition: d => Math.max(0, ...Object.values(getDailyStudyTimes(d.studySessions))) >= 600 },
  { id: 'd9', title: '十二小時狂人', description: '單日讀書 12 小時', icon: '🧟', category: 'time', condition: d => Math.max(0, ...Object.values(getDailyStudyTimes(d.studySessions))) >= 720 },
  { id: 'd10', title: '十四小時傳說', description: '單日讀書 14 小時', icon: '🦄', category: 'time', condition: d => Math.max(0, ...Object.values(getDailyStudyTimes(d.studySessions))) >= 840 },

  // Subject Specific (25)
  ...['chinese', 'english', 'math', 'social', 'natural'].flatMap((subject, i) => {
    const names = ['國文', '英文', '數學', '社會', '自然'];
    const icons = ['📜', '🔤', '📐', '🌍', '🔬'];
    const name = names[i];
    const icon = icons[i];
    return [
      { id: `sub_${subject}_1`, title: `${name}新手`, description: `${name}累積 1 小時`, icon, category: 'subject' as const, condition: (d: AppData) => getStudyTimeBySubject(d.studySessions, subject) >= 60 },
      { id: `sub_${subject}_2`, title: `${name}學徒`, description: `${name}累積 10 小時`, icon, category: 'subject' as const, condition: (d: AppData) => getStudyTimeBySubject(d.studySessions, subject) >= 600 },
      { id: `sub_${subject}_3`, title: `${name}熟手`, description: `${name}累積 50 小時`, icon, category: 'subject' as const, condition: (d: AppData) => getStudyTimeBySubject(d.studySessions, subject) >= 3000 },
      { id: `sub_${subject}_4`, title: `${name}達人`, description: `${name}累積 100 小時`, icon, category: 'subject' as const, condition: (d: AppData) => getStudyTimeBySubject(d.studySessions, subject) >= 6000 },
      { id: `sub_${subject}_5`, title: `${name}大師`, description: `${name}累積 200 小時`, icon, category: 'subject' as const, condition: (d: AppData) => getStudyTimeBySubject(d.studySessions, subject) >= 12000 },
    ];
  }),

  // Task Category (10)
  { id: 'ta1', title: '第一步', description: '完成 1 個待辦事項', icon: '✅', category: 'task', condition: d => getDailyTasks(d.tasks) >= 1 },
  { id: 'ta2', title: '十全十美', description: '完成 10 個待辦事項', icon: '📝', category: 'task', condition: d => getDailyTasks(d.tasks) >= 10 },
  { id: 'ta3', title: '任務達人', description: '完成 50 個待辦事項', icon: '📋', category: 'task', condition: d => getDailyTasks(d.tasks) >= 50 },
  { id: 'ta4', title: '百戰百勝', description: '完成 100 個待辦事項', icon: '💯', category: 'task', condition: d => getDailyTasks(d.tasks) >= 100 },
  { id: 'ta5', title: '兩百斬', description: '完成 200 個待辦事項', icon: '⚔️', category: 'task', condition: d => getDailyTasks(d.tasks) >= 200 },
  { id: 'ta6', title: '三百壯士', description: '完成 300 個待辦事項', icon: '🛡️', category: 'task', condition: d => getDailyTasks(d.tasks) >= 300 },
  { id: 'ta7', title: '四百連擊', description: '完成 400 個待辦事項', icon: '🔥', category: 'task', condition: d => getDailyTasks(d.tasks) >= 400 },
  { id: 'ta8', title: '五百里程碑', description: '完成 500 個待辦事項', icon: '🏆', category: 'task', condition: d => getDailyTasks(d.tasks) >= 500 },
  { id: 'ta9', title: '八百壯士', description: '完成 800 個待辦事項', icon: '🎖️', category: 'task', condition: d => getDailyTasks(d.tasks) >= 800 },
  { id: 'ta10', title: '千錘百鍊', description: '完成 1000 個待辦事項', icon: '👑', category: 'task', condition: d => getDailyTasks(d.tasks) >= 1000 },

  // Special Category (30)
  { id: 'sp1', title: '夜貓子 I', description: '半夜 (00:00-04:00) 讀書 1 次', icon: '🦉', category: 'special', condition: d => getSessionsByHour(d.studySessions, 0, 4).length >= 1 },
  { id: 'sp2', title: '夜貓子 II', description: '半夜 (00:00-04:00) 讀書 10 次', icon: '🦉', category: 'special', condition: d => getSessionsByHour(d.studySessions, 0, 4).length >= 10 },
  { id: 'sp3', title: '夜貓子 III', description: '半夜 (00:00-04:00) 讀書 50 次', icon: '🦉', category: 'special', condition: d => getSessionsByHour(d.studySessions, 0, 4).length >= 50 },
  
  { id: 'sp4', title: '早鳥 I', description: '清晨 (04:00-08:00) 讀書 1 次', icon: '🌅', category: 'special', condition: d => getSessionsByHour(d.studySessions, 4, 8).length >= 1 },
  { id: 'sp5', title: '早鳥 II', description: '清晨 (04:00-08:00) 讀書 10 次', icon: '🌅', category: 'special', condition: d => getSessionsByHour(d.studySessions, 4, 8).length >= 10 },
  { id: 'sp6', title: '早鳥 III', description: '清晨 (04:00-08:00) 讀書 50 次', icon: '🌅', category: 'special', condition: d => getSessionsByHour(d.studySessions, 4, 8).length >= 50 },

  { id: 'sp7', title: '週末戰士 I', description: '週末讀書 1 次', icon: '🎉', category: 'special', condition: d => getSessionsByDayOfWeek(d.studySessions, [0, 6]).length >= 1 },
  { id: 'sp8', title: '週末戰士 II', description: '週末讀書 10 次', icon: '🎉', category: 'special', condition: d => getSessionsByDayOfWeek(d.studySessions, [0, 6]).length >= 10 },
  { id: 'sp9', title: '週末戰士 III', description: '週末讀書 50 次', icon: '🎉', category: 'special', condition: d => getSessionsByDayOfWeek(d.studySessions, [0, 6]).length >= 50 },

  { id: 'sp10', title: '馬拉松 I', description: '單次讀書超過 2 小時', icon: '🏃', category: 'special', condition: d => d.studySessions.some(s => s.durationMinutes >= 120) },
  { id: 'sp11', title: '馬拉松 II', description: '單次讀書超過 3 小時', icon: '🏃‍♂️', category: 'special', condition: d => d.studySessions.some(s => s.durationMinutes >= 180) },
  { id: 'sp12', title: '馬拉松 III', description: '單次讀書超過 4 小時', icon: '🏃‍♀️', category: 'special', condition: d => d.studySessions.some(s => s.durationMinutes >= 240) },
  { id: 'sp13', title: '超級馬拉松', description: '單次讀書超過 5 小時', icon: '🏅', category: 'special', condition: d => d.studySessions.some(s => s.durationMinutes >= 300) },

  { id: 'sp14', title: '多才多藝', description: '單日讀書 3 種不同科目', icon: '🤹', category: 'special', condition: d => Object.values(getDailySubjects(d.studySessions)).some(set => set.size >= 3) },
  { id: 'sp15', title: '全能學霸', description: '單日讀書 5 種不同科目', icon: '🌈', category: 'special', condition: d => Object.values(getDailySubjects(d.studySessions)).some(set => set.size >= 5) },

  { id: 'sp16', title: '第 10 次紀錄', description: '記錄 10 次讀書', icon: '📝', category: 'special', condition: d => d.studySessions.length >= 10 },
  { id: 'sp17', title: '第 50 次紀錄', description: '記錄 50 次讀書', icon: '📚', category: 'special', condition: d => d.studySessions.length >= 50 },
  { id: 'sp18', title: '第 100 次紀錄', description: '記錄 100 次讀書', icon: '💯', category: 'special', condition: d => d.studySessions.length >= 100 },
  { id: 'sp19', title: '第 500 次紀錄', description: '記錄 500 次讀書', icon: '🔥', category: 'special', condition: d => d.studySessions.length >= 500 },
  { id: 'sp20', title: '第 1000 次紀錄', description: '記錄 1000 次讀書', icon: '👑', category: 'special', condition: d => d.studySessions.length >= 1000 },

  { id: 'sp21', title: '番茄鐘新手', description: '記錄 1 次 25 分鐘的讀書', icon: '🍅', category: 'special', condition: d => d.studySessions.some(s => s.durationMinutes === 25) },
  { id: 'sp22', title: '番茄鐘愛好者', description: '記錄 10 次 25 分鐘的讀書', icon: '🍅', category: 'special', condition: d => d.studySessions.filter(s => s.durationMinutes === 25).length >= 10 },
  { id: 'sp23', title: '番茄鐘大師', description: '記錄 50 次 25 分鐘的讀書', icon: '🍅', category: 'special', condition: d => d.studySessions.filter(s => s.durationMinutes === 25).length >= 50 },

  { id: 'sp24', title: '午餐學習', description: '中午 (12:00-13:00) 讀書 10 次', icon: '🍱', category: 'special', condition: d => getSessionsByHour(d.studySessions, 12, 13).length >= 10 },
  { id: 'sp25', title: '下午茶時光', description: '下午 (14:00-16:00) 讀書 10 次', icon: '☕', category: 'special', condition: d => getSessionsByHour(d.studySessions, 14, 16).length >= 10 },
  { id: 'sp26', title: '晚餐後的努力', description: '晚上 (18:00-20:00) 讀書 10 次', icon: '🍽️', category: 'special', condition: d => getSessionsByHour(d.studySessions, 18, 20).length >= 10 },
  { id: 'sp27', title: '黃金時段', description: '晚上 (20:00-22:00) 讀書 10 次', icon: '📺', category: 'special', condition: d => getSessionsByHour(d.studySessions, 20, 22).length >= 10 },
  { id: 'sp28', title: '深夜奮戰', description: '深夜 (22:00-00:00) 讀書 10 次', icon: '🌙', category: 'special', condition: d => getSessionsByHour(d.studySessions, 22, 24).length >= 10 },

  { id: 'sp29', title: '極速微學習', description: '記錄 1 次 5 分鐘的讀書', icon: '⚡', category: 'special', condition: d => d.studySessions.some(s => s.durationMinutes === 5) },
  { id: 'sp30', title: '均衡發展', description: '五大科目各讀滿 50 小時', icon: '⚖️', category: 'special', condition: d => ['chinese', 'english', 'math', 'social', 'natural'].every(sub => getStudyTimeBySubject(d.studySessions, sub) >= 3000) },
];

export const getUnlockedAchievements = (data: AppData): string[] => {
  return ACHIEVEMENTS.filter(a => a.condition(data)).map(a => a.id);
};
