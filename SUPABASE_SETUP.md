# Supabase 後端設定

## 1. 建立資料庫

1. 在 Supabase 建立專案。
2. 開啟 **SQL Editor**。
3. 依檔名順序執行 `supabase/migrations/` 中的所有遷移檔。每次貼上並執行整份檔案，不要只選取其中的函式：
   - `202606120001_initial_backend.sql`
   - `202607090001_team_ranking_trends.sql`
   - `202608230001_study_logs_incremental_sync.sql`
   - `202608230002_protect_study_logs.sql`
   - `202610110001_device_session_revocation.sql`
   - `202610110002_app_state_server_only.sql`
   - `202610160001_temple_ledger.sql`
   - `202610170001_ranking_fairness.sql`
   - `202610180001_repair_study_coin_deficits.sql`
   - `202610180002_restore_all_study_coins.sql`

這些遷移會建立 `profiles`、`app_state`、`study_logs`、`devices`、
`team_ranking_snapshots`、RLS policies 與 `get_rankings` RPC，並設定讀書紀錄的索引與存取政策。
既有專案只需依序補上尚未執行的遷移；不要重跑全部遷移。

### 專注時數、文昌點數與獎章核對

**2026-10-18 全歷史恢復：**先完成 `202610160001_temple_ledger.sql` 與 `202610180001_repair_study_coin_deficits.sql`，再完整執行 `202610180002_restore_all_study_coins.sql`。新遷移會立即為所有帳號的伺服器專注紀錄核對收入，不必逐一登入；保留既有收入、差額收據及帳本內支出，重跑不會重複發幣。管理員已決定不追溯帳本外舊消費；此遷移不虛構舊扣款，也不退還帳本內的支出。

同步前端部署後，超過 7 天的本機或雲端歷史也能補傳，仍檢查身分、資料格式、時段重疊及同 ID 內容衝突。使用者需在保存紀錄的各裝置登入並按「檢查並補傳」；伺服器無法找回已刪除或未曾上傳的資料。歷程清空標記仍會隱藏已清除的本機歷史。

若「最近完成的專注普遍沒有香火幣收據」，先在 SQL Editor 執行 `scripts/diagnose-recent-study-coins.sql`。這份只讀檢查不呼叫修復 RPC、不修改餘額，會列出必要函式是否存在，以及最近 7 天內最多 100 筆專注的分鐘、已發金額與 `AWARDED`／`MISSING_RECEIPT`／`UNDER_AWARDED` 狀態。可填入單一使用者 UUID 縮小範圍，結果包含內部識別碼，不要公開貼上所有使用者資料。

新 `/api/study-logs` 只有確認同一筆專注已發足額收據才回傳成功；若舊 RPC 沒有回傳收據，會再向伺服器帳本核對一次。仍不符則回傳 `STUDY_CREDIT_UNCONFIRMED`，保留待處理紀錄，不會把只有讀書資料的寫入當作發幣成功。這是確認與診斷防護，不能取代正式資料庫安裝；它不直接以瀏覽器分鐘補發點數。

`202610180001_repair_study_coin_deficits.sql` 修正舊發幣收據金額小於同筆伺服器專注分鐘的差額。先套用這份新遷移，再重新按「檢查並補傳」：依伺服器 `study_logs` 核對每筆已發金額，追加不足的差額收據，保留原始收入及祈福支出；重複查詢不會重複補發。只存在瀏覽器的紀錄不能據此補幣，多發或不明來源則留待人工核對。此檔更新函式，不會在執行時直接掃描所有帳號，將在該帳號下次核對或讀取香火幣時處理。

`202610170001_ranking_fairness.sql` 修正伺服器同分排名，回傳前 30 隊以外的目前隊伍真實名次與積分，並防止查詢參數憑空建立隊伍與排名快照。請先補上此遷移，再部署相應排行榜前端。此修改沒有新增伺服器計時驗證，仍不能保證防灌分；詳見 `RANKING_FAIRNESS_REVIEW.md`。

2026-10-16 的後續修正加入 `app_state.updated_at` 版本檢查，避免兩台裝置同時寫入互相覆蓋。
請一同部署前端與 `/api/app-state`，並重新整理舊版頁面。這項版本檢查沿用既有欄位，不需新增資料庫遷移。
完整問題與測試範圍見 `BUG_REVIEW.md`。

`202610160001_temple_ledger.sql` 補上專注寫入 API 與文昌 API 所需的三個 RPC。
先套用資料庫遷移，再部署網站與 API。未套用時，本機的程式修復不會讓線上點數恢復。
此遷移只接受服務端操作，以每筆專注 ID 去重、同帳號交易鎖防止兩台裝置重複扣款，
並從既有 `study_logs` 補建漏發的香火幣。光明燈每次 100 幣、維持 7 天；求籤 30 幣；准考證 500 幣。

