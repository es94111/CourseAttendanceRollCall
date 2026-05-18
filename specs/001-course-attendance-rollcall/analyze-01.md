# 規格分析報告：課程點名系統（Course Attendance Roll Call）

**功能分支**：`001-course-attendance-rollcall`
**分析日期**：2026-05-18
**分析範圍**：spec.md、plan.md、tasks.md、constitution.md（v1.0.0）

---

## 規格分析報告（Specification Analysis Report）

| ID | 類別 | 嚴重程度 | 位置 | 摘要 | 建議 |
|----|------|----------|------|------|------|
| C1 | Constitution | **CRITICAL** | tasks.md Phase 8（T068–T070） | T068（GET /api/audit-logs）、T069（AuditLogTable）、T070（稽核日誌頁面）**完全沒有前置測試任務**，直接違反憲法原則 III（測試 MUST 先於實作） | 在 T068 之前新增整合測試任務（tests/integration/api/audit-logs.test.ts）；在 T069/T070 之前新增元件測試任務 |
| I1 | Inconsistency | **HIGH** | spec.md FR-007b / tasks.md T047、T072 | FR-007b MUST 在逾時時自動標記 Session 為 expired；T047 採「懶惰檢查」策略，僅在 SSE 連線有效時觸發。若管理員未連線 SSE（如關閉瀏覽器分頁），Session 永遠不會自動過期，與規格 MUST 語義衝突 | 在 spec.md Edge Cases 中明確說明此架構限制，**或**在 GET /api/sessions/[id] 回應前加入逾時檢查（T072 Notes 中已提及但未落地為獨立任務） |
| D1 | Duplication | **HIGH** | tasks.md T072 | T072 是「影子任務」：任務描述說「已整合至 T047，T047 完成後自動完成」，意即此 checkbox 永遠不會有獨立實作，造成任務清單追蹤混淆 | 將 T072 從獨立任務移除，改在 T047 描述末尾加注「（含 FR-007b 懶惰逾時檢查，T072 整合於此）」；保持可追溯性同時消除虛假任務 |
| U1 | Inconsistency | **MEDIUM** | tasks.md Phase 6/Phase 7 | T064a（US5 測試，Phase 7）的任務編號夾在 T064（US4）與 T064b（US4）之間，跨 Phase 跳號，使依賴追蹤與執行順序讀取困難 | 將 T064a 改編號為 T064c（置於 Phase 6 尾端）或整理至 Phase 7 開頭並明確重新編號 |
| C2 | Constitution | **MEDIUM** | spec.md Assumptions 區段 | 資料保留政策（「至少兩學年」）僅記錄於 Assumptions，未以正式 FR-### 格式列入 Requirements；憲法原則 IV MUST 要求保留政策「在規格中明確定義」 | 在 Requirements 區段新增 FR-025（資料保留）：「系統 MUST 依學校規定保留至少兩學年的點名記錄；資料保留機制應在 Docker Volume 或雲端儲存層確保持久化」 |
| U2 | Underspecification | **MEDIUM** | spec.md SC-001、SC-002、SC-008 / tasks.md T073 | SC-001（2 分鐘建課）、SC-002（30 秒點名完成）、SC-008（1 分鐘找到學生統計）僅由 T073 手動驗收場景涵蓋，無自動化量測機制 | SC-001/SC-008 屬 UX 操作指標，接受手動驗收；SC-002 建議在 checkin 流程中加入計時追蹤（記錄掃描 → 點名完成的時間戳），提供可量測依據 |
| U3 | Underspecification | **MEDIUM** | spec.md SC-005 / tasks.md T061 | 統計 SSE（T061）有 SC-005「5 秒內反映」的目標，但無對應測試任務量測此延遲；僅 T073b 測試 QR Code SSE 延遲，統計 SSE 延遲無自動化測試 | 仿 T073b 新增任務 T073c：以 Node.js EventSource 客戶端訂閱 /statistics/stream，量測從 POST /api/attendance 成功到收到 statistics_update 事件的延遲，驗證 ≤ 5 秒（SC-005） |
| A1 | Ambiguity | **MEDIUM** | spec.md FR-015 / tasks.md T042 | FR-015 說明 officialStartTime 預設帶入排定時間（隱含可不填）；T042 將其設為「必填（required）」欄位。API 層必填、UX 層預填的衝突可能誤導 API 消費者（如測試程式、第三方整合） | 在 T042 任務描述中明確標注「officialStartTime 從 API 語義為必填；前端 UI 一律預填 Course.start_time 作為預設值，使用者可覆寫」，或考慮讓 API 接受 null 並在伺服器端套用預設值 |
| I2 | Inconsistency | **LOW** | spec.md FR-007 / tasks.md T006、T042 | `session_opened` 稽核事件在 T006（AuditEventType enum）和 T042（POST sessions 寫入 AuditLog）中定義；但 FR-007 稽核要求僅明確提及 void_session 操作，未含 session_opened——屬規格外的謹慎添加 | 在 spec.md FR-007 或 FR-024 補充說明：「開啟 Session（session_opened）亦記錄稽核日誌」，使規格與實作一致 |
| I3 | Inconsistency | **LOW** | spec.md FR-011 / tasks.md T048 | FR-011 描述「比對 Google 帳號與學號完成點名」；T048 加入「確認已選課」驗證。規格接受場景 5 僅提及「找不到對應學生」，未明確說明「有 Student 記錄但未選課」應被拒絕 | 在 spec.md Edge Cases 新增：「學生 Google Email 已綁定學號但未選修該課程，嘗試點名時系統應拒絕並顯示「未選修此課程」提示，不計入點名」 |
| D2 | Duplication | **LOW** | tasks.md T036、T064b | T036（建立課程詳情頁面）與 T064b（新增刪除個人資料按鈕）均指向同一檔案 src/app/(admin)/courses/[id]/page.tsx，可能造成 PR 衝突或功能重疊 | 在 T036 結尾標注「個資刪除按鈕實作由 T064b 完成（Phase 6）」；在 T064b 說明「修改既有 T036 建立的頁面，追加 FR-021c 功能」，明確分工邊界 |

