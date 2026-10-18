import { safeLocalStorage } from './storage';
export type AnalyticsConsent = 'accepted' | 'rejected';

const CONSENT_KEY = 'focus_space_analytics_consent';
const MEASUREMENT_ID = 'G-H9X7EC127P';

export const getAnalyticsConsent = (): AnalyticsConsent | null => {
  const value = safeLocalStorage.getItem(CONSENT_KEY);
  return value === 'accepted' || value === 'rejected' ? value : null;
};

const removeAnalyticsCookies = () => {
  const expires = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
  const domainParts = window.location.hostname.split('.');
  const domains = ['', `; domain=${window.location.hostname}`];

  if (domainParts.length > 1) domains.push(`; domain=.${domainParts.slice(-2).join('.')}`);

  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.trim().split('=')[0];
    if (!name.startsWith('_ga')) return;
    domains.forEach((domain) => {
      document.cookie = `${name}=; ${expires}; path=/${domain}`;
    });
  });
};

export const enableAnalytics = () => {
  window[`ga-disable-${MEASUREMENT_ID}`] = false;
  if (document.getElementById('google-analytics')) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) { window.dataLayer?.push(args); };
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, { anonymize_ip: true });

  const script = document.createElement('script');
  script.id = 'google-analytics';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
};

export const setAnalyticsConsent = (consent: AnalyticsConsent) => {
  safeLocalStorage.setItem(CONSENT_KEY, consent);
  if (consent === 'accepted') {
    enableAnalytics();
  } else {
    window[`ga-disable-${MEASUREMENT_ID}`] = true;
    removeAnalyticsCookies();
  }
};

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}
