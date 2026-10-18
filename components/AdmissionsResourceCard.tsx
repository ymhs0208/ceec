import React from 'react';
import { ArrowUpRight, CalendarDays, FileText, GraduationCap, Route } from 'lucide-react';
import './AdmissionsResourceCard.css';

interface Props {
  year: number;
  category: string;
  resource: { href: string; badge: string; title: string; description: string; action: string };
}

export default function AdmissionsResourceCard({ year, category, resource }: Props) {
  const topics = category === 'tvet' ? ['甄選入學', '登記分發', '簡章資訊']
    : category === 'ast' ? ['分發入學', '重要日期', '簡章公告']
    : ['入學管道', '重要日期', '簡章公告'];
  const icons = [Route, CalendarDays, FileText];
  return (
    <a className="admissions-card" href={resource.href} target="_blank" rel="noopener noreferrer">
      <div className="admissions-illustration" aria-hidden="true">
        <div className="admissions-orbit" />
        <div className="admissions-calendar">
          <span className="admissions-binding"><i /><i /></span>
          <span className="admissions-calendar-label">升學手帖</span>
          <strong>{year}</strong><span className="admissions-calendar-year">學年度</span>
          <span className="admissions-calendar-rule" />
          <span className="admissions-calendar-dots">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</span>
        </div>
        <span className="admissions-cap"><GraduationCap size={23} strokeWidth={1.5} /></span>
      </div>
      <div className="admissions-copy">
        <div className="admissions-eyebrow"><span>{resource.badge}</span><small>下一站，大學</small></div>
        <h3>{resource.title}</h3>
        <p>{resource.description}</p>
        <ul className="admissions-topics" aria-label="資源內容">{topics.map((topic, index) => {
          const Icon = icons[index];
          return <li key={topic}><Icon size={13} strokeWidth={1.6} aria-hidden="true" />{topic}</li>;
        })}</ul>
      </div>
      <div className="admissions-action">
        <span className="admissions-action-button">{resource.action}<ArrowUpRight size={17} aria-hidden="true" /></span>
        <small>升學資訊站 · 在新分頁開啟</small>
      </div>
    </a>
  );
}
