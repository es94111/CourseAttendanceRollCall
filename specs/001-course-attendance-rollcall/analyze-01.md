# 規格分析報告：課程點名系統（Course Attendance Roll Call）

**功能分支**：`001-course-attendance-rollcall`
**分析日期**：2026-05-19
**分析範圍**：spec.md、plan.md、tasks.md、constitution.md（v1.0.0）
**分析工具版本**：speckit-analyze（本次報告為覆蓋舊版 analyze-01.md）

---

## 規格分析報告（Specification Analysis Report）

| ID | 類別 | 嚴重程度 | 位置 | 摘要 | 建議 |
|----|------|----------|------|------|------|
| C1 | Constitution | **CRITICAL** | tasks.md T011/T012（Phase 2）vs T038（Phase 4） | HMAC Token 實作（T011 `generateToken`、T012 `verifyToken`）位於 Phase 2 Foundational，測試（T038 HMAC 單元測試）位於 Phase 4 US2。Phase 2 標記為「完成前封鎖所有 User Story」，意即 HMAC 必先實作後才寫測試，**紅燈無法成立**，直接違反憲法原則 III：「撰寫測試 → 確認測試失敗（紅燈）→ 實作功能 → 測試通過（綠燈）→ 重構」 | 在 Phase 2 內，T011/T012 **之前**新增測試任務（例如 T010a `撰寫 HMAC Token 單元測試骨架：generateToken 結構、verifyToken 正確/過期/竄改/寬限期，先確認失敗`）；實作 T011/T012 後確認測試通過；T038 任務可改為「補強 HMAC 整合測試（含 Session 實際流程）」而非重複單元測試 |
| M1 | Constitution | **MEDIUM** | tasks.md T069、T070（Phase 8） | T069（AuditLogTable 元件）與 T070（稽核日誌頁面）均無前置 UI 測試任務。T068a 覆蓋 API 整合測試，但 UI 元件層測試缺席，構成部分憲法原則 III 違規 | 在 T069 前新增 `T068b [P] 撰寫 AuditLogTable 元件渲染測試（事件類型 Badge 顯示、操作者、時間格式）（tests/unit/components/AuditLogTable.test.tsx）` |
| M2 | Inconsistency | **MEDIUM** | tasks.md T043、T047 | T047（SSE stream）含 FR-007b 懶惰逾時檢查；T047 Notes 提及「GET /api/sessions/[id] 等 REST API 路徑亦應在回應前執行逾時檢查」，但 T043（GET /api/sessions/[id]）未明確包含此邏輯，造成 REST API 與 SSE 之間狀態不一致風險：若無 SSE 訂閱者直接查詢 GET /api/sessions/[id]，可能回傳仍顯示 `active` 的已逾時 Session | 在 T043 任務描述末尾明確加入：「回應前須執行懶惰逾時檢查：若 Session 超過 autoExpireMinutes 則更新 status→expired 後再回應」，確保所有讀取路徑一致 |
| M3 | Underspecification | **MEDIUM** | spec.md FR-025、tasks.md T004 | FR-025 要求保留至少兩學年的點名記錄，由 Docker Volume 掛載（T004）與部署文件（T075）支撐。但無任何任務涵蓋：備份驗證流程、Volume 掛載測試、或資料保留監控策略；若 Volume 未正確掛載，容器重啟後資料靜默遺失 | 在 T004 說明中加入「docker-compose.yml 需包含 Volume 掛載的 health 驗證設定」，並在 T075 部署文件任務中明確包含備份策略說明（如 pg_dump cron）或 README 操作指引 |
| L1 | Duplication | **LOW** | tasks.md T072（Phase 8） | T072 為「影子任務」：描述明確標注「已整合於 T047，非獨立任務」且「不需另行實作」，但仍以 checkbox 形式存在，造成進度追蹤混淆（此 checkbox 永遠不會被獨立勾選完成） | 將 T072 從獨立任務移除，改在 T047 描述末尾加注可追溯性說明即可；或將 T072 改為純文字備注段落（無 checkbox） |
| L2 | Inconsistency | **LOW** | tasks.md T036、T064b | T036 與 T064b 均指向同一檔案 `src/app/(admin)/courses/[id]/page.tsx`；兩個任務均已明確標注此衝突與執行順序，但若以 Git branch 並行開發，PR 合併衝突仍有實際風險 | 考慮在 T036 中為刪除個資按鈕預留 `{/* DELETE_BUTTON_PLACEHOLDER: T064b */}` 佔位符，T064b 替換佔位符即可，降低合併衝突面積 |
| L3 | Inconsistency | **LOW** | tasks.md T065a | 整合測試檔案命名不一致：T065a 使用 `tests/integration/api/student-attendance.test.ts`，而其他任務均用 `{resource}.test.ts` 格式（courses、sessions、attendance、export、audit-logs）；`student-attendance` 混用資源與動詞 | 建議重命名為 `students-me.test.ts` 或 `my-attendance.test.ts` 以符合路由結構 `/api/students/me/attendance` |
| L4 | Ambiguity | **LOW** | tasks.md T042 | T042 任務描述末尾有 `A1` 自參照標記：「officialStartTime 必填（前端 UI 一律預填 Course 排定時間作為預設值，使用者可覆寫，**A1**）」，此 `A1` 指舊版 analyze-01.md 的問題 ID，在新版報告中將失去意義，影響任務自解釋性 | 移除 `A1` 標記，改以明確說明替代：「officialStartTime API 層必填；前端 UI 預填 Course.startTime，使用者可覆寫」 |
| L5 | Terminology | **LOW** | constitution.md 原則 II vs spec.md 全文 | 憲法原則 II 使用「教師視角」，spec.md 全文使用「管理員」，兩者為同義詞但無明確映射說明，可能混淆新貢獻者 | 在 spec.md 開頭或術語表中加入一行說明：「本規格中『管理員』即憲法所稱『教師』，為同義詞互用」 |

