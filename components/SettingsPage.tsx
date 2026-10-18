import './SettingsPage.css';
import React, { useEffect, useMemo, useState } from 'react';
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
  isAuthenticated: boolean;
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
  sessions: { title: '清空讀書紀錄', body: '個人學習歷程與今日專注會重新開始。已同步的排行榜與社群統計仍保留；其他裝置連線同步後會套用此重置。' },
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
  isAuthenticated,
  confirmResetType,
  setConfirmResetType,
  executeReset,
}) => {
  const [section, setSection] = useState<'exam' | 'goal' | 'data'>('exam');
  const [draftTargetSchool, setDraftTargetSchool] = useState(targetSchool);
  const [draftTargetMajor, setDraftTargetMajor] = useState(targetMajor);
  const currentExam = useMemo(() => EXAM_PRESETS.find((exam) => exam.id === targetExam), [targetExam]);
  const visibleExams = useMemo(
    () => EXAM_PRESETS.filter((exam) => exam.category === selectedCategory).sort((a, b) => b.year - a.year),
    [selectedCategory],
  );
  const dailyGoalHours = Math.floor(dailyGoal / 60);
  const dailyGoalMinutes = dailyGoal % 60;
  const selectedTvet = TVET_CATEGORIES.find((category) => category.id === tvetCategory);
  const hasTargetChanges = draftTargetSchool !== targetSchool || draftTargetMajor !== targetMajor;

  useEffect(() => {
    setDraftTargetSchool(targetSchool);
    setDraftTargetMajor(targetMajor);
  }, [targetMajor, targetSchool]);

  const saveTarget = () => {
    setTargetSchool(draftTargetSchool.trim());
    setTargetMajor(draftTargetMajor.trim());
  };

  const chooseExam = (exam: ExamPreset) => {
    if (exam.id === targetExam) return;
    if (isAuthenticated && currentExam && currentExam.category !== exam.category) {
      setPendingExamSwitch(exam);
      return;
    }
    setTargetExam(exam.id);
    setTargetDateStr(exam.date);
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="settings-shell">
        <button className="settings-back" onClick={onClose}><ArrowLeft size={15} />回到首頁</button>
        <header className="settings-hero">
          <div><p className="settings-eyebrow"><Settings size={14} /> MAKE IT YOURS</p><h1>個人設定<span>。</span></h1><p className="settings-intro">把想抵達的地方，和每天前進的節奏，設定成你的樣子。</p></div>
          <div className="settings-overview"><TopPill label="目前考試" value={currentExam?.shortName || '未設定'} /><TopPill label="目標學校" value={targetSchool || '未填寫'} /><TopPill label="每日專注" value={`${dailyGoalHours > 0 ? `${dailyGoalHours} 小時 ` : ''}${dailyGoalMinutes > 0 ? `${dailyGoalMinutes} 分` : ''}`} /></div>
        </header>
        <nav className="settings-nav" aria-label="個人設定分類">
          <SectionButton active={section === 'exam'} icon={<CalendarDays size={17} />} title="考試設定" desc="考試與倒數日期" onClick={() => setSection('exam')} />
          <SectionButton active={section === 'goal'} icon={<Target size={17} />} title="目標與節奏" desc="學校與每日專注" onClick={() => setSection('goal')} />
          <SectionButton active={section === 'data'} icon={<Shield size={17} />} title="資料管理" desc="整理與重新開始" onClick={() => setSection('data')} />
        </nav>
        <div className="settings-layout">
          <div className="settings-content" role="region" aria-label={section === 'exam' ? '考試設定' : section === 'goal' ? '目標與節奏' : '資料管理'}>
            {section === 'exam' && (
              <div className="space-y-6 animate-fade-in">
                <SettingsBlock title="選擇考試" desc="選擇你的備考舞台，再挑選考試年份。">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {categories.map((category) => {
                      const active = selectedCategory === category.id;
                      const tone = toneClasses[category.tone];
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          aria-pressed={active}
                          className={`settings-category rounded-2xl border px-4 py-3 text-sm font-black transition-all ${active ? `${tone.active} shadow-md` : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'}`}
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
                          aria-pressed={active}
                          className={`settings-exam-card rounded-2xl border-2 p-4 text-left transition-all ${active ? `${tone.active} shadow-md` : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className={`text-2xl font-black ${active ? tone.text : 'text-slate-800'}`}>{exam.year} 年</div>
                              <div className="mt-1 text-xs font-bold text-slate-400">{exam.name}</div>
                              <p className="settings-exam-date">{exam.date.split('T')[0].replaceAll('-', '/')}</p>
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
                      aria-label="考試日期"
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
                <SettingsBlock title="備考目標" desc="先編輯目標學校與科系，按下儲存後才會更新首頁、計時器與祈願功能。">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="settings-field"><span>目標學校</span><IconInput icon={<GraduationCap className="h-5 w-5" />}>
                      <input
                        type="text"
                        value={draftTargetSchool}
                        maxLength={20}
                        onChange={(event) => setDraftTargetSchool(event.target.value)}
                        className="w-full bg-transparent py-3.5 pl-12 pr-4 text-sm font-bold text-slate-800 outline-none"
                        aria-label="目標學校"
                        placeholder={currentExam?.category === 'cap' ? '目標學校，例如：建國中學' : '目標學校，例如：國立臺灣大學'}
                      />
                    </IconInput></label>
                    <label className="settings-field"><span>目標科系或班別</span><IconInput icon={<Search className="h-5 w-5" />}>
                      <input
                        type="text"
                        value={draftTargetMajor}
                        maxLength={20}
                        onChange={(event) => setDraftTargetMajor(event.target.value)}
                        className="w-full bg-transparent py-3.5 pl-12 pr-4 text-sm font-bold text-slate-800 outline-none"
                        aria-label="目標科系或班別"
                        placeholder={currentExam?.category === 'cap' ? '目標科別或班別（選填）' : '目標科系，例如：醫學系'}
                      />
                    </IconInput></label>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-3">
                    {hasTargetChanges && <span className="text-xs font-bold text-amber-600">尚有未儲存的修改</span>}
                    <button
                      type="button"
                      onClick={saveTarget}
                      disabled={!hasTargetChanges}
                      className="settings-save inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200/70 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      儲存目標
                    </button>
                  </div>
                </SettingsBlock>

                <SettingsBlock title="每日讀書目標" desc="設定一個真的做得到的每日專注時間。太高不一定比較好，穩定比較重要。">
                  <div className="settings-daily-goal rounded-[1.5rem] border border-orange-100 bg-orange-50/70 p-5">
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
                          aria-label="每日讀書目標（分鐘）"
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
                    <div className="settings-reset-confirm rounded-[1.5rem] border border-red-100 bg-red-50 p-5">
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
          </div>
        </div>
      </div>
    </div>
  );
};

const TopPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="settings-overview-item"><span>{label}</span><strong title={value}>{value}</strong></div>
);

const SectionButton: React.FC<{ active: boolean; icon: React.ReactNode; title: string; desc: string; onClick: () => void }> = ({ active, icon, title, desc, onClick }) => (
  <button onClick={onClick} aria-pressed={active}><span className="settings-nav-icon">{icon}</span><span><strong>{title}</strong><small>{desc}</small></span><ChevronRight size={14} /></button>
);

const SettingsBlock: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <section className="settings-block"><div className="settings-block-heading"><h2>{title}</h2><p>{desc}</p></div>{children}</section>
);

const IconInput: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="settings-input"><span>{icon}</span>{children}</div>
);

const ResetButton: React.FC<{ icon: React.ReactNode; title: string; desc: string; onClick: () => void }> = ({ icon, title, desc, onClick }) => (
  <button onClick={onClick} className="settings-reset-button"><span className="settings-reset-icon">{icon}</span><span><strong>{title}</strong><small>{desc}</small></span><ChevronRight size={16} /></button>
);

export default SettingsPage;