若正式環境曾有其他版本的點數帳本，先備份並核對該帳本與舊儀式支出，完成對應資料遷移後才啟用。
此遷移不能從加密的舊 `app_state` 或其他裝置的本機資料推算已消費的點數，也不採信瀏覽器餘額。
既有同名 RPC 的環境需先比較函式定義，不可直接假定與本遷移相同。

新版「學習歷程 → 檢查同步」會合併本機、雲端與專注帳本紀錄，顯示所有日期的待補傳紀錄，
並重新判定獎章。兩台裝置都需要開啟新版網站檢查，另一台尚未上傳的資料無法從本機讀取。
新版允許所有日期的歷史補傳並入帳。重疊專注會由帳本拒絕，需核對原始時段。
測試：設定 `SESSION_TEST_PGLITE_PATH` 指向測試專用 PGlite 的 `dist/index.js`，執行
`node scripts/test-focus-reconciliation.mjs`，可驗證獎章科目、分頁、延遲上傳、帳本補發與重複請求。

### 裝置登入撤銷升級

先完整執行 `supabase/migrations/202610110001_device_session_revocation.sql`，再部署新版前端與 API。
新版登入與 API 依賴這份遷移；缺少它時會拒絕操作，不會退回只刪除活動紀錄。

遷移把裝置對應到 JWT 中的真實 `session_id`，並以受權限限制的 RPC 刪除本人指定裝置的
`auth.sessions`。Supabase Auth 的外鍵會一併刪除對應 refresh tokens。RLS 與三個服務端 API
也會檢查工作階段是否仍存在，阻止已撤銷但尚未到期的 JWT 繼續讀寫受保護的資料。
此機制依賴 Supabase 管理的 Auth schema，請先在測試專案驗證後部署正式專案。

舊裝置會在使用新版登入或進行登入檢查時建立對應。尚未建立對應的舊裝置，
單一撤銷會提示使用「登出其他所有裝置」；該操作也會撤銷沒有裝置對應的舊工作階段。
舊版客戶端仍可透過更新登入流程建立新 session，請一併部署所有新版檔案。

