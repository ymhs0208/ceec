import React, { useId } from 'react';
import { Check, Sparkles } from 'lucide-react';
import './TempleRitualScene.css';

interface Props {
  kind: 'lamp' | 'fortune' | 'ticket';
  phase: string;
  active?: boolean;
  busy?: boolean;
  selectedStick?: number | null;
  onPick?: (index: number) => void;
  userName?: string;
  targetSchool?: string;
}

const stages = {
  lamp: ['淨壇安燈', '引火點燈', '光明祝禱'],
  fortune: ['靜心搖籤', '隨心選籤', '展籤解意'],
  ticket: ['淨心祈願', '呈上信物', '安放敕印'],
};

const moments: Record<Props['kind'], Record<string, [string, string]>> = {
  lamp: {
    idle: ['為努力，留一盞光', '把紛亂放下，讓心慢慢明亮。'],
    prepare: ['一縷清香，安住此心', '淨壇・安燈・收攏心緒'],
    kindle: ['引一點火，照一段路', '燈芯漸暖，蓮瓣向光舒展。'],
    blessing: ['心燈長明，前程有光', '願每一份認真，都成為向前的力量。'],
  },
  fortune: {
    idle: ['把疑問，交給一支籤', '先想著心中的事，再輕輕搖籤。'],
    shake: ['竹籤輕響，心念漸定', '帶著疑問，也帶著繼續努力的心。'],
    choose: ['七支籤，一份相遇', '不必急，選擇此刻最有感的一支。'],
    reveal: ['籤已出筒，靜候籤意', '讓這份提醒，陪你走下一段路。'],
  },
  ticket: {
    idle: ['把心願，鄭重安放', '帶上名字與志願，也帶上一路的努力。'],
    purify: ['拂去不安，留下心願', '一束清光，輕輕掠過祈願信物。'],
    ascend: ['呈上信物，寄託所願', '願臨場從容，所學皆有所用。'],
    seal: ['文昌賜福，心願安放', '往後每一步，仍由你的努力寫下。'],
  },
};