---

## 覆蓋摘要表（Coverage Summary）

| 需求 Key | 有任務？ | 任務 IDs | 備註 |
|----------|----------|----------|------|
| FR-001 | ✅ | T023 | |
| FR-002 | ✅ | T024, T025, T036, T037 | |
| FR-003 | ✅ | T026, T027 | |
| FR-004 | ✅ | T026 | |
| FR-005a | ✅ | T008, T014 | |
| FR-005b | ✅ | T014 | |
| FR-005c | ✅ | T014 | |
| FR-005d | ✅ | T030, T037a | |
| FR-005e | ✅ | T028, T029 | |
| FR-006a | ✅ | T029 | |
| FR-006b | ✅ | T028 | |
| FR-007 | ✅ | T042, T045 | |
| FR-007a | ✅ | T044 | |
| FR-007b | ⚠️ 部分 | T047, T072 | SSE 懶惰檢查；SSE 未連線時不觸發（見 I1） |
| FR-007c | ✅ | T042 | |
| FR-007d | ✅ | T042, T048 | |
| FR-008 | ✅ | T011, T012, T041, T046, T047 | |
| FR-009 | ✅ | T049 | |
| FR-010 | ✅ | T051 | |
| FR-011 | ✅ | T048 | 選課驗證需補入規格（見 I3） |
| FR-012 | ✅ | T048 | |
| FR-013 | ✅ | T048 | |
| FR-014 | ✅ | T048 | |
| FR-015 | ✅ | T023, T025, T032, T042 | officialStartTime 必填歧義（見 A1） |
| FR-016 | ✅ | T048 | |
| FR-017 | ✅ | T054 | |
| FR-017a | ✅ | T055 | |
| FR-018 | ✅ | T053, T060 | |
| FR-019 | ✅ | T053, T060 | |
| FR-020 | ✅ | T060, T064 | |
| FR-021 | ✅ | T059, T062 | |
| FR-021a | ✅ | T062, T064 | |
| FR-021b | ✅ | T062 | |
| FR-021c | ✅ | T063, T064b | |
| FR-022 | ✅ | T062 | |
| FR-023 | ✅ | T065, T066, T067 | |
| FR-024 | ⚠️ 部分 | T016, T068-T070 | T068–T070 缺前置測試（見 C1） |
| SC-003 | ✅ | T073b | |
| SC-004 | ✅ | T073a | |
| SC-005 | ⚠️ 部分 | T061 | 無 SSE 延遲自動化測試（見 U3） |
| SC-006 | ✅ | T057, T058, T059 | |
| SC-007 | ✅ | T038, T040 | |
| SC-009 | ✅ | T074 | |

---

