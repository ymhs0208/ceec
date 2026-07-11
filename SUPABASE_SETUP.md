# Supabase 後端設定

## 1. 建立資料庫

1. 在 Supabase 建立專案。
2. 開啟 **SQL Editor**。
3. 執行 `supabase/migrations/202606120001_initial_backend.sql`。

Migration 會建立 `profiles`、`app_state`、`study_logs`、`devices`、
RLS policies 與 `get_rankings` RPC。

## 2. 設定環境變數

將 `.env.example` 複製為 `.env.local`，填入 Supabase Dashboard 的
**Project Settings > API** 資訊：

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

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
- 裝置列表是應用程式活動紀錄。Supabase 不提供從瀏覽器精準撤銷單一
  遠端 refresh token 的功能。

## 舊 Google Sheets 資料遷移

先執行 dry-run，確認資料與解密結果：

```powershell
npm run migrate:supabase -- "C:\path\legacy-database.xlsx"
```

確認 `migration-report.json` 後，使用 Supabase Dashboard 的 service role
key 執行正式匯入：

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
npm run migrate:supabase -- "C:\path\legacy-database.xlsx" --execute
```

`service_role` 只能放在本機環境變數，不可寫入 `.env.local`、前端程式或
Git。舊密碼雜湊無法轉成 Supabase Auth 密碼；遷移後使用者需用「忘記
密碼」設定新密碼。
