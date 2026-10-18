# 套件安全修復（2026-10-11）

本機已完成修復；尚未部署正式網站。統一使用 Node 24、pnpm 11.25.0 與單一
`pnpm-lock.yaml`。刪除舊 `package-lock.json`，安裝檢查會拒絕 npm 安裝，Vercel 固定使用
`pnpm install --frozen-lockfile`。請一併提交 `package.json`、鎖定檔、`pnpm-workspace.yaml`、
`patches/` 與安裝檢查腳本，才能在其他環境重現修補。

## 更新內容

- 移除未使用的 `@google/genai` 及其依賴，也移除不再使用的安裝腳本白名單。
- PostCSS 8.5.29、autoprefixer 10.6.1、Vite 6.4.4，以及相容範圍內的傳遞依賴更新。
  nanoid、browserslist、baseline-browser-mapping、source-map-js 的舊版本通報已消除。
- `postcss-selector-parser` 6.x 無對應修補版，以 workspace override 指定 7.1.6。
  Tailwind 3 的樣式建置與實際專案建置通過，保留既有 Tailwind 設定。
- `xlsx` 0.18.5 改用官方 0.20.3 tarball，鎖定檔記錄版本 URL 與 SHA-512 integrity。
  來源：[SheetJS 官方安裝文件](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)。
  舊資料匯入腳本改用 ESM namespace 與 `set_fs`，已以合成活頁簿驗證讀取、去重、
  使用者／裝置／讀書紀錄分類及 AES-GCM 解密，未接觸正式資料或執行上傳。
- React、React DOM 與 Framer Motion 保留修復前已安裝的版本，避免無關的功能升級。

## 尚列在掃描中的 braces 通報

`pnpm audit` 仍回報 `braces@3.0.3` 的
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)。
官方通報沒有已修補版本。它是 Tailwind 建置工具的傳遞依賴，不在正式前端相依套件中。

`patches/braces@3.0.3.patch` 透過 `patchedDependencies` 與鎖定檔 hash 自動套用，
在 parser 及 compile／expand／stringify AST walker 加上固定深度上限 100。
過深輸入會拋出可捕捉的明確錯誤，阻止遞迴至 JavaScript 呼叫堆疊耗盡；
此修補不保證所有合法模式都不會耗用大量資源。深度超過上限的模式不再接受，
本專案的 Tailwind glob 未受影響。

測試包含原有字元上限以內的 4,000 層大括號、括號、未閉合輸入，
以及直接傳入 200 層 AST 的入口；一般巢狀選項、範圍、檔案 glob 也已驗證。
沒有設定 `ignoreCves`、`ignoreGhsas` 或修改 audit 輸出來隱藏通報。
日後上游發布修補版時，更新依賴並移除這份 patch，重新執行測試與掃描。

## 驗證與掃描紀錄

```powershell
pnpm install --frozen-lockfile
pnpm test:dependencies
pnpm run lint
pnpm run build
pnpm audit
pnpm audit --prod
```

- 完整掃描：由 9 high／3 moderate 減為 1 high／0 moderate（已加入本機修補的 braces 版本通報）。
- 正式相依套件掃描：0 筆已知漏洞。
- `pnpm audit` 的非零退出碼仍表示存在上述通報，不能視為掃描失敗或零漏洞。
- 最新原始輸出：`security-audit/pnpm-audit-after-fix.json`、`security-audit/pnpm-production-after-fix.json`。
- 歷史 npm／pnpm 報告保留於 `security-audit/`，不代表更新後的安裝狀態。
- 既有三個 API 與裝置撤銷、app-state 權限的本機安全測試也通過。

掃描只涵蓋掃描當時已公開且資料庫已收錄的通報；正式部署需使用上述 frozen lockfile 安裝。