---

## 覆蓋摘要表（Coverage Summary）

| 需求 Key | 有任務？ | 任務 IDs | 備註 |
|----------|----------|----------|------|
| FR-001 | ✅ | T023, T032, T035 | |
| FR-002 | ✅ | T024, T025, T036, T037 | |
| FR-003 | ✅ | T026, T027, T036 | |
| FR-004 | ✅ | T026, T028 | |
| FR-005a | ✅ | T008, T014, T015 | |
| FR-005b | ✅ | T005, T014, T018 | |
| FR-005c | ✅ | T014 | |
| FR-005d | ✅ | T030, T037a | |
| FR-005e | ✅ | T008, T028, T029 | |
| FR-006a | ✅ | T029, T033 | |
| FR-006b | ✅ | T028, T033 | |
| FR-007 | ✅ | T042, T045, T039 | |
| FR-007a | ✅ | T044 | |
| FR-007b | ⚠️ 部分 | T047 | SSE 懶惰檢查，REST API (T043) 未明確含逾時邏輯（見 M2） |
| FR-007c | ✅ | T042 | |
| FR-007d | ✅ | T042, T012, T048 | |
| FR-008 | ✅ | T011, T012, T041, T046, T047 | |
| FR-009 | ✅ | T049 | |
| FR-010 | ✅ | T051 | |
| FR-011 | ✅ | T048 | |
| FR-012 | ✅ | T048 | |
| FR-013 | ✅ | T048 | |
| FR-014 | ✅ | T012, T048 | |
| FR-015 | ✅ | T025, T032, T042 | |
| FR-016 | ✅ | T048 | |
| FR-017 | ✅ | T054 | |
| FR-017a | ✅ | T055 | |
| FR-018 | ✅ | T053, T054, T060 | |
| FR-019 | ✅ | T053, T060 | |
| FR-020 | ✅ | T060, T064 | |
| FR-021 | ✅ | T059, T062 | |
| FR-021a | ✅ | T062, T064 | |
| FR-021b | ✅ | T062 | |
| FR-021c | ✅ | T063, T064b | |
| FR-022 | ✅ | T062 | |
| FR-023 | ✅ | T065a, T065, T066, T067 | |
| FR-024 | ⚠️ 部分 | T016, T068a, T068, T069, T070 | T069/T070 UI 元件缺前置測試（見 M1） |
| FR-025 | ⚠️ 部分 | T004, T075 | 無備份驗證任務（見 M3） |
| SC-003 | ✅ | T073b | SSE QR Code 延遲自動測試 |
| SC-004 | ✅ | T073a | 並發點名負載測試 |
| SC-005 | ✅ | T061, T073c | 統計 SSE 延遲自動測試 |
| SC-006 | ✅ | T057, T058, T059 | CSV 匯出效能測試 |
| SC-007 | ✅ | T012, T038, T040 | 過期 QR Code 拒絕測試 |
| SC-009 | ✅ | T074 | 健康檢查端點 |

---

## 憲法對齊問題（Constitution Alignment Issues）

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. 文件語言（繁體中文） | ✅ 通過 | spec.md / plan.md / tasks.md 均以繁體中文撰寫；程式碼識別字使用英文 |
| II. 使用者優先設計 | ✅ 通過 | 5 個 User Story 涵蓋管理員與學生視角；每項功能附有真實使用情境與 Acceptance Scenarios |
| III. 測試驅動開發 | ❌ **CRITICAL 違規** | T011/T012（Phase 2 HMAC 實作）早於 T038（Phase 4 HMAC 測試），紅燈無法成立；T069/T070 UI 元件無前置測試（MEDIUM） |
| IV. 資料安全與隱私保護 | ⚠️ 部分 | RBAC、稽核日誌、PII 保護均實作；FR-025 資料保留缺備份驗證任務（M3） |
| V. 簡潔性（YAGNI） | ✅ 通過 | V1 暫緩功能明確記錄；複雜度追蹤表說明所有例外（SSE 取代 WebSocket、雙軌稽核日誌） |

