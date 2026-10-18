import React from 'react';
import { ArrowUpRight, Compass, GraduationCap } from 'lucide-react';
import './CapAnalysisCard.css';

const CapAnalysisCard: React.FC<{ year: number }> = ({ year }) => (
  <a className="cap-analysis-card" href="https://tyctw.github.io/spare/" target="_blank" rel="noopener noreferrer">
    <div className="cap-analysis-art" aria-hidden="true">
      <span className="cap-analysis-orbit" />
      <Compass size={45} strokeWidth={1.1} />
      <span className="cap-analysis-school"><GraduationCap size={20} strokeWidth={1.5} /></span>
      <span className="cap-analysis-dot" />
    </div>
    <div className="cap-analysis-copy">
      <div className="cap-analysis-label"><span>{year} 會考落點分析</span><small>PLAN YOUR NEXT STEP</small></div>
      <h3>會考落點分析與志願評估</h3>
      <p>{year} 學年度會考落點分析工具，協助你依成績區間，探索高中職志願選填方向。</p>
    </div>
    <div className="cap-analysis-action"><span>查看會考落點分析 <ArrowUpRight size={16} /></span><small>在新分頁開啟</small></div>
  </a>
);

export default CapAnalysisCard;
