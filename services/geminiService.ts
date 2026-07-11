const FALLBACK_QUOTES = [
  "堅持不是因為看到希望，而是堅持了才看得到希望。",
  "現在的努力，是為了未來的選擇權。",
  "不要假裝努力，結果不會陪你演戲。",
  "每一份努力，都是未來的伏筆。",
  "將來的你，一定會感謝現在拚命的自己。"
];

export const getMotivationalQuote = async (): Promise<string> => {
  // API keys must never be bundled into the browser. Use a server-side endpoint
  // before restoring generated quotes.
  return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
};
