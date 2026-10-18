import React, { useId } from 'react';
import './FocusBackdrop.css';

const palettes: Record<string, [string, string, string]> = {
  morning: ['#f8f1e6', '#e8d9ca', '#cfad8b'],
  midnight: ['#101d35', '#203c56', '#79a8bd'],
  forest: ['#112e2b', '#31534a', '#86a99a'],
  sunset: ['#412a39', '#a46151', '#efb990'],
  nebula: ['#211c3b', '#493958', '#ac87bb'],
  zen: ['#faf8f3', '#ece8df', '#bcb4a7'],
  aurora: ['#102937', '#243c55', '#7dbaaa'],
  ocean: ['#102d43', '#28586a', '#8fbdc9'],
  cyberpunk: ['#27223e', '#57374e', '#c585a8'],
  breeze: ['#eef4ec', '#d9e7d9', '#9bbda4'],
  lofi: ['#322d40', '#62505b', '#c7a58c'],
  starry: ['#15243b', '#33445f', '#afbdd5'],
};

const FocusBackdrop: React.FC<{ themeId: string; animated?: boolean }> = ({ themeId, animated = false }) => {
  const id = useId().replace(/:/g, '');
  const [top, bottom, accent] = palettes[themeId] || palettes.morning;
  const stars = <g fill="#f5e9d4" opacity=".6">{Array.from({ length: 34 }, (_, i) => <circle key={i} cx={(i * 193 + 67) % 1600} cy={(i * 89 + 41) % 580} r={i % 5 === 0 ? 2.3 : 1.2} />)}</g>;
  const hills = (fill: string) => <g fill={fill}><path opacity=".32" d="M0 670 Q200 520 450 680 T960 640 T1600 660 V900 H0Z" /><path opacity=".6" d="M0 780 Q240 630 570 770 T1120 735 T1600 770 V900 H0Z" /></g>;
  return <svg className={`focus-backdrop${animated ? ' focus-backdrop--animated' : ''}`} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient><radialGradient id={`${id}-glow`}><stop stopColor={accent} stopOpacity=".3" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient></defs>
    <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
    <ellipse cx="1250" cy="210" rx="510" ry="440" fill={`url(#${id}-glow)`} />
    <g className="focus-backdrop-detail">
      {themeId === 'morning' && <g><path d="M1070 900 V250 A195 195 0 0 1 1460 250 V900" fill="#fffbef" opacity=".45" /><path d="M1265 60 V900 M1070 340 H1460" stroke="#d2bfaa" strokeWidth="5" opacity=".3" /><path d="M1070 450 L600 900 H1300 L1460 450Z" fill="#fff9e7" opacity=".28" /><ellipse cx="210" cy="950" rx="370" ry="320" fill="#dcc6ae" opacity=".22" /></g>}
      {themeId === 'midnight' && <g>{stars}<circle cx="1300" cy="170" r="53" fill="#e1dacc" opacity=".8" /><circle cx="1321" cy="152" r="49" fill={top} />{[700, 750, 810, 870].map((y,i) => <path key={y} d={`M0 ${y} Q330 ${y-35} 800 ${y} T1600 ${y}`} fill="none" stroke={accent} opacity={.1+i*.03} strokeWidth="2" />)}</g>}
      {themeId === 'forest' && <g>{hills('#90ac95')}<g fill="#0c2723" opacity=".6">{[30,115,205,1390,1480,1570].map((x,i) => <path key={x} d={`M${x} 900 V${260+i%3*75} l-70 200 h42 l-90 210 h65 l-105 190 h158 l-105 -190 h65 l-90 -210 h42Z`} />)}</g><path d="M0 720 Q800 590 1600 750" stroke="#c6dacc" strokeWidth="75" fill="none" opacity=".06" /></g>}
      {themeId === 'sunset' && <g><circle cx="1250" cy="340" r="108" fill="#f3c7a2" opacity=".8" /><path d="M0 850 L250 660 L480 780 L840 560 L1130 770 L1420 590 L1600 730 V900H0Z" fill="#5c3945" opacity=".5" />{hills('#302b3e')}</g>}
      {themeId === 'nebula' && <g>{stars}<ellipse cx="300" cy="200" rx="520" ry="190" transform="rotate(-30 300 200)" fill={accent} opacity=".08" /><ellipse cx="1250" cy="800" rx="580" ry="190" transform="rotate(-35 1250 800)" fill="#b68a9d" opacity=".1" /><circle cx="1360" cy="215" r="65" fill="#9d83b4" opacity=".2" /><ellipse cx="1360" cy="215" rx="120" ry="23" transform="rotate(-25 1360 215)" stroke="#c4a9ca" fill="none" strokeWidth="3" opacity=".3" /></g>}
      {themeId === 'zen' && <g stroke={accent} fill="none" opacity=".2"><circle cx="1520" cy="110" r="390" /><circle cx="1520" cy="110" r="330" /><path d="M0 775 H1600 M100 825 H1500" /><path d="M80 0 V900" opacity=".35" /></g>}
      {themeId === 'aurora' && <g>{stars}<path d="M-100 110 Q360 360 820 160 T1700 110" fill="none" stroke="#82c8b0" strokeWidth="100" opacity=".1" /><path d="M-100 75 Q360 325 820 125 T1700 75" fill="none" stroke="#97c3c0" strokeWidth="32" opacity=".16" /><path d="M-100 150 Q360 400 820 200 T1700 150" fill="none" stroke="#9d9cc1" strokeWidth="65" opacity=".13" />{hills('#0c242d')}</g>}
      {themeId === 'ocean' && <g>{[160,250,610,680,770,865].map((y,i) => <path key={y} d={`M-100 ${y} Q300 ${y-60} 750 ${y} T1700 ${y}`} stroke={accent} strokeWidth={i>2 ? 22 : 2} fill="none" opacity={i>2 ? .1 : .08} />)}<path d="M0 0 L290 0 L890 900 L730 900Z" fill="#e3f5ee" opacity=".025" /></g>}
      {themeId === 'cyberpunk' && <g><circle cx="1250" cy="270" r="105" fill="#c58c9e" opacity=".35" /><g fill="#211f35">{Array.from({length:18},(_,i) => <rect key={i} x={i*95} y={650-(i*37)%170} width="70" height="400" opacity={.35+i%3*.1} />)}</g>{[740,800,875].map(y => <path key={y} d={`M0 ${y}H1600`} stroke="#c585a8" opacity=".12" />)}<path d="M0 900 L650 720 M1600 900 L950 720" stroke="#b19bbf" opacity=".18" /></g>}
      {themeId === 'breeze' && <g><g fill="#fff" opacity=".5"><ellipse cx="320" cy="145" rx="230" ry="48" /><ellipse cx="1350" cy="270" rx="220" ry="35" /></g>{hills('#96b79c')}<g stroke="#7caa87" strokeWidth="2" fill="none" opacity=".25">{[50,110,155,1490,1540].map(x => <path key={x} d={`M${x} 900 Q${x+45} 700 ${x-5} 640 M${x+15} 810 Q${x+90} 730 ${x+55} 690`} />)}</g></g>}
      {themeId === 'lofi' && <g><rect x="1070" y="100" width="350" height="420" rx="95" fill="#1f3047" opacity=".65" /><path d="M1245 100 V520 M1070 310 H1420" stroke="#ab9294" strokeWidth="6" opacity=".4" /><circle cx="1350" cy="195" r="32" fill="#e0c29b" opacity=".7" /><path d="M0 710 H1600 V900 H0Z" fill="#2d2838" opacity=".5" /><path d="M1150 710 H1560" stroke="#c7a58c" strokeWidth="8" opacity=".3" /><path d="M1440 710 V520 M1365 520 L1390 440 H1490 L1515 520Z" fill="#d7b391" stroke="#d7b391" strokeWidth="5" opacity=".5" /><path d="M90 900 V720 M90 760 Q-10 650 40 600 Q100 625 90 760 M90 790 Q210 655 190 625 Q110 640 90 790" stroke="#809080" fill="#809080" opacity=".35" /></g>}
      {themeId === 'starry' && <g>{stars}<circle cx="250" cy="165" r="42" fill="#dddccb" opacity=".6" /><path d="M1040 90 L1380 255" stroke="#d0d8ea" strokeWidth="2" opacity=".3" /><path d="M0 900 L280 735 L560 850 L920 680 L1260 820 L1600 710 V900Z" fill="#132638" opacity=".7" /></g>}
    </g>
  </svg>;
};

export default FocusBackdrop;
