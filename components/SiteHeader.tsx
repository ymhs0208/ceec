import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, BellRing, BookOpen, CalendarDays, ChevronDown, ExternalLink, GraduationCap, Heart, LayoutGrid, LogIn, Medal, Menu, Search, Settings, Shield, Sparkles, Trophy, UserCircle, UserRoundCheck, UsersRound, X } from 'lucide-react';
import { ActivePage } from '../utils/appRoutes';
import PageLink from './PageLink';
import './SiteHeader.css';

const groups = [
  { title: '備考規劃', items: [
    { page: 'home', label: '倒數首頁', description: '倒數與今日任務', icon: LayoutGrid },
    { page: 'schedule', label: '考試日程', description: '掌握重要日期', icon: CalendarDays },
    { page: 'announcements', label: '最新公告', description: '備考消息與提醒', icon: Sparkles },
  ] },
  { title: '學習與社群', items: [
    { page: 'learning', label: '學習歷程', description: '專注紀錄與統計', icon: BookOpen },
    { page: 'achievements', label: '勳章牆', description: '查看已解鎖成就', icon: Medal },
    { page: 'ranking', label: '排行榜', description: '全站與學校戰隊', icon: Trophy },
    { page: 'community', label: '備考社群', description: '一起累積學習時數', icon: UsersRound },
    { page: 'temple', label: '祈福神社', description: '為你的目標祈福', icon: Heart },
  ] },
  { title: '帳號與支援', items: [
    { page: 'account', label: '帳號管理', description: '登入、資料與裝置', icon: UserCircle },
    { page: 'settings', label: '個人設定', description: '調整目標與偏好', icon: Settings },
    { page: 'instructions', label: '使用說明', description: '了解網站功能', icon: BookOpen },
    { page: 'donation', label: '支持網站', description: '小額贊助與支持', icon: Heart },
    { page: 'support', label: '售後服務', description: '付款與服務協助', icon: UserCircle },
    { page: 'privacy', label: '隱私權政策', description: '資料與隱私保護', icon: Shield },
    { page: 'terms', label: '服務條款', description: '使用規範與權益', icon: Shield },
    { page: 'refund', label: '退款政策', description: '付款與退款說明', icon: Shield },
  ] },
] satisfies { title: string; items: { page: ActivePage; label: string; description: string; icon: typeof Menu }[] }[];

type Props = {
  activePage: ActivePage; examId: string; examName: string; targetSchool: string;
  isLoggedIn: boolean; userName?: string; isSyncing: boolean; onNavigate: (page: ActivePage) => void;
  pastUrl: string; pastTitle: string; scoreTitle: string;
  onScoreQuery: () => void; onExamReminder: () => void;
};

