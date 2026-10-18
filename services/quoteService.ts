import { parentStudyQuotes, quotes } from '../data/quotes';

const getDayOfYear = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;

  return Math.floor(diff / oneDay);
};

export const isParentStudyQuoteToday = (): boolean => getDayOfYear() % 3 === 0;

export const getDailyQuote = (): string => {
  if (!quotes || quotes.length === 0) {
    return "堅持不是因為看到希望，而是堅持了才看得到希望。";
  }

  const dayOfYear = getDayOfYear();

  if (isParentStudyQuoteToday()) {
    return parentStudyQuotes[dayOfYear % parentStudyQuotes.length];
  }

  // Use the day of year to select a quote index
  // This ensures the quote changes every day but stays the same throughout the day
  const quoteIndex = dayOfYear % quotes.length;

  return quotes[quoteIndex];
};
