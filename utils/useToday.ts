import { useEffect, useState } from 'react';

const localDayStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
};

/** Refresh date-dependent summaries when midnight passes or a tab wakes up. */
export const useToday = () => {
  const [today, setToday] = useState(localDayStart);
  useEffect(() => {
    const refresh = () => setToday(localDayStart());
    const interval = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return today;
};
