const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

export const parseTaipeiDateTime = (value: string | Date): Date => {
  if (value instanceof Date) return value;

  const trimmed = value.trim();
  const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  if (hasExplicitZone) return new Date(trimmed);

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ) - TAIPEI_OFFSET_MS,
    );
  }

  return new Date(trimmed);
};

export const taipeiDateTimeMs = (date: string, time: string): number =>
  parseTaipeiDateTime(`${date}T${time}:00`).getTime();

export const getTaipeiDateString = (date: Date): string =>
  date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });

export const getTaipeiTimeSeconds = (date: Date): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value || 0);
  return get('hour') * 3600 + get('minute') * 60 + get('second');
};

export const getTimeLeft = (target: string | Date, now = new Date()) => {
  const difference = parseTaipeiDateTime(target).getTime() - now.getTime();
  if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(difference / 86400000),
    hours: Math.floor((difference / 3600000) % 24),
    minutes: Math.floor((difference / 60000) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};