---

## 無需求對應的任務（Unmapped Tasks）

| 任務 ID | 描述 | 說明 |
|---------|------|------|
| T002 | TypeScript/ESLint/Prettier 配置 | TC-001 隱含要求，無對應 FR |
| T003 | Tailwind CSS + shadcn/ui 配置 | TC-004 隱含要求，無對應 FR |
| T007 | Vitest 測試框架配置 | 憲法原則 III 要求，無對應 FR |
| T031 | DataTable + ConfirmDialog 共用元件 | US1/US4 UI 支撐任務，屬實作細節 |
| T071 | 全域 API 錯誤處理 | TC-006（日誌）隱含最佳實踐，無明確 FR |
| T072 | （影子任務，已整合 T047） | 見 L1：建議移除 |
| T075 | 生產部署配置文件 | TC-003 隱含需求，屬維運文件 |

---

## 指標（Metrics）

| 項目 | 數值 |
|------|------|
| 總功能需求數（FR） | 38（含子項 FR-005a–e、FR-006a–b、FR-007a–d、FR-017a、FR-021a–c） |
| 需建置的成功標準數（SC） | 6（SC-003、SC-004、SC-005、SC-006、SC-007、SC-009） |
| 總需求數 | **44** |
| 總任務數 | **82**（T001–T075 + T037a、T064b、T065a、T068a、T073a、T073b、T073c） |
| 完整覆蓋率（≥1 任務） | 41 / 44 = **93.2%** |
| 部分覆蓋（需補強） | 3（FR-007b、FR-024、FR-025） |
| 零覆蓋需求 | **0** |
| CRITICAL 問題數 | **1**（C1） |
| MEDIUM 問題數 | **3**（M1、M2、M3） |
| HIGH 問題數 | **0** |
| LOW 問題數 | **5**（L1–L5） |
| 重複數量 | 1（L1 T072 影子任務） |
| 歧義數量 | 1（L4 T042 自參照標記） |

---

## 後續行動（Next Actions）

### ⛔ 必須在 `/speckit-implement` 之前解決的 CRITICAL 問題

**C1（最高優先）**：在 tasks.md Phase 2 的 T011/T012 之前，新增 HMAC 測試骨架任務：

```markdown
- [ ] T010a [P] 撰寫 HMAC Token 單元測試骨架（tests/unit/lib/hmac.test.ts）：
      涵蓋 generateToken 結構驗證、verifyToken 正確 Token、過期 Token、
      竄改 Token、寬限期邊界（gracePeriodSeconds）；
      此時實作不存在，確認所有測試紅燈後再進行 T011/T012
```

並將 T038（Phase 4）的任務描述修改為「補強 HMAC 與 Session 整合測試（含 active Session 流程、寬限期實際驗證）」，避免與 T010a 完全重複。

### ⚠️ 建議在實作前修正的 MEDIUM 問題

**M1**：在 T069 前新增元件測試任務（T068b），確保 AuditLogTable UI 測試先行。

**M2**：在 T043 描述中明確加入逾時懶惰檢查邏輯，避免 REST API 與 SSE 狀態不一致。

**M3**：在 T004 或 T075 補充 PostgreSQL 備份策略說明（如 `pg_dump` cron 或平台備份設定）。

### ℹ️ 可在實作期間逐步修正的 LOW 問題

| 問題 | 建議行動 | 執行時機 |
|------|----------|----------|
| L1（T072 影子任務） | 移除 T072 checkbox，改為 T047 描述末尾加注 | 修改 tasks.md 時 |
| L2（T036/T064b 衝突風險） | T036 加入佔位符 comment | 實作 T036 時 |
| L3（測試檔名不一致） | T065a 重命名為 `students-me.test.ts` | 建立測試檔前 |
| L4（T042 A1 自參照） | 移除 `A1` 標記，改為明確說明 | 任務執行前 |
| L5（管理員/教師術語） | spec.md 開頭加術語說明 | 下次規格更新時 |

### 建議指令

1. **立即**：手動編輯 `tasks.md`，在 Phase 2 的 T011 之前新增 T010a 測試骨架任務（解決 C1）
2. **選擇性**：手動在 Phase 8 新增 T068b AuditLogTable 元件測試任務（解決 M1）
3. **確認後**：C1 解決後即可執行 `/speckit-implement`

---

*分析由 speckit-analyze 自動生成 | 2026-05-19 | 覆蓋舊版 analyze-01.md（2026-05-18）*
