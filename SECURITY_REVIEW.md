# 資安檢查（2026-10-11）

## 範圍與結論

檢查本機前端、三個後端 API、所有 SQL 遷移、部署設定、建置產物的常見金鑰格式，以及 pnpm/npm 鎖定檔的已知漏洞。未連線正式資料庫、未讀取使用者資料、未執行線上攻擊測試；下列資料庫問題以專案中的 SQL 為依據。初次檢查僅新增報告與唯讀檢查 SQL；後續本機修復狀態另列於各項發現，尚未套用正式資料庫。

優先處理單一裝置撤銷失效與匿名排行榜寫入。資料庫權限、加密欄位及服務端 RPC 的實際部署狀態仍需核對。

## 1. 高優先：移除單一遠端裝置沒有撤銷登入

修復狀態：本機已新增 `202610110001_device_session_revocation.sql`，前端改呼叫真正的撤銷 RPC，
並加入資料庫 RLS 與三個 API 的 session 存在檢查。資料庫隔離與 API 拒絕測試已通過；
尚未套用線上資料庫或部署。以下保留原始發現作為修復依據，部署步驟見 `SUPABASE_SETUP.md`。

- 位置：`services/authService.ts:1082`、`components/AccountPage.tsx:358`。
- `removeSession` 只刪除 `devices` 活動紀錄；只有移除目前裝置才呼叫 `signOut`。移除其他裝置沒有對 Supabase Auth 做撤銷。
- 畫面卻宣稱「這項操作會立即撤銷對應裝置的登入狀態」。持有遠端 refresh token 的瀏覽器仍能維持登入，活動紀錄也可能重新建立。
- 建議：在可靠的服務端撤銷機制完成前，將單一遠端操作明確標為移除活動紀錄，並提供登出其他所有裝置。若要真正支援單一裝置撤銷，應在服務端把 Auth session 與裝置對應並驗證撤銷狀態，不可依賴瀏覽器自行提供的 `device_id`。
- 即使 `signOut` 成功，既有 access token 仍可能有效至到期，畫面不應承諾立即失效。[Supabase 官方說明](https://supabase.com/docs/guides/auth/signout)

## 2. 高優先：匿名排行榜讀取可以持續寫入快照

- 位置：`supabase/migrations/202607090001_team_ranking_trends.sql:135–168`。
- `get_rankings` 是 `SECURITY DEFINER` 函式，授權 `anon` 執行，且會把呼叫者提供的任意 `requested_team` 納入當日快照寫入。
- 當有積分的真實隊伍不足 100 支時，反覆提供不同的隊伍字串可持續增加 `(snapshot_date, team)` 資料列。`LIMIT 100` 只限制每次呼叫，沒有每日累積上限。每次請求也會執行排行榜聚合與寫入。
- 影響：匿名呼叫者可污染快照、消耗資料庫儲存與查詢資源。RLS 無法阻止函式內以擁有者權限執行的寫入。
- 建議：排行榜 RPC 改成唯讀；快照由受控的排程建立，只記錄真實隊伍。空隊伍只用於當次回傳，不持久化。對公開查詢加上合理限流與快取。

## 3. 中優先：資料庫直接寫入可繞過 app-state 加密入口

修復狀態：本機已新增 `202610110002_app_state_server_only.sql`，撤銷客戶端表與欄位權限、
移除原寫入 policy 並加入拒絕直接存取的 restrictive RLS，保留服務端加密 API 的讀寫權限。
遷移補齊密文欄位與 nullable 明文欄位，不刪除既有資料。權限隔離、額外 grants/policies、
遷移重跑、服務端讀寫、API 加密往返與舊資料轉換測試通過。
尚未套用線上；部署步驟與舊版相容性見 `SUPABASE_SETUP.md`。以下為原始發現。

- 位置：`supabase/migrations/202606120001_initial_backend.sql:49,64–68`、`api/app-state.ts:69–80`。
- API 會加密資料並清除明文，但初始遷移仍授予 authenticated 對 `app_state` 的全部讀寫權限，且允許操作自己的資料列；後續遷移沒有撤銷這項權限。
- 按目前 SQL，登入者可直接用 Data API 寫入自己的 `data` 明文、刪除自己的同步狀態，繞過 API 的大小檢查與加密流程。如果線上 `encrypted_data` 也可直接更新，還可能破壞自己的密文，使同步解密失敗。
- 此處沒有發現可操作其他使用者資料的證據；風險是加密流程與資料完整性保證可被繞過。
- 建議：若 app-state 已全面走服務端 API，撤銷 anon/authenticated 的直接表存取，並移除客戶端寫入 policy。部署前核對舊客戶端相容性。

## 4. 中優先：套件有已知漏洞，兩份鎖定檔不一致

修復狀態：本機已統一 pnpm 11.25.0 與 `pnpm-lock.yaml`，移除 npm 鎖定檔，
Vercel 安裝改為 frozen lockfile，並加入安裝工具檢查。
更新修補版與傳遞相依套件、移除未使用的 `@google/genai`，SheetJS 改由官方來源安裝 0.20.3。
`postcss-selector-parser` 覆寫至 7.1.6，`braces@3.0.3` 使用已納入鎖定檔的本機深度限制修補。
修復後掃描：正式相依套件 0 筆；全部相依套件仍列出 1 筆 high（braces 原版本通報），
未忽略或隱藏通報。它尚無官方修補版，本機修補與惡意深度輸入測試已完成；不可宣稱全專案 audit 為零。
型別檢查、建置、套件安全測試、合成 Excel 解密匯入及既有 API／資料庫安全測試通過。
詳細版本、相容性與修補維護步驟見 `DEPENDENCY_SECURITY.md`。以下保留原始掃描結果。

### 實際設定使用的 pnpm

`package.json` 指定 pnpm，`vercel.json` 也使用 pnpm 建置。`pnpm audit --json` 回報 9 筆 high、3 筆 moderate、0 筆 critical；數字是 audit 的通報統計，不等於 12 個可遠端利用的網站漏洞。

- `xlsx@0.18.5`：惡意試算表讀取可觸發原型污染或正規表示式阻斷服務。實際使用位置是 `scripts/migrate-legacy-to-supabase.mjs:148` 的本機匯入，非網站上傳入口。[原型污染通報](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)、[ReDoS 通報](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)。建議更換為維護中的套件或由官方來源取得修補版，核對來源與雜湊；單純 `audit fix` 無法修補 npm 上的舊 xlsx。
- `postcss@8.5.16`、`nanoid`、`browserslist`、`braces`、`source-map-js` 等也有通報，多涉及工具輸入、建置或資源耗盡。優先升級相容修補版本，對未修補的傳遞依賴評估替代方案，不要直接強制跨大版本升級。
- 未發現前端程式使用 `@google/genai`；可評估移除不用的相依套件以縮小維護範圍。

### 額外存在的 npm 鎖定檔

`npm audit --package-lock-only --ignore-scripts --json` 回報 20 個受影響套件（critical 1、high 15、moderate 3、low 1），包含較舊的 `protobufjs@7.5.4`、`vite@6.4.1`。pnpm 鎖定的是 `protobufjs@7.6.5`、`vite@6.4.3`，不可把 npm 的嚴重風險直接套到 pnpm 部署。

若有人使用 `npm ci`，就會取得不同且較舊的依賴。建議統一套件管理器與鎖定檔，更新後重新建置及執行必要檢查。[protobufjs 通報](https://github.com/advisories/GHSA-xq3m-2v4x-88gg)

原始掃描輸出另存於 `security-audit/pnpm-audit.json` 與 `security-audit/npm-audit.json`。

## 5. 中優先：暱稱預設取 email 前綴，可能被公開排行榜揭露

- 位置：`services/authService.ts:660`、`supabase/migrations/202606120001_initial_backend.sql:92,109`、排行榜的 `name` 回傳。
- 未提供暱稱時使用 email 的 `@` 前字串；只要帳號產生讀書紀錄並進入前 50 名，就可能公開這段資訊。字串可能包含真名、學號或其他識別資訊。
- 建議：統一使用不含 email 的預設暱稱，並在首次設定清楚說明暱稱與隊伍會出現在公開排行榜。確認既有帳號是否仍使用 email 前綴。

## 必須核對的部署差異（尚未證實漏洞）

本機新遷移已包含 `encrypted_data` 欄位，但仍未提供 `record_study_session`、`get_temple_state`、`perform_temple_ritual`、`delete_own_account` 定義。API 與前端依賴這些函式。因此仍無法從本機確認：

- 金幣與讀書紀錄 RPC 是否只允許 `service_role` 執行；若接受 `p_user_id` 的高權限函式對 anon/authenticated 開放，可能允許跨帳號操作，必須檢查實際函式內容。
- 讀書紀錄的重複、重疊時間、每日上限及金幣發放是否真的由資料庫驗證。API 只確認瀏覽器提供的分鐘數為 1–180、時間在七日內；不能據此證明讀書時間真實。
- 帳號刪除 RPC 是否依 `auth.uid()` 限制本人。
- 線上 app-state 是否已完成加密遷移、撤銷直接寫入，以及有哪些額外 policies。

可使用 `scripts/security-check.sql` 在 Supabase SQL Editor 唯讀檢查 metadata，沒有查詢使用者資料或呼叫具副作用的 RPC。

## 防護已存在與其他強化項目

- 三個服務端 API 先向 Supabase Auth 驗證 access token，再以回傳的 user ID 操作資料；未見直接信任 request body 的 user ID。
- 四張初始使用者資料表都啟用 RLS 並限制本人；後續讀書紀錄 policy 改為客戶端唯讀。這些結論仍以遷移確實部署為前提。
- app-state 使用 AES-256-GCM、隨機 12-byte IV 及驗證 tag，服務端環境金鑰不經 Vite 匯出。
- 對 86 個本機程式、SQL、文件與建置文字檔做常見金鑰格式掃描，未找到 service-role JWT、`sb_secret_`、Google API key 或私鑰；建置檔找到的是 role=anon 的 JWT，屬預期公開金鑰。此格式掃描不保證不存在其他格式的秘密。
- 未在應用程式來源找到 `dangerouslySetInnerHTML`、`innerHTML`、`eval`、`new Function` 的使用；第三方 vendor 未在這項手動檢查範圍。
- Vercel 設定已有 HSTS、防嵌入與 nosniff。但 CSP 允許 inline script，仍可透過搬移行內腳本、hash/nonce 與刪除不用的腳本來源強化。這不是已證實的 XSS。
- API 本身未見限流；是否已有 Vercel/WAF 的外部規則未知。建議核對部署層保護與逾時設定。

參考：[Supabase 金鑰與 RLS](https://supabase.com/docs/guides/getting-started/api-keys)、[PostgreSQL SECURITY DEFINER 與預設函式權限](https://www.postgresql.org/docs/current/sql-createfunction.html)。
