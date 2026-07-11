import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Flame,
  GraduationCap,
  LayoutGrid,
  Search,
  Settings,
  Shield,
  Target,
} from 'lucide-react';
import { EXAM_PRESETS, ExamPreset, TVET_CATEGORIES } from '../constants';

interface SettingsPageProps {
  onClose: () => void;
  targetExam: string;
  setTargetExam: React.Dispatch<React.SetStateAction<string>>;
  targetDateStr: string;
  setTargetDateStr: React.Dispatch<React.SetStateAction<string>>;
  targetSchool: string;
  setTargetSchool: React.Dispatch<React.SetStateAction<string>>;
  targetMajor: string;
  setTargetMajor: React.Dispatch<React.SetStateAction<string>>;
  dailyGoal: number;
  setDailyGoal: React.Dispatch<React.SetStateAction<number>>;
  tvetCategory: string;
  setIsTvetCategoryModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCategory: string;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  setPendingExamSwitch: React.Dispatch<React.SetStateAction<ExamPreset | null>>;
  confirmResetType: 'tasks' | 'sessions' | 'dates' | null;
  setConfirmResetType: React.Dispatch<React.SetStateAction<'tasks' | 'sessions' | 'dates' | null>>;
  executeReset: () => void;
}

const categories = [
  { id: 'gsat', name: '學測', tone: 'indigo' },
  { id: 'cap', name: '會考', tone: 'teal' },
  { id: 'tvet', name: '統測', tone: 'orange' },
  { id: 'ast', name: '分科', tone: 'rose' },
];