export default function SiteHeader(props: Props) {
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 16);
  const showAnnouncement = props.activePage === 'home' && !isScrolled;
  const headerRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => { setOpenGroup(null); setMobileOpen(false); };
  const navigate = (page: ActivePage) => { close(); props.onNavigate(page); };

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpenGroup(null); setMobileOpen(false); }, [props.activePage, props.examId]);
  useEffect(() => {
    const onPopState = () => { setOpenGroup(null); setMobileOpen(false); };
    // Mobile browser chrome can resize height while scrolling. Only close when
    // switching between the mobile and desktop navigation layouts.
    const desktopLayout = window.matchMedia('(min-width: 768px)');
    const onLayoutChange = () => { setOpenGroup(null); setMobileOpen(false); };
    window.addEventListener('popstate', onPopState);
    desktopLayout.addEventListener('change', onLayoutChange);
    return () => { window.removeEventListener('popstate', onPopState); desktopLayout.removeEventListener('change', onLayoutChange); };
  }, []);
  useEffect(() => {
    if (openGroup === null) return;
    const outside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpenGroup(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      triggerRefs.current[openGroup]?.focus();
      setOpenGroup(null);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [openGroup]);
  useEffect(() => {
    if (!mobileOpen) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      mobileTrigger.current?.focus();
    };
  }, [mobileOpen]);

  const pageLinks = (index: number) => groups[index].items.map(item => {
    const Icon = item.icon;
    return <PageLink key={item.page} page={item.page} examId={props.examId}
      aria-current={props.activePage === item.page ? 'page' : undefined}
      onClick={() => navigate(item.page)} className="header-page-link">
      <span className="header-link-icon"><Icon size={20} aria-hidden="true" /></span>
      <span><strong>{item.label}</strong><small>{item.description}</small></span>
      {props.activePage === item.page && <span className="header-current-dot" aria-label="目前頁面" />}
    </PageLink>;
  });
  const resources = <div className="header-resources" aria-label="考試資源">
    <p className="header-resources-heading">考試快捷入口<span>常用資訊，一步前往</span></p>
    <a href={props.pastUrl} target="_blank" rel="noopener noreferrer" aria-label={`${props.pastTitle}（另開分頁）`}><span className="header-resource-symbol"><BookOpen size={18} aria-hidden="true" /></span><strong>{props.pastTitle}</strong><small>另開分頁<ExternalLink size={9} aria-hidden="true" /></small></a>
    <button type="button" aria-label={props.scoreTitle} onClick={() => { close(); props.onScoreQuery(); }}><span className="header-resource-symbol"><Search size={18} aria-hidden="true" /></span><strong>{props.scoreTitle}</strong><small>查詢成績資訊</small></button>
    <button type="button" aria-label="應考提醒" onClick={() => { close(); props.onExamReminder(); }}><span className="header-resource-symbol"><BellRing size={18} aria-hidden="true" /></span><strong>應考提醒</strong><small>考前準備清單</small></button>
  </div>;

  return <>
    <header className={`site-header${props.activePage === 'home' ? ' has-announcement' : ''}`} ref={headerRef} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenGroup(null);
    }}>
      {props.activePage === 'home' && <div className={`header-announcement-slot${showAnnouncement ? '' : ' is-hidden'}`} inert={!showAnnouncement} aria-hidden={!showAnnouncement}>
        <div className="header-announcement-clip">
          <PageLink page="announcements" examId={props.examId} onClick={() => navigate('announcements')} className="header-announcement" tabIndex={showAnnouncement ? undefined : -1}>
            <span className="header-announcement-icon"><Bell size={17} aria-hidden="true" /></span>
            <span className="header-announcement-copy"><strong>最新公告</strong><span>簡章、重要日期與考試資訊</span></span>
            <span className="header-announcement-action">查看公告 <ArrowRight size={15} aria-hidden="true" /></span>
          </PageLink>
        </div>
      </div>}
      <nav className="header-bar" aria-label="主要導覽">
        <PageLink page="home" examId={props.examId} onClick={() => navigate('home')} className="header-brand" aria-label="大考倒數首頁">
          <img src="/apple-touch-icon.png" alt="" width="42" height="42" />
          <span><strong>大考倒數</strong><small>{props.examName}</small></span>
        </PageLink>
        <div className="header-groups">
          {groups.map((group, index) => <div key={group.title}>
            <button type="button" ref={element => { triggerRefs.current[index] = element; }}
              className={`header-group-trigger ${group.items.some(item => item.page === props.activePage) ? 'is-current' : ''}`}
              aria-expanded={openGroup === index} aria-controls={`header-group-${index}`}
              onClick={() => setOpenGroup(current => current === index ? null : index)}
              onKeyDown={event => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault(); setOpenGroup(index);
                  requestAnimationFrame(() => panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus());
                }
              }}>{group.title}<ChevronDown size={15} aria-hidden="true" /></button>
            {openGroup === index && <div id={`header-group-${index}`} className="header-dropdown" ref={panelRef}>
              <div className="header-panel-heading"><strong>{group.title}</strong><span>選擇你要前往的功能</span></div>
              <div className="header-link-grid">{pageLinks(index)}</div>
              {index === 0 && resources}
            </div>}
          </div>)}
        </div>
        <div className="header-actions">
          <PageLink page="settings" examId={props.examId} onClick={() => navigate('settings')} className="header-target" aria-label={`設定目標，目前：${props.targetSchool || '未設定'}`}><GraduationCap size={18} aria-hidden="true" /><span>{props.targetSchool || '設定目標'}</span></PageLink>
          <PageLink page="account" examId={props.examId} onClick={() => navigate('account')} className="header-account" data-logged-in={props.isLoggedIn} aria-label={props.isLoggedIn ? `已登入${props.userName ? `：${props.userName}` : ''}，開啟我的帳號` : '尚未登入，登入或註冊'} aria-current={props.activePage === 'account' ? 'page' : undefined} aria-busy={props.isSyncing || undefined}>
            {props.isLoggedIn ? <UserRoundCheck size={20} aria-hidden="true" /> : <LogIn size={20} aria-hidden="true" />}
            <span>{props.isLoggedIn ? '已登入' : '登入'}</span>
            {props.isSyncing && <i aria-hidden="true" />}
          </PageLink>
          <button type="button" className="header-mobile-trigger" ref={mobileTrigger} aria-label="開啟功能選單" aria-expanded={mobileOpen} aria-controls="header-mobile-menu" onClick={() => { setOpenGroup(null); setMobileOpen(true); }}><Menu size={22} aria-hidden="true" /></button>
        </div>
      </nav>
    </header>
    <dialog ref={dialogRef} id="header-mobile-menu" className="header-mobile-dialog" aria-labelledby="header-mobile-title" onCancel={() => setMobileOpen(false)} onClick={event => { if (event.target === event.currentTarget) setMobileOpen(false); }}>
      <div className="header-mobile-sheet">
        <div className="header-mobile-heading"><div><strong id="header-mobile-title">功能選單</strong><small>{props.examName}</small></div><button type="button" aria-label="關閉功能選單" onClick={() => setMobileOpen(false)}><X size={22} /></button></div>
        <nav aria-label="手機功能導覽" className="header-mobile-content">
          {groups.map((group, index) => <section key={group.title}><h2>{group.title}</h2><div className="header-link-grid">{pageLinks(index)}</div></section>)}
          {resources}
        </nav>
      </div>
    </dialog>
  </>;
}
