import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Backpack, Ban, Book, Check, CheckCircle2, ClipboardCheck, Clock, Laptop, MapPin, ScrollText, Shield, Smartphone } from 'lucide-react';
import PageLink from './PageLink';
import './ExamChecklistPage.css';

interface Props {
  examId: string;
  onBack: () => void;
  checkedItems: Record<string, boolean>;
  onCheckChange: (items: Record<string, boolean>) => void;
}

export default function ExamChecklistPage({ examId, onBack, checkedItems, onCheckChange }: Props) {
  const [activeTab, setActiveTab] = useState<'items' | 'prohibited' | 'rules'>('items');
  const mustBringItems = [
    { id: 'id_card', title: '身分證明文件', detail: '國民身分證、有效期限內護照、健保卡或駕照等可辨識身分的正本。' },
    { id: 'admission_ticket', title: '准考證與試場資訊', detail: '確認准考證號碼、試場、座位與交通時間，建議截圖或列印備份。' },
    { id: 'pencil', title: '2B 鉛筆', detail: '準備 2 支以上，筆芯不要太短，答案卡劃記要清楚。' },
    { id: 'eraser', title: '橡皮擦', detail: '選乾淨、容易擦拭且不易留下屑屑的橡皮擦。' },
    { id: 'pen', title: '黑色墨水筆', detail: '非選題或簽名使用，建議 0.5mm 至 0.7mm，至少準備 2 支。' },
    { id: 'correction', title: '修正帶或修正液', detail: '依當年度簡章規定使用，帶去前先確認能正常出帶或出液。' },
    { id: 'ruler', title: '透明文具與尺', detail: '透明墊板、直尺、圓規等以簡章允許項目為準，不帶有公式或文字。' },
    { id: 'watch', title: '簡易手錶', detail: '只能看時間，不能有通訊、計算、記憶、鬧鈴或智慧功能。' },
  ];

  const prohibitedItems = [
    { icon: Smartphone, title: '手機與穿戴裝置', detail: '手機、智慧手錶、智慧手環、耳機等電子通訊設備請關機並依規定放置。' },
    { icon: Clock, title: '會發聲的計時器', detail: '有鬧鈴、震動、計算、記憶或通訊功能的裝置都不要帶到座位。' },
    { icon: Laptop, title: '電子設備', detail: '平板、筆電、電子字典、計算機與任何可儲存資料的設備均避免攜入。' },
    { icon: Book, title: '非考試用品', detail: '課本、講義、小抄、便條紙、公式表與未經允許的紙張不可放在座位。' },
  ];

  const ruleGroups = [
    {
      title: '進場前',
      icon: MapPin,
      tone: 'text-indigo-700 bg-indigo-50 border-indigo-100',
      items: ['提前到考場，先找教室、廁所與休息區。', '入場前再次確認證件、准考證、文具與手錶。', '把手機完全關機，依考場指示放置。'],
    },
    {
      title: '開始作答',
      icon: ClipboardCheck,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-100',
      items: ['鈴聲響後再作答，不要提前翻閱或書寫。', '先檢查答案卡、答案卷、座位貼條與准考證號碼是否一致。', '若資料不符或試題缺漏，立刻舉手請監試人員處理。'],
    },
    {
      title: '考試中',
      icon: Shield,
      tone: 'text-amber-700 bg-amber-50 border-amber-100',
      items: ['不要交談、傳遞物品或做出可能被誤會的動作。', '需要協助時舉手，不自行離座或翻找包包。', '注意答案卡劃記與非選題書寫位置，避免寫錯欄位。'],
    },
    {
      title: '交卷離場',
      icon: CheckCircle2,
      tone: 'text-sky-700 bg-sky-50 border-sky-100',
      items: ['依規定時間與監試人員指示交卷。', '離場前確認答案卡、答案卷與試題本是否依規定處理。', '離開考場後再查看手機或討論答案。'],
    },
  ];

  const handleCheck = (id: string, checked: boolean) => {
    onCheckChange({ ...checkedItems, [id]: checked });
  };
  const checkedCount = mustBringItems.filter(item => checkedItems[item.id]).length;
  const progress = Math.round((checkedCount / mustBringItems.length) * 100);


  const tabs = [
    { id: 'items', label: '必帶清單', icon: Backpack },
    { id: 'prohibited', label: '禁止攜帶', icon: Ban },
    { id: 'rules', label: '應考流程', icon: ScrollText },
  ] as const;

  return <main id="main-content" className="exam-checklist-page relative z-10">
    <PageLink page="home" examId={examId} onClick={onBack} className="exam-checklist-back"><ArrowLeft size={15} />回到首頁</PageLink>
    <header className="exam-checklist-hero">
      <div><p className="exam-checklist-eyebrow">EXAM READY</p><h1>考前檢查暨<br className="exam-checklist-break" />應考注意事項<span>。</span></h1><p>把物品準備好，把規則再確認。<br />出發前，一起完成最後一次檢查。</p></div>
      <div className="exam-checklist-progress"><span><ClipboardCheck size={18} /> 必帶物品準備進度</span><strong>{checkedCount}<small> / {mustBringItems.length}</small></strong><div role="progressbar" aria-label="必帶物品準備進度" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><p aria-live="polite">{progress === 100 ? '物品都確認好了，出發前再檢查一次。' : `還有 ${mustBringItems.length - checkedCount} 項待確認，準備好就勾選。`}</p></div>
    </header>
    <div className="exam-checklist-layout">
      <section className="exam-checklist-content" aria-label="考前準備">
        <div className="exam-checklist-tabs" aria-label="檢查分類">{tabs.map(({id, label, icon: Icon}) => <button key={id} type="button" aria-pressed={activeTab === id} aria-controls="exam-checklist-panel" onClick={() => setActiveTab(id)}><Icon size={17} />{label}</button>)}</div>
        <section id="exam-checklist-panel" className="exam-checklist-panel" aria-labelledby="exam-checklist-section-title">
          <div className="exam-checklist-section-heading"><h2 id="exam-checklist-section-title">{tabs.find(tab => tab.id === activeTab)?.label}</h2><span>{activeTab === 'items' ? '準備一項，勾選一項' : '提前確認，安心應考'}</span></div>
          {activeTab === 'items' && <div className="exam-checklist-items">{mustBringItems.map(item => <label key={item.id} className={`exam-checklist-item${checkedItems[item.id] ? ' is-checked' : ''}`}><input type="checkbox" checked={!!checkedItems[item.id]} onChange={event => handleCheck(item.id, event.target.checked)} /><span className="exam-checklist-checkbox" aria-hidden="true"><Check size={15} /></span><span><strong>{item.title}</strong><span>{item.detail}</span></span></label>)}</div>}
          {activeTab === 'prohibited' && <><div className="exam-checklist-warning"><Ban size={20} /><div><h3>進考場前，先處理電子設備。</h3><p>不確定能不能帶的物品，先不要放在座位。手機與電子設備請依簡章與監試人員指示關機、放置。</p></div></div><div className="exam-checklist-items">{prohibitedItems.map(({icon: Icon, title, detail}) => <article className="exam-checklist-info" key={title}><Icon size={22} /><h3>{title}</h3><p>{detail}</p></article>)}</div></>}
          {activeTab === 'rules' && <div className="exam-checklist-items">{ruleGroups.map(({title, icon: Icon, items}, index) => <section key={title} className="exam-checklist-rule"><div><span>0{index + 1}</span><Icon size={19} /></div><h3>{title}</h3><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></section>)}</div>}
        </section>
      </section>
      <aside className="exam-checklist-aside"><span className="exam-checklist-aside-icon"><Shield size={23} strokeWidth={1.5} /></span><p className="exam-checklist-eyebrow">BEFORE YOU GO</p><h2>準備周全，<br />留一點從容給自己。</h2><p>證件、文具與時間，是出發前的三個重點。先確認試場與交通，也記得為自己預留休息時間。</p><div><CheckCircle2 size={15} /><span>實際規定以當年度簡章、准考證背面及考場公告為準。</span></div><PageLink page="home" examId={examId} onClick={onBack}>完成檢查，回到首頁 <ArrowRight size={15} /></PageLink></aside>
    </div>
  </main>;
}