const toneClasses: Record<string, { active: string; badge: string; text: string }> = {
  indigo: { active: 'border-indigo-300 bg-indigo-50 text-indigo-800 shadow-indigo-100', badge: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-700' },
  teal: { active: 'border-teal-300 bg-teal-50 text-teal-800 shadow-teal-100', badge: 'bg-teal-100 text-teal-700', text: 'text-teal-700' },
  orange: { active: 'border-orange-300 bg-orange-50 text-orange-800 shadow-orange-100', badge: 'bg-orange-100 text-orange-700', text: 'text-orange-700' },
  rose: { active: 'border-rose-300 bg-rose-50 text-rose-800 shadow-rose-100', badge: 'bg-rose-100 text-rose-700', text: 'text-rose-700' },
};

const resetCopy = {
  tasks: { title: '清空任務清單', body: '所有待辦事項會被移除，但讀書紀錄會保留。' },
  sessions: { title: '清空讀書紀錄', body: '學習歷程、今日專注、排行榜相關統計會重新開始。' },
  dates: { title: '清空重要日程', body: '你自訂的活動與提醒日期會被移除。' },
};

const SettingsPage: React.FC<SettingsPageProps> = ({
  onClose,
  targetExam,
  setTargetExam,
  targetDateStr,
  setTargetDateStr,
  targetSchool,
  setTargetSchool,
  targetMajor,
  setTargetMajor,
  dailyGoal,
  setDailyGoal,
  tvetCategory,
  setIsTvetCategoryModalOpen,
  selectedCategory,
  setSelectedCategory,
  setPendingExamSwitch,
  confirmResetType,
  setConfirmResetType,
  executeReset,
}) => {
  const [section, setSection] = useState<'exam' | 'goal' | 'data'>('exam');
  const currentExam = useMemo(() => EXAM_PRESETS.find((exam) => exam.id === targetExam), [targetExam]);
  const visibleExams = useMemo(
    () => EXAM_PRESETS.filter((exam) => exam.category === selectedCategory).sort((a, b) => b.year - a.year),
    [selectedCategory],
  );
  const dailyGoalHours = Math.floor(dailyGoal / 60);
  const dailyGoalMinutes = dailyGoal % 60;
  const selectedTvet = TVET_CATEGORIES.find((category) => category.id === tvetCategory);

  const chooseExam = (exam: ExamPreset) => {
    if (exam.id === targetExam) return;
    if (currentExam && currentExam.category !== exam.category) {
      setPendingExamSwitch(exam);
      return;
    }
    setTargetExam(exam.id);
    setTargetDateStr(exam.date);
  };

  return (
    <div className="animate-fade-in">
      <div className="relative flex min-h-[calc(100vh-11rem)] w-full flex-col gap-6">
        <header className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-xl sm:p-8">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-900 via-indigo-500 to-emerald-400" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={onClose}
                className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900"
                title="返回首頁"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-700">
                  <Settings className="h-4 w-4" />
                  Personal Settings
                </p>
                <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">個人設定</h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                  把考試、目標與每日讀書節奏整理在同一頁。這裡的設定會影響倒數、計時器與學習紀錄的呈現。
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
              <TopPill label="考試" value={currentExam?.shortName || '未設定'} />
              <TopPill label="目標" value={targetSchool || '未填寫'} />
              <TopPill label="每日" value={`${dailyGoalHours}h ${dailyGoalMinutes}m`} />
            </div>
          </div>
        </header>

        <div className="grid flex-grow gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-[1.5rem] border border-white/70 bg-white/85 p-3 shadow-xl shadow-slate-200/60 backdrop-blur-xl">
              <SectionButton active={section === 'exam'} icon={<CalendarDays className="h-4 w-4" />} title="考試設定" desc="類別、年份與日期" onClick={() => setSection('exam')} />
              <SectionButton active={section === 'goal'} icon={<Target className="h-4 w-4" />} title="目標與節奏" desc="學校、科系、每日目標" onClick={() => setSection('goal')} />
              <SectionButton active={section === 'data'} icon={<Shield className="h-4 w-4" />} title="資料管理" desc="重置與清理" onClick={() => setSection('data')} />
            </div>
          </aside>

          <div className="sticky top-3 z-30 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/95 p-2 shadow-lg shadow-slate-200/60 backdrop-blur-xl lg:hidden">
            <div className="grid grid-cols-3 gap-2">
              <MobileSection active={section === 'exam'} label="考試" icon={<CalendarDays className="h-4 w-4" />} onClick={() => setSection('exam')} />
              <MobileSection active={section === 'goal'} label="目標" icon={<Target className="h-4 w-4" />} onClick={() => setSection('goal')} />
              <MobileSection active={section === 'data'} label="資料" icon={<Shield className="h-4 w-4" />} onClick={() => setSection('data')} />
            </div>
          </div>

          <main className="min-w-0 rounded-[1.5rem] border border-white/70 bg-slate-50/80 p-4 shadow-xl shadow-slate-200/60 backdrop-blur-xl sm:p-6 xl:p-8">
            {section === 'exam' && (
              <div className="space-y-6 animate-fade-in">
                <SettingsBlock title="選擇考試" desc="先選考試類型，再選年份。若切換到不同考試類型，系統會先請你確認。">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {categories.map((category) => {
                      const active = selectedCategory === category.id;
                      const tone = toneClasses[category.tone];
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`rounded-2xl border px-4 py-3 text-sm font-black transition-all ${active ? `${tone.active} shadow-md` : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'}`}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleExams.map((exam) => {
                      const active = targetExam === exam.id;
                      const category = categories.find((item) => item.id === exam.category) || categories[0];
                      const tone = toneClasses[category.tone];
                      return (
                        <button
                          key={exam.id}
                          onClick={() => chooseExam(exam)}
                          className={`rounded-2xl border-2 p-4 text-left transition-all ${active ? `${tone.active} shadow-md` : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className={`text-2xl font-black ${active ? tone.text : 'text-slate-800'}`}>{exam.year} 年</div>
                              <div className="mt-1 text-xs font-bold text-slate-400">{exam.name}</div>
                            </div>
                            {active && <CheckCircle2 className={`h-5 w-5 ${tone.text}`} />}
                          </div>
                          <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${exam.isEstimated ? 'bg-amber-100 text-amber-700' : tone.badge}`}>
                            {exam.isEstimated ? '預計日期' : '正式日期'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </SettingsBlock>

                {(targetExam === '116tvet' || targetExam === '115tvet') && (
                  <SettingsBlock title="統測群類" desc="選擇統測群類後，計時與提醒會更貼近你的考試內容。">
                    <button
                      onClick={() => setIsTvetCategoryModalOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition-all hover:border-indigo-200 hover:shadow-md"
                    >
                      <div>
                        <div className="text-xs font-black text-slate-400">目前群類</div>
                        <div className="mt-1 font-black text-slate-900">{selectedTvet ? `${selectedTvet.id} ${selectedTvet.name}` : '尚未選擇群類'}</div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </button>
                  </SettingsBlock>
                )}

                <SettingsBlock title="考試日期" desc="如需自訂倒數日期，可以在這裡調整。">
                  <IconInput icon={<Clock className="h-5 w-5" />}>
                    <input
                      type="datetime-local"
                      value={targetDateStr}
                      onChange={(event) => event.target.value && setTargetDateStr(event.target.value)}
                      className="w-full bg-transparent py-3.5 pl-12 pr-4 text-sm font-bold text-slate-800 outline-none"
                    />
                  </IconInput>
                </SettingsBlock>
              </div>
            )}

            {section === 'goal' && (
              <div className="space-y-6 animate-fade-in">
                <SettingsBlock title="備考目標" desc="把目標學校與科系填進來，首頁、計時器與祈願功能都會圍繞這個目標。">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <IconInput icon={<GraduationCap className="h-5 w-5" />}>
                      <input
                        type="text"
                        value={targetSchool}
                        maxLength={20}
                        onChange={(event) => setTargetSchool(event.target.value)}
                        className="w-full bg-transparent py-3.5 pl-12 pr-4 text-sm font-bold text-slate-800 outline-none"
                        placeholder="目標學校，例如：國立臺灣大學"
                      />
                    </IconInput>
                    <IconInput icon={<Search className="h-5 w-5" />}>
                      <input
                        type="text"
                        value={targetMajor}
                        maxLength={20}
                        onChange={(event) => setTargetMajor(event.target.value)}
                        className="w-full bg-transparent py-3.5 pl-12 pr-4 text-sm font-bold text-slate-800 outline-none"
                        placeholder="目標科系，例如：醫學系"
                      />
                    </IconInput>
                  </div>
                </SettingsBlock>

                <SettingsBlock title="每日讀書目標" desc="設定一個真的做得到的每日專注時間。太高不一定比較好，穩定比較重要。">
                  <div className="rounded-[1.5rem] border border-orange-100 bg-orange-50/70 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-black text-orange-700">
                          <Flame className="h-5 w-5" />
                          每日目標
                        </div>
                        <p className="mt-1 text-xs font-semibold text-orange-700/70">完成後會更新今日專注與連續紀錄。</p>
                      </div>
                      <div className="rounded-2xl border border-orange-100 bg-white px-4 py-2 text-orange-700 shadow-sm">
                        <span className="text-2xl font-black">{dailyGoalHours}</span>
                        <span className="ml-1 text-xs font-black">hr</span>
                        <span className="ml-2 text-2xl font-black">{dailyGoalMinutes}</span>
                        <span className="ml-1 text-xs font-black">min</span>
                      </div>
                    </div>
                    <div className="mt-5">
                      <div className="relative flex h-8 items-center">
                        <div className="absolute inset-x-0 h-2 rounded-full bg-white" />
                        <div
                          className="absolute left-0 h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500"
                          style={{ width: `${((dailyGoal - 30) / (600 - 30)) * 100}%` }}
                        />
                        <input
                          type="range"
                          min="30"
                          max="600"
                          step="10"
                          value={dailyGoal}
                          onChange={(event) => setDailyGoal(Number(event.target.value))}
                          className="slider-thumb-custom absolute inset-0 z-10 w-full cursor-pointer appearance-none bg-transparent"
                        />
                      </div>
                      <div className="mt-3 flex justify-between text-xs font-black text-orange-700/60">
                        <span>30m</span>
                        <span>10h</span>
                      </div>
                    </div>
                  </div>
                </SettingsBlock>
              </div>
            )}

            {section === 'data' && (
              <div className="space-y-6 animate-fade-in">
                {confirmResetType ? (
                  <SettingsBlock title={resetCopy[confirmResetType].title} desc={resetCopy[confirmResetType].body}>
                    <div className="rounded-[1.5rem] border border-red-100 bg-red-50 p-5">
                      <div className="flex gap-3">
                        <AlertTriangle className="mt-1 h-5 w-5 flex-shrink-0 text-red-500" />
                        <div>
                          <div className="font-black text-red-700">這個動作無法直接復原</div>
                          <p className="mt-1 text-sm font-semibold leading-relaxed text-red-600/80">確認前請先確定這些資料已經不需要了。</p>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <button onClick={executeReset} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-100 transition-all hover:bg-red-700">
                          確認清空
                        </button>
                        <button onClick={() => setConfirmResetType(null)} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900">
                          取消
                        </button>
                      </div>
                    </div>
                  </SettingsBlock>
                ) : (
                  <SettingsBlock title="資料管理" desc="只清除你選擇的資料，不會影響其他設定。">
                    <div className="grid grid-cols-1 gap-3">
                      <ResetButton icon={<ClipboardCheck className="h-5 w-5" />} title="重置任務清單" desc="清空所有待辦事項" onClick={() => setConfirmResetType('tasks')} />
                      <ResetButton icon={<Clock className="h-5 w-5" />} title="重置讀書紀錄" desc="清空學習歷程與專注統計" onClick={() => setConfirmResetType('sessions')} />
                      <ResetButton icon={<CalendarDays className="h-5 w-5" />} title="重置重要日程" desc="清空自訂活動與提醒" onClick={() => setConfirmResetType('dates')} />
                    </div>
                  </SettingsBlock>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

const TopPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0 rounded-2xl border border-slate-100 bg-white/80 px-3 py-3 text-center shadow-sm">
    <div className="truncate text-lg font-black text-slate-900">{value}</div>
    <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
  </div>
);

const SectionButton: React.FC<{ active: boolean; icon: React.ReactNode; title: string; desc: string; onClick: () => void }> = ({ active, icon, title, desc, onClick }) => (
  <button onClick={onClick} className={`mb-1.5 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${active ? 'border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm' : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900'}`}>
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">{icon}</span>
    <span>
      <span className="block text-sm font-black">{title}</span>
      <span className="block text-xs font-semibold opacity-70">{desc}</span>
    </span>
  </button>
);

const MobileSection: React.FC<{ active: boolean; label: string; icon: React.ReactNode; onClick: () => void }> = ({ active, label, icon, onClick }) => (
  <button onClick={onClick} className={`min-h-[58px] rounded-2xl px-2.5 py-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${active ? 'bg-slate-950 text-white shadow-lg shadow-slate-300/60' : 'bg-white text-slate-500 border border-slate-200 shadow-sm'}`}>
    {icon}
    <span className="text-xs font-black leading-none">{label}</span>
  </button>
);

const SettingsBlock: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-5">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{desc}</p>
    </div>
    {children}
  </section>
);

const IconInput: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="relative rounded-[1.25rem] border-2 border-slate-100 bg-slate-50 transition-all focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-md hover:border-slate-200">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
    {children}
  </div>
);

const ResetButton: React.FC<{ icon: React.ReactNode; title: string; desc: string; onClick: () => void }> = ({ icon, title, desc, onClick }) => (
  <button onClick={onClick} className="group flex w-full items-center justify-between rounded-[1.25rem] border-2 border-slate-100 bg-white p-4 text-left transition-all hover:border-red-200 hover:bg-red-50 hover:shadow-md">
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 shadow-sm transition-all group-hover:border-red-600 group-hover:bg-red-500 group-hover:text-white">
        {icon}
      </div>
      <div>
        <div className="text-base font-black text-slate-700 group-hover:text-red-700">{title}</div>
        <div className="mt-0.5 text-xs font-semibold text-slate-400">{desc}</div>
      </div>
    </div>
    <ChevronRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-red-500" />
  </button>
);

export default SettingsPage;