撤銷不會抹除遠端畫面已顯示的資料；其他未加入 session 檢查的 Supabase Auth 功能
仍可能接受既有 JWT 至到期。[Supabase 工作階段說明](https://supabase.com/docs/guides/auth/sessions)

驗證腳本：`scripts/test-device-session-revocation.mjs` 使用測試專用的 PGlite（不加入正式相依套件），
透過 `SESSION_TEST_PGLITE_PATH` 指向其 `dist/index.js` 後執行。
`node scripts/test-server-session-security.mjs` 可檢查三個 API 對撤銷與檢查失敗的處理。

### app-state 加密入口權限修復

完整執行 `supabase/migrations/202610110002_app_state_server_only.sql`。
這份遷移會撤銷 `PUBLIC`、`anon`、`authenticated` 對 `app_state` 的資料表與個別欄位權限，
移除舊的客戶端寫入 policy，並用 restrictive RLS 拒絕客戶端直接存取。
即使舊遷移重新授予表權限，該限制仍會阻止讀寫。`service_role` 保留後端所需的讀寫權限。

目前前端已經透過 `/api/app-state` 同步，沒有直接查表的備援路徑。
套用前請確認部署的 API 已包含工作階段檢查，並已在伺服器設定
`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 與
`APP_STATE_ENCRYPTION_KEY`（base64 編碼的 32-byte 金鑰）。沿用原加密金鑰，
更換金鑰會使既有密文無法解密。舊版直接查表的客戶端必須更新為 API 同步版本。

遷移會補上 `encrypted_data` 欄位，讓 `data` 可以為 null 並移除明文預設值，
但不刪除或改寫既有使用者資料。已有明文會在 API 下次讀取時加密並清除；
如需一次處理全部舊資料，可使用同一組伺服器環境變數執行
`node scripts/encrypt-app-state.mjs` 預覽，再執行
`node scripts/encrypt-app-state.mjs --execute`。權限修復本身不代表所有歷史明文已轉換。

套用後執行 `scripts/security-check.sql`：兩個客戶端角色的表與欄位有效權限應全部為 false。
此修復限制 Data API 直接表存取；若線上另有存取 `app_state` 的自訂 `SECURITY DEFINER` RPC
或 view，也需核對其授權與實作。本機沒有這類 app-state RPC 或 view。

本機驗證：`scripts/test-app-state-access.mjs` 使用與裝置撤銷測試相同的
`SESSION_TEST_PGLITE_PATH`，測試權限、額外 grants/policies、重跑遷移與後端讀寫。
`node scripts/test-server-session-security.mjs` 也驗證 API 加密往返、大小限制、舊資料轉換與密文損壞處理。

### 排行榜出現 `42P01` / `team_ranking_snapshots does not exist`

這表示 `get_rankings` 已存在，但它需要的 `public.team_ranking_snapshots` 資料表尚未建立。
即使瀏覽器顯示 HTTP 404，此錯誤仍是資料庫缺表；修改前端 RPC 網址無法修復。

在發生錯誤的 Supabase 專案開啟 **SQL Editor**，完整執行
`supabase/migrations/202607090001_team_ranking_trends.sql`。
這份檔案可重複執行，會保留已有的快照資料，並在同一個交易內建立資料表、索引、RLS 及更新 RPC。
只有全部成功才會提交。

執行後，用下列 SQL 確認資料表及排行榜查詢：

```sql
select to_regclass('public.team_ranking_snapshots') as snapshot_table;
select public.get_rankings(null::text) as rankings;
```

第一個結果應為 `team_ranking_snapshots`（可能包含 `public.` 前綴），第二個結果應含
`global_ranking` 與 `team_ranking`。資料不足時陣列可以為空；查詢也會記錄當日隊伍快照。
最後重新整理網站的排行榜頁面。隊伍升降趨勢需有前一日或更早的快照才會出現。

若專案以 Supabase CLI 管理遷移，應透過既有的遷移流程部署；
SQL Editor 的手動執行不會更新 CLI 遷移紀錄。

## 加密同步 API 的部署排錯

若 `/api/app-state` 回傳純文字 `FUNCTION_INVOCATION_FAILED`，先查看 Vercel
Function Logs；這表示函式未正常回傳，不能只根據前端 500 判定為資料庫錯誤。
後端相對匯入必須保留 `.js` 副檔名，符合 Node ESM 的載入規則。
`pnpm lint` 已包含 NodeNext 檢查；`pnpm test:server` 會以原始匯入路徑
載入編譯後的三個 API，避免測試改寫路徑而掩蓋部署問題。

若回傳 JSON 錯誤，依 Function Logs 檢查部署環境是否有
`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、
`APP_STATE_ENCRYPTION_KEY`，並確認上方裝置登入與加密資料的 migration
已套用。加密金鑰必須沿用原本的 32-byte base64 金鑰，不能為了排錯
重新產生，以免舊資料無法解密。修改程式或環境設定後需要重新部署。

`pnpm test:auth-sync` 驗證五種帳號流程：同步故障會回傳失敗提示，
不會產生未捕捉的 Promise rejection，也不會把故障當成空白雲端資料。
Supabase 密碼登入的 400 是另一個錯誤，應檢查該請求的回應；例如
`Invalid login credentials` 會顯示「Email 或密碼錯誤」。不要貼出密碼、
登入 token 或金鑰。

## 2. 設定環境變數

將 `.env.example` 複製為 `.env.local`，填入 Supabase Dashboard 的
**Project Settings > API** 資訊：

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

## 音樂推薦（選用）

「依歌單推薦 5 首」功能需要在部署平台的伺服器環境變數新增以下金鑰；請勿將它放進前端 `.env` 或提交到 Git。

```env
YOUTUBE_DATA_API_KEY=YOUR_YOUTUBE_DATA_API_KEY
```

金鑰需啟用 YouTube Data API v3，並建議在 Google Cloud Console 限制為僅能呼叫 YouTube Data API v3。

前端只能使用 publishable/anon key。請勿放入 `service_role` key。

## 3. 設定 Auth URL

在 **Authentication > URL Configuration** 設定 Site URL，並在 Redirect
URLs 加入本機與正式網站，例如：

- `http://localhost:3000/**`
- `https://your-domain.example/**`

密碼重設使用 Supabase 寄出的 recovery link，不再使用舊版 Google Apps
Script 的 6 位數驗證碼或安全問題。

## 4. Email 驗證

若開啟 **Confirm email**，註冊後必須先點擊驗證信才能登入。若關閉，
註冊後可以立即登入並同步本機資料。

## 安全性

- 私人資料由 `auth.uid()` RLS policy 限制。
- 排行榜只透過 RPC 公開暱稱、隊伍與累積分鐘。
- 使用者密碼完全交由 Supabase Auth 管理。
- 裝置列表透過服務端 RPC 對應 Auth 工作階段；單一裝置撤銷必須先套用裝置登入撤銷遷移。
- app-state 僅透過後端 API 加密同步；必須套用 `202610110002_app_state_server_only.sql` 才能封鎖客戶端直接表存取。

## 舊 Google Sheets 資料遷移

先執行 dry-run，確認資料與解密結果：

```powershell
pnpm run migrate:supabase "C:\path\legacy-database.xlsx"
```

確認 `migration-report.json` 後，使用 Supabase Dashboard 的 service role
key 執行正式匯入：

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
pnpm run migrate:supabase "C:\path\legacy-database.xlsx" --execute
```

`service_role` 只能放在本機環境變數，不可寫入 `.env.local`、前端程式或
Git。舊密碼雜湊無法轉成 Supabase Auth 密碼；遷移後使用者需用「忘記
密碼」設定新密碼。
