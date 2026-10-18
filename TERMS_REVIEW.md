# 服務條款內容核對（2026-10-12）

本次依目前專案實作重寫，不虛構營運者身分、付費方案、獎品、裁判管轄或刪除保證。主版本在 `data/termsOfService.ts`，頁面在 `components/TermsPage.tsx`，舊 Modal 改連結至完整版本，避免條款內容分歧。

## 功能對照

- `components/AuthModal.tsx`：註冊同意勾選為前端流程；改為同意服務條款、知悉隱私政策。這不代表已建立伺服器端同意證據或版本紀錄。
- `services/authService.ts`、`services/supabaseClient.ts`、同步與儲存模組：信箱／密碼與支援裝置上的驗證、登入後合併同步、本機儲存及復原備份。無法保證每次寫入均成功。
- 排行榜介面與 Supabase 排行 RPC：符合條件的同步紀錄參與公開排行，完整顯示名稱、隊伍及統計；沒有個別退出排行開關。
- 祈福介面與金幣計算：虛擬獎勵目前用於站內互動；未發現購買、轉讓或現金兌換流程。
- 贊助入口：外部綠界付款連結，未發現站內付費訂閱或自動續費。退款依實際交易性質與法律，不以名稱認定一律不可退款。
- 帳號刪除呼叫 `delete_own_account`；本地 migration 未包含其定義，須驗證線上資料庫功能。條款不承諾立即清除所有備份與裝置資料。

## 官方核對依據

- [民法第12條](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=B0000001&flno=12)、[第13條](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=B0000001&flno=13)、[第77條](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=B0000001&flno=77)：成年與未成年人的行為能力，保留依法可自行為之的例外。
- [民法第222條](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=B0000001&flno=222)、[第247-1條](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=B0000001&flno=247-1)：不能預先免除故意、重大過失責任；定型化條款不應顯失公平。
- [消費者保護法第11條](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=J0170001&flno=11)、[第12條](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=J0170001&flno=12)、[第19條](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=J0170001&flno=19)：保留適用的消費者權益，通訊交易解除權依交易性質與法定例外判斷。
- [綠界：修改、取消與退款](https://support.ecpay.com.tw/5024/)：向實際交易商家聯絡，金流業者不取代收款者交易責任。

## 正式發布前需確認的實際營運資訊

1. 補上網站維運者的正式名稱、實際可聯絡資料，以及付款頁的收款方身分；不得擅自編造。現有信箱沿用專案既有窗口。
2. 驗證外部付款頁現有交易條件、收款主體與退款處理能力；網站贊助／退款頁應與其一致。
3. 線上測試帳號刪除 RPC、相關資料與備份保存；與隱私政策待確認事項併案處理。
4. 重大條款更新需落實通知、審閱與必要同意。現在只重寫內容，未新增條款版本留存、有效同意證據或後端強制確認流程。
5. 對內容限制、申訴、更正與服務終止等條款承諾，維運流程也需實際遵循；不代表網站已建置自動審查或申訴管理系統。

本檔為內容與程式核對紀錄，不表示已完成對未知營運事實的法律認定。