/** Decorative motion stays inside the scene; payment and success are owned by the caller. */
export default function TempleRitualScene({ kind, phase, active = false, busy = false, selectedStick, onPick, userName, targetSchool }: Props) {
  const id = useId().replace(/:/g, '');
  const complete = active || phase === 'blessing' || phase === 'seal';
  const lit = kind === 'lamp' && (active || phase === 'kindle' || phase === 'blessing');
  const stage = kind === 'lamp' ? ['idle', 'prepare', 'kindle', 'blessing'].indexOf(phase) - 1
    : kind === 'fortune' ? ['idle', 'shake', 'choose', 'reveal'].indexOf(phase) - 1
    : ['idle', 'purify', 'ascend', 'seal'].indexOf(phase) - 1;
  const currentStage = active ? 2 : stage;
  const moment = moments[kind][active && phase === 'idle' ? kind === 'lamp' ? 'blessing' : 'seal' : phase] || moments[kind].idle;
  return (
    <div className={`ritual-scene ritual-${kind}`} data-phase={phase} data-lit={lit} data-complete={complete} aria-label={`${kind === 'lamp' ? '光明燈' : kind === 'fortune' ? '求籤' : '准考證'}祈福場景`} aria-busy={busy}>
      <div className="ritual-arch" aria-hidden="true"><span /><span /></div>
      <div className="ritual-sanctuary" aria-hidden="true"><div className="ritual-ceiling-lines" /><div className="ritual-lantern left"><i /><span>文</span></div><div className="ritual-lantern right"><i /><span>昌</span></div><div className="ritual-floor-lines" /></div>
      <div className="ritual-scene-top" aria-hidden="true"><span>文昌祈願</span><span>心誠・意定</span></div>
      <div key={moment[0]} className="ritual-moment"><span>{busy ? '祈願進行中' : complete ? '願心常在' : '留一刻，與自己相處'}</span><h4>{moment[0]}</h4><p>{moment[1]}</p></div>
      <svg className="ritual-cloudscape" viewBox="0 0 460 280" fill="none" aria-hidden="true">
        <g><path d="M-30 170H50c37 0 39-32 14-32-19 0-20 22-3 22h46c25 0 27-25 9-25-14 0-14 17-3 17h23M-15 184H87c31 0 35-15 58-15M-10 197h66" /><path d="M490 130h-65c-37 0-39-32-14-32 19 0 20 22 3 22h-46c-25 0-27-25-9-25 14 0 14 17 3 17h-23M475 144h-87c-31 0-35-15-58-15M470 157h-66" /></g>
      </svg>
      <div className="ritual-prayer-circle" aria-hidden="true"><span>定</span><span>慧</span><span>願</span><span>成</span></div>
      <div className="ritual-halo" aria-hidden="true" />
      <div className="ritual-light-curtain" aria-hidden="true" />
      <div className="ritual-orbit" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--orbit-angle': `${i * 30}deg`, '--i': i } as React.CSSProperties} />)}</div>
      {(phase === 'blessing' || phase === 'seal') && <div className="ritual-celebration" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--x': `${Math.cos(i * Math.PI / 9) * (60 + i % 3 * 20)}px`, '--y': `${Math.sin(i * Math.PI / 9) * (55 + i % 4 * 15)}px`, '--i': i } as React.CSSProperties} />)}</div>}
      <div className="ritual-motes" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--i': i, left: `${12 + (i * 23) % 78}%`, top: `${25 + (i * 17) % 50}%` } as React.CSSProperties} />)}</div>

      {kind === 'lamp' && <div className="ritual-lamp-art" aria-hidden="true">
        <svg viewBox="0 0 360 260" className="ritual-lamp-svg">
          <defs>
            <linearGradient id={`${id}-gold`} x1="0" x2="1"><stop stopColor="#a87b45" /><stop offset=".25" stopColor="#dec296" /><stop offset=".5" stopColor="#fae8be" /><stop offset=".8" stopColor="#d1ad73" /><stop offset="1" stopColor="#a87b45" /></linearGradient>
            <linearGradient id={`${id}-petal`} x2=".3" y2="1"><stop stopColor="#fff1ce" /><stop offset=".6" stopColor="#dec08b" /><stop offset="1" stopColor="#b5894f" /></linearGradient>
            <linearGradient id={`${id}-flame`} x2="0" y2="1"><stop stopColor="#fff7d4" /><stop offset=".4" stopColor="#f8c86e" /><stop offset="1" stopColor="#d98b45" /></linearGradient>
            <radialGradient id={`${id}-aura`}><stop stopColor="#f9d886" stopOpacity=".6" /><stop offset="1" stopColor="#f9d886" stopOpacity="0" /></radialGradient>
          </defs>
          <ellipse cx="180" cy="239" rx="94" ry="9" fill="#a28b69" opacity=".12" />
          <g className="ritual-lamp-aura"><circle cx="180" cy="110" r="94" fill={`url(#${id}-aura)`} /><circle className="ritual-lamp-ring" cx="180" cy="110" r="65" fill="none" stroke="#dbc18c" strokeWidth=".7" /><circle className="ritual-lamp-ring outer" cx="180" cy="110" r="85" fill="none" stroke="#dbc18c" strokeWidth=".6" /></g>
          <path d="M160 210 Q180 198 200 210 L208 226 Q180 235 152 226Z" fill={`url(#${id}-gold)`} stroke="#bd985e" />
          <ellipse cx="180" cy="228" rx="48" ry="7" fill={`url(#${id}-gold)`} stroke="#c5a56f" />
          <path d="M91 165 Q98 217 180 219 Q262 217 269 165Z" fill={`url(#${id}-gold)`} stroke="#ba985e" />
          {[-54, -36, -18, 0, 18, 36, 54].map((angle, i) => <g className="ritual-lotus-petal" key={angle} style={{ '--i': i } as React.CSSProperties}><path d="M180 214 C152 196 158 174 180 158 C202 174 208 196 180 214Z" transform={`rotate(${angle} 180 210)`} fill={`url(#${id}-petal)`} stroke="#bc965b" strokeWidth=".6" /></g>)}
          <ellipse cx="180" cy="166" rx="89" ry="14" fill={`url(#${id}-gold)`} stroke="#bd995f" />
          <ellipse cx="180" cy="164" rx="72" ry="8" fill="#8d6740" opacity=".5" />
          <g className="ritual-lotus-engraving" fill="none" stroke="#fff2cf" strokeWidth=".8" opacity=".65">{[-2, -1, 0, 1, 2].map(i => <path key={i} d={`M${180 + i * 23} 195 q-9 -9 0 -19 q9 10 0 19 M${180 + i * 23} 195 v6`} />)}</g>
          <path d="M180 164 Q176 148 181 137" fill="none" stroke="#705c48" strokeWidth="3" strokeLinecap="round" />
          <g className="ritual-flame"><path d="M180 149 C150 133 163 109 181 78 C182 101 205 118 196 136 Q192 147 180 149Z" fill={`url(#${id}-flame)`} /><path d="M181 147 C168 136 175 120 182 112 C182 123 194 132 188 142Z" fill="#fff9e4" /></g>
          <g className="ritual-match"><path d="M100 117 L178 144" stroke="#ab865d" strokeWidth="4" strokeLinecap="round" /><circle cx="178" cy="144" r="5" fill="#e4a35d" /><path d="M177 141 Q167 132 178 120 Q187 135 177 141" fill="#f5ce80" /></g>
          <g className="ritual-smoke" fill="none" stroke="#b9ab93" strokeWidth="1" opacity=".4"><path d="M177 135 C145 113 200 103 177 74 S179 36 186 28" /><path d="M184 139 C210 111 170 98 194 72" /></g>
          <g className="ritual-flame-sparks" fill="#d4ae61">{Array.from({ length: 7 }, (_, i) => <circle key={i} cx={156 + i * 8} cy={111 - i % 3 * 18} r={i % 2 ? 1 : 1.6} style={{ '--i': i } as React.CSSProperties} />)}</g>
          <g className="ritual-wish-trails" fill="none" stroke="#c8a05d" strokeWidth=".8"><path d="M90 213C43 163 70 78 137 56" /><path d="M270 213C317 163 290 78 223 56" /></g>
        </svg>
        <div className="ritual-scene-blessing"><Sparkles size={12} />{complete ? '一盞心燈，照亮前程' : '心靜下來，光就會亮起'}</div>
      </div>}

      {kind === 'fortune' && <>
        <div className="ritual-fortune-art" aria-hidden="true">
          <div className="ritual-bucket-shadow" />
          <div className="ritual-bucket-motion">
            <div className="ritual-bamboo-bundle">{Array.from({ length: 13 }, (_, i) => <i key={i} style={{ '--angle': `${(i - 6) * 5}deg`, '--i': i } as React.CSSProperties} />)}</div>
            <div className="ritual-bucket"><div className="ritual-bucket-rim" /><span>文<br />昌</span><div className="ritual-bucket-foot" /></div>
          </div>
        </div>
        {phase === 'choose' && <div className="ritual-stick-selection">
          <p>靜心，選一支與你有緣的籤</p>
          <div className="ritual-stick-options">{Array.from({ length: 7 }, (_, i) => <button key={i} type="button" aria-label={`抽第 ${i + 1} 支籤`} onClick={() => onPick?.(i)} style={{ '--i': i } as React.CSSProperties}><span className="ritual-pick-stick"><span>文昌</span><b>{['壹', '貳', '參', '肆', '伍', '陸', '柒'][i]}</b></span></button>)}</div>
          <small>選定後才會扣除 30 香火幣</small>
        </div>}
        {phase === 'reveal' && <><div className="ritual-fortune-wings" aria-hidden="true"><span>心有所問</span><span>靜候回響</span></div><div key={selectedStick} className="ritual-selected-stick" aria-hidden="true"><span>文昌靈籤</span><b>{['壹', '貳', '參', '肆', '伍', '陸', '柒'][selectedStick ?? 0]}</b></div></>}
        {phase !== 'choose' && <div className="ritual-scene-blessing">{phase === 'reveal' ? '一支靈籤，一份前行的提醒' : phase === 'shake' ? '輕搖籤筒，讓心慢慢安定' : '帶著心中的疑問，誠心請示'}</div>}
      </>}

      {kind === 'ticket' && <div className="ritual-ticket-art">
        <div className="ritual-offering-door left" aria-hidden="true" /><div className="ritual-offering-door right" aria-hidden="true" />
        <div className="ritual-altar" aria-hidden="true"><span /><i /></div>
        <div className="ritual-ticket-ribbon" aria-hidden="true" />
        <div className="ritual-ticket-paper">
          <div className="ritual-ticket-heading"><span>祈願信物</span><span>文昌殿</span></div>
          <h4>准考證</h4>
          <dl><div><dt>考生姓名</dt><dd>{userName}</dd></div><div><dt>目標學校</dt><dd>{targetSchool}</dd></div></dl>
          <p>願心神安定・筆下有光</p>
          <div className="ritual-ticket-stamp" aria-hidden="true">文昌<br />賜福</div>
          <div className="ritual-ticket-scan" aria-hidden="true" />
        </div>
        <div className="ritual-stamp-arrival" aria-hidden="true">文昌<br />賜福</div>
        <div className="ritual-seal-ripples" aria-hidden="true"><i /><i /><i /></div>
        <div className="ritual-scene-blessing"><Sparkles size={12} />{complete ? '祈願已安放，努力自有回響' : '把心願安放，把努力帶上考場'}</div>
      </div>}

      <div className="ritual-scene-footnote" aria-hidden="true"><i />{complete ? '祈願已留存・把祝福帶回日常' : kind === 'fortune' && phase === 'choose' ? '心之所向，便是此刻的選擇' : busy ? '慢一點，讓心願有被安放的時間' : '一念心誠・一程相伴'}<i /></div>
      <ol className="ritual-stage-track" aria-label="儀式進度">{stages[kind].map((label, i) => <li key={label} data-current={i === currentStage} data-done={i < currentStage || complete} aria-current={i === currentStage ? 'step' : undefined}><span>{i < currentStage || complete ? <Check size={10} /> : `0${i + 1}`}</span>{label}</li>)}</ol>
    </div>
  );
}
