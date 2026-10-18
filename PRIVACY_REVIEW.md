# 隱私政策內容核對（2026/10/12）

現行頁面使用 `components/PrivacyPage.tsx` 與 `data/privacyPolicy.ts`。以下是給維運者的核對紀錄，不是網站使用者的政策內容。

## 已核對並修正

- 排行榜：`get_rankings` SQL 回傳完整 `profiles.name`，`RankingBoard` 直接顯示名稱。移除「首尾遮蔽／保證去識別」的說法；說明同步紀錄參與排行且目前沒有個別隱私開關。預設顯示名稱可能來自信箱前綴。
- 同步：`api/app-state.ts` 在伺服器 AES-256-GCM 加密／解密；不能聲稱使用者獨占金鑰或維運者無法解密。profile、study_logs、devices 是其他資料類別。
- 本機：localStorage 與 sessionStorage、持久登入權杖及 `utils/logoutBackup.ts` 的帳號復原備份；登出不是全面清除。刪除成功清理目前裝置相關資料，不代表遠端裝置或所有瀏覽器儲存全被擦除。
- 分析：`utils/analyticsConsent.ts` 只在 accepted 啟用 GA，rejected 設定 ga-disable 並嘗試清除 _ga Cookie。撤回不代表刪除歷史分析資料；分析選擇不控制所有外部連線。
- 第三方：Vercel、Supabase、Google Fonts、YouTube 播放與縮圖、noembed 標題查詢、Mixkit 音效、外部 ECPay 贊助頁；無目前使用 Google Sheets／Gemini 的證據。
- Passkey：裝置處理生物辨識，網站處理驗證憑證／結果。沒有宣稱本站取得原始生物辨識資料。
- 個資權利：依臺灣個資法第 3、8、13、19、20 條及適用例外說明；沒有將 GDPR 的資料可攜權當作臺灣所有使用者的無條件權利。15／30 日期限指准駁決定，不是保證所有資料立即清除。
- 移除 App 未使用的舊隱私副本，舊 PrivacyModal 改連到完整政策，避免矛盾內容。Cookie 提示改成準確的 GA 使用統計說明。

## 維運者仍需補充或實際確認

1. 資料蒐集者的正式個人／組織名稱。已向使用者詢問，未收到前只寫已知的 Focus Space 網站維運者，不能視為已完整滿足身分告知。
2. 實際 Supabase 專案區域、Vercel functions／紀錄地區及供應商受託處理安排。未讀取或變更部署控制台。
3. 實際備份、伺服器日誌、GA 事件資料、客服信件、付款紀錄與隊伍快照的保存／刪除規則。程式中未見涵蓋所有資料的固定自動清除期限，不可捏造。
4. `delete_own_account` RPC 不在本機 migration 中（既有 SECURITY_REVIEW.md 亦已記錄）。應檢查線上函式是否限制本人，及 auth、profile、state、study_logs、devices、session、其他相關資料的刪除範圍。未執行任何真實帳號刪除。
5. 確認線上加密與權限 migration 已部署；本機政策說明以目前程式流程為依據，不是已查證線上設定的證明。
6. 若有新營運方式、非程式內的行銷、收款通知／交易資料保存或新增資料處理者，須據實補入。政策不是對未提供資訊的營運事實保證。

以上不阻止本機頁面排版及內容修正；正式發布前應完成事實補充。

## 官方核對來源

- 個人資料保護法：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021 （頁面有部分修法尚未生效註記；應依實際生效條文適用）
- Supabase：https://supabase.com/privacy
- Supabase 跨境處理：https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq
- Supabase 備份：https://supabase.com/docs/guides/platform/backups
- Vercel：https://vercel.com/legal/privacy-notice
- Google：https://policies.google.com/privacy
- Google Analytics：https://support.google.com/analytics/answer/12017362?hl=zh-Hant
- YouTube：https://developers.google.com/youtube/player_parameters
- noembed：https://noembed.com/ （服務說明，不冒充隱私政策）
- Mixkit／Envato：https://www.envato.com/privacy/
- ECPay：https://support.ecpay.com.tw/10111/
