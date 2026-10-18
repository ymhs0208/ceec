# 頁面路徑

頁面使用 `/{考試代號}/{頁面}`，首頁使用 `/{考試代號}`。
以 116 學測為例；其他 `EXAM_PRESETS` 中的考試同樣適用。

| 頁面 | 路徑 |
| --- | --- |
| 首頁 | `/116gsat` |
| 排行榜 | `/116gsat/ranking` |
| 今日共讀 | `/116gsat/community` |
| 讀書統計 | `/116gsat/learning` |
| 成就徽章 | `/116gsat/achievements` |
| 祈福神社 | `/116gsat/temple` |
| 設定 | `/116gsat/settings` |
| 帳號管理 | `/116gsat/account` |
| 使用說明 | `/116gsat/instructions` |
| 隱私權政策 | `/116gsat/privacy` |
| 服務條款 | `/116gsat/terms` |
| 考前檢查暨應考注意事項 | `/116gsat/exam-checklist` |
| 官方參考日程 | `/116gsat/schedule` |
| 小額贊助 | `/116gsat/donation` |
| 最新公告 | `/116gsat/announcements` |
| 售後服務 | `/116gsat/support` |
| 退款與取消政策 | `/116gsat/refund-policy` |

登入、註冊、忘記密碼、重設密碼分別使用
`/116gsat/auth/login`、`/116gsat/auth/signup`、`/116gsat/auth/forgot`、`/116gsat/auth/reset`。
`returnTo` 僅接受已知頁面代號，例如 `?returnTo=account`；不接受任意外部網址。
登入成功後回到原本請求的頁面。未登入直接開啟帳號頁會進入登入頁並保留目的地。

## 相容性與導覽

- 舊的 `/?exam=116gsat&page=achievements`、`/116gsat?page=achievements` 仍可使用，
  載入後以 `replaceState` 整理成 `/116gsat/achievements`，不額外新增上一頁紀錄。
- `/spare/support`、`/spare/refund-cancellation-policy` 與舊的 `/auth/login?exam=...` 保持相容。
- 路徑中的有效考試與頁面優先於 query；無效代號回到有效的考試首頁。
  URL 是頁面依據，不再讓過期的 `history.state.appPage` 覆蓋網址。
- 上一頁／下一頁同步頁面、考試、考試日期與登入模式；不反覆新增相同網址。
- 主要導覽與頁尾使用真實連結。一般點擊在應用程式內切換，複製連結、Ctrl／Cmd 點擊
  與另開分頁保留瀏覽器原生行為。
- 非路由 query 與頁內 anchor 在一般切換時保留；密碼重設、OTP 與 Supabase callback 的
  query／hash 在 Auth 處理前保留原樣，避免先改寫網址而遺失登入資訊。
- 各頁 canonical 與 Open Graph 網址使用新路徑。這是前端更新的 metadata，沒有新增 SSR。
- Vercel 現有 SPA rewrite 支援直接開啟與重新整理深層路徑。此專案以網站根目錄部署。

## 本機驗證

`pnpm test:routes` 驗證全部考試、16 個頁面、4 個登入模式的路徑往返、舊網址相容性、
無效輸入、query 優先順序與 Auth callback 保留；型別檢查與正式建置通過。

瀏覽器已檢查 14 個非首頁／帳號頁面的直接載入與 canonical、成就頁的返回／前進、
登入／註冊模式與註冊頁重新整理，以及設定頁在學測／會考切換後的返回／前進。
帳號頁驗證未登入時保留 `returnTo=account`；未以正式帳號提交登入或重設密碼。

部署後應再次確認正式網站的深層路徑可直接載入與重新整理。