## 憲法對齊問題（Constitution Alignment Issues）

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. 文件語言（繁體中文） | ✅ 通過 | spec.md / plan.md / tasks.md 均以繁體中文撰寫 |
| II. 使用者優先設計 | ✅ 通過 | 5 個 User Story 涵蓋管理員與學生視角，每項功能有真實情境 |
| III. 測試驅動開發 | ❌ **CRITICAL 違規** | T068–T070（稽核日誌 API + UI）無前置測試任務，違反「測試 MUST 先於實作」 |
| IV. 資料安全與隱私保護 | ⚠️ 部分 | RBAC、稽核日誌、PII 保護均實作；但資料保留政策未以正式 FR 列入 Requirements（見 C2） |
| V. 簡潔性（YAGNI） | ✅ 通過 | V1 暫緩功能有明確記錄；複雜度追蹤表說明所有例外 |

---

## 無需求對應的任務（Unmapped Tasks）

| 任務 ID | 描述 | 說明 |
|---------|------|------|
| T002 | TypeScript/ESLint/Prettier 配置 | TC-001 隱含要求，無對應 FR |
| T003 | Tailwind + shadcn/ui 配置 | TC-004 隱含要求，無對應 FR |
| T007 | Vitest 測試框架配置 | 憲法原則 III 要求，無對應 FR |
| T031 | DataTable + ConfirmDialog 共用元件 | US1/US4 UI 支撐任務，非獨立需求 |
| T071 | 全域 API 錯誤處理 | TC-006（日誌）隱含最佳實踐，無明確 FR |
| T075 | 生產部署配置文件 | TC-003 隱含需求，屬維運文件 |

---

## 指標（Metrics）

| 項目 | 數值 |
|------|------|
| 總需求數（FR + 需建置的 SC） | 44（38 FR + 6 SC） |
| 總任務數 | 80 |
| 需求覆蓋率（≥1 任務） | 42 / 44 = **95.5%**（FR-007b、SC-005 部分覆蓋） |
| 歧義數量 | 1（A1） |
| 重複數量 | 2（D1、D2） |
| CRITICAL 問題數 | **1**（C1） |
| HIGH 問題數 | 2（I1、D1） |
| MEDIUM 問題數 | 5（U1、C2、U2、U3、A1） |
| LOW 問題數 | 3（I2、I3、D2） |

---

## 後續行動（Next Actions）

### ⛔ 在執行 `/speckit-implement` 之前，必須先解決以下 CRITICAL 問題：

**C1（最高優先）**：在 tasks.md Phase 8 的 T068 之前，新增稽核日誌 API 整合測試任務：

```
- [ ] T068a [P] 撰寫稽核日誌查詢 API 整合測試：GET /api/audit-logs
      事件類型篩選、操作者篩選、日期範圍篩選、分頁、權限（非 admin 回傳 403）
      （tests/integration/api/audit-logs.test.ts）
```

### ⚠️ 建議在實作前解決的 HIGH 問題：

**I1**：在 spec.md Edge Cases 新增一條說明 FR-007b 的架構限制：
> 「Session 自動逾時依賴 SSE 連線的懶惰檢查；管理員關閉瀏覽器後，Session 狀態不會立即更新，直到下一次有人存取。V1 接受此限制。」

**D1**：將 T072 從獨立任務移除，改在 T047 最後加注：
> `（含 FR-007b 逾時懶惰檢查；T072 整合於此，無需另行實作）`

### ℹ️ 可在實作進行中逐步修正的 MEDIUM/LOW 問題：

| 問題 | 建議行動 | 執行時機 |
|------|----------|----------|
| U1（任務編號跳序） | 重新命名 T064a→T064c | 修改 tasks.md 時 |
| C2（資料保留未入 FR） | 執行 `/speckit-specify` 新增 FR-025 | 下次規格更新時 |
| U3（SC-005 無自動測試） | 新增 T073c SSE 延遲測試 | Phase 8 任務新增時 |
| A1（officialStartTime 歧義） | 在 T042 描述中補充說明 | 撰寫 T042 任務時 |
| I2、I3（規格未記載實作細節） | 執行 `/speckit-specify` 補充 | 規格下次迭代時 |

### 建議指令：

1. **立即**：手動編輯 `tasks.md` 新增 T068a 測試任務（不需要重新執行 `/speckit-tasks`）
2. **選擇性**：執行 `/speckit-specify` 補充 FR-025（資料保留）與 Edge Cases（FR-007b 限制、未選課學生點名拒絕）
3. **確認後**：可進行 `/speckit-implement`（在 C1 解決後）

---

*分析由 speckit-analyze 自動生成 | 2026-05-18*
