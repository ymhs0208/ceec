# Cloudflare Workers 部署

本專案可透過 Cloudflare Workers 部署前端靜態資源與三個 `/api/*` 端點。
`wrangler.jsonc` 已指定 Worker、Vite 建置、SPA 路由及 Node.js 相容模式。
Vercel 的部署方式仍可使用。

## GitHub 自動部署

Cloudflare Workers & Pages → `ceec` → Settings → Build：

- Repository：`ymhs0208/ceec`，branch：`main`
- Root directory：儲存庫根目錄
- Build command：可留空；`wrangler deploy` 會依設定自動執行 `pnpm run build`
- Deploy command：`pnpm run deploy`（原本的 `npx wrangler deploy` 亦可）
- Node.js：24；pnpm 版本由 `packageManager` 指定

Wrangler 已固定為開發相依套件，`pnpm-workspace.yaml` 允許 `esbuild` 與 `workerd`
執行必要安裝腳本，因此不再於部署時自動改寫專案或觸發互動式 approve-builds。

## 環境設定

Build variables（編譯前設定，修改後重新部署）：

| 變數 | 用途 |
| --- | --- |
| `VITE_SUPABASE_URL` | 現有 Supabase 專案網址 |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable / anon key，可供前端使用 |

Worker 的 Settings → Variables and Secrets（執行期設定）：

| 變數 | 類型 | 用途 |
| --- | --- | --- |
| `SUPABASE_URL` | Variable | 同一個 Supabase 專案網址 |
| `SUPABASE_ANON_KEY` | Variable / Secret | 同一個 publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | 後端資料與帳本 API 使用 |
| `APP_STATE_ENCRYPTION_KEY` | Secret | **沿用現有部署的同一把** base64 編碼 32-byte 金鑰，才能讀取既有加密資料 |

不要將 service role key 或加密金鑰加上 `VITE_` 前綴，亦不要提交到 Git。
`keep_vars` 保留在 Dashboard 設定的執行期變數；secrets 由 Cloudflare 保存。
現有 Supabase migrations 仍須完成，請見 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)。

若更換網站網域，在 Supabase Authentication 的 URL Configuration 加入新網站的
Site URL / Redirect URLs，確保登入、Email 驗證與密碼重設能返回正確網域。

## 本機檢查

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm check:cloudflare
pnpm test:cloudflare
```

`check:cloudflare` 會建置網站並以 Wrangler 打包 Worker，**不發佈**。
`test:cloudflare` 會啟動本機 workerd，測試 SPA 深層路徑、靜態資源、標頭與 API。
測試只使用假憑證，不會寫入正式 Supabase。

本機完整預覽：`pnpm dev:cloudflare`。
本機秘密可放在被 Git 忽略的 `.dev.vars`；設定名稱同上。

正式發佈：`pnpm deploy`。首次使用本機 CLI 時，先執行 `pnpm exec wrangler login`。

## 這次錯誤的原因

紀錄中的 `ERR_PNPM_IGNORED_BUILDS: workerd` 發生在 Wrangler 自動設定專案時。
明確指定依賴版本、安裝腳本白名單與 Wrangler 設定，即可跳過自動設定流程。
此外，單純上傳 `dist` 不會執行 Vercel 的 `api/*.ts`；本專案的 Worker adapter
保留原本的認證、加密及帳本處理，將 `/api/*` 導向後端，其他頁面交給靜態資源服務。

參考：
- https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
- https://developers.cloudflare.com/workers/configuration/environment-variables/
- https://developers.cloudflare.com/workers/static-assets/headers/
