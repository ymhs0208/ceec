import { Flame, ScrollText, Ticket } from 'lucide-react';

export default function TempleRitualKeepsake({ kind, userName = '考生', targetSchool = '心中的理想學校' }: {
  kind: 'lamp' | 'fortune' | 'ticket'; userName?: string; targetSchool?: string;
}) {
  const content = {
    lamp: { icon: Flame, eyebrow: 'A LIGHT FOR YOUR JOURNEY', title: '心燈已亮，前路有光', note: '願你讀書時思緒清明，迎考時心有所定。', seal: '光明' },
    fortune: { icon: ScrollText, eyebrow: 'A WORD TO WALK WITH', title: '把這一籤，帶進下一步', note: '把籤意留在心中，也為今天的努力留一點鼓勵。', seal: '靜心' },
    ticket: { icon: Ticket, eyebrow: 'YOUR WISH, SAFELY PLACED', title: '心願安放，靜候花開', note: '願你帶著累積的努力，從容走進考場。', seal: '祈願' },
  }[kind];
  const Icon = content.icon;
  return <div className={`ritual-keepsake ritual-keepsake-${kind}`}>
    <div className="ritual-keepsake-edge" aria-hidden="true" />
    <div className="ritual-keepsake-icon" aria-hidden="true"><Icon size={19} /></div>
    <p className="ritual-keepsake-eyebrow">{content.eyebrow}</p>
    <h4>{content.title}</h4>
    <p className="ritual-keepsake-dedication">為 <strong>{userName?.trim() || '考生'}</strong> 的{kind === 'lamp' ? '一盞心燈' : kind === 'ticket' ? '一份祈願' : '一段提醒'}</p>
    <p className="ritual-keepsake-school">向著 {targetSchool?.trim() || '心中的理想學校'}，穩穩前進。</p>
    <p className="ritual-keepsake-note">{content.note}</p>
    <span className="ritual-keepsake-seal" aria-hidden="true">{content.seal}</span>
    <span className="ritual-keepsake-foot">文昌祈願・致努力前行的你</span>
  </div>;
}
