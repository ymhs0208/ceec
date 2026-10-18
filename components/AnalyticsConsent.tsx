import { useEffect, useState } from 'react';
import { BarChart3, Cookie, X } from 'lucide-react';
import { getAnalyticsConsent, setAnalyticsConsent, type AnalyticsConsent } from '../utils/analyticsConsent';

const OPEN_EVENT = 'focus-space:open-analytics-settings';

const AnalyticsConsent = () => {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(() => getAnalyticsConsent());
  const [isOpen, setIsOpen] = useState(() => getAnalyticsConsent() === null);

  useEffect(() => {
    if (consent === 'accepted') setAnalyticsConsent('accepted');

    const openSettings = () => setIsOpen(true);
    window.addEventListener(OPEN_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_EVENT, openSettings);
  }, [consent]);

  const choose = (choice: AnalyticsConsent) => {
    setAnalyticsConsent(choice);
    setConsent(choice);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-2.5 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="analytics-consent-title">
      <div className="mx-auto flex max-w-xl flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/15 sm:flex-row sm:items-start sm:p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
          <Cookie className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-0.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600"><BarChart3 className="h-3 w-3" /> 分析 Cookie</p>
              <h2 id="analytics-consent-title" className="text-base font-black text-slate-900">允許分析 Cookie？</h2>
            </div>
            {consent && <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="關閉 Cookie 設定"><X className="h-5 w-5" /></button>}
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-600">同意後使用 Google Analytics 收集網站使用統計、改善服務；拒絕不影響主要功能。可隨時從頁尾的 Cookie 設定變更。</p>
          <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
            <button type="button" onClick={() => choose('rejected')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">拒絕</button>
            <button type="button" onClick={() => choose('accepted')} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700">同意</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const openAnalyticsSettings = () => window.dispatchEvent(new Event(OPEN_EVENT));

export default AnalyticsConsent;
