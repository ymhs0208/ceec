# 網站效能優化（2026-10-11）

## 建置比較

以同一份 pnpm 鎖定檔、同一個本機環境執行正式建置。

| 項目 | 優化前 | 優化後 | 減少 |
| --- | ---: | ---: | ---: |
| 首頁主 JavaScript（未壓縮） | 1,166.32 KB | 787.93 KB | 32.4% |
| 首頁主 JavaScript（gzip） | 316.60 KB | 232.29 KB | 26.6% |
| 全站 CSS（gzip） | 36.85 KB | 36.86 KB | 幾乎不變 |

這是主程式檔案大小的比較，不是載入時間或 Lighthouse 分數。Supabase vendor、字型、圖片與 CSS 不包含在 JavaScript 數字內；瀏覽其他頁面時仍需下載對應程式。

## 修改

- 帳號、登入、排行榜、設定、學習統計、成就、神社、公告、日程與贊助改用 React lazy 與 Suspense；導覽及頁尾在頁面載入時仍保留。
- 神社及成就的隱藏彈窗在首次開啟前不掛載，避免觸發不必要的模組下載；首次開啟後保留掛載以維持關閉動畫及內部狀態。
- 倒數更新移入 CountdownDisplay，與原有的考試狀態時鐘共用一次更新；移除 App 每秒更新，避免導覽、待辦、同步資料和其他區塊跟著倒數重新繪製。
- 分頁隱藏時停止倒數的逐秒更新，返回時依真實時間校正。
- YouTube API 與播放器只在按下播放後初始化；共用下載 Promise，支援失敗重試與逾時清理，離開首頁時銷毀播放器。
- 重用台北日期與時間的 Intl 格式器，減少每秒建立格式器。
- 考試及日期的初始值只在掛載時讀取，避免每次繪製解析網址與讀取儲存值。
- 增加 Google Fonts preconnect 與帶雜湊 `/assets/` 的一年 immutable 快取設定。快取設定需部署 Vercel 後生效。

## 驗證

- `pnpm install --frozen-lockfile`、`pnpm run build`、`pnpm run lint` 通過，未變更鎖定檔。
- 使用 Node 斷言驗證台北跨日、倒數歸零、按需載入、並行共用播放器下載、下載失敗重試及逾時清理。
- 正式建置的本機瀏覽器測試：首頁、設定、排行榜、登入、成就、神社與返回首頁的切換正常；倒數持續更新。
- 首頁尚未播放時沒有 YouTube API script 或 iframe；按播放後出現一個播放器；離開再返回播放時 API script 仍只有一份。
- 本機沒有 Supabase 環境設定，因此只驗證排行榜及登入介面載入，未驗證真實登入、排行榜資料或雲端同步。沒有部署正式網站，也未測量正式站 Core Web Vitals。

參考：[React lazy](https://react.dev/reference/react/lazy)、[React Suspense](https://react.dev/reference/react/Suspense)。
