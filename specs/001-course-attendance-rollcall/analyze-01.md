# Specification Analysis Report — Course Attendance Roll Call

**Run date**: 2026-05-19
**Artifacts analyzed**: `spec.md`, `plan.md`, `tasks.md`, `.specify/memory/constitution.md`
**Mode**: Read-only consistency & coverage analysis

---

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| I1 | Inconsistency | HIGH | spec.md TC-007 / FR-019 ↔ plan.md / tasks.md T008 | spec.md TC-007 與 FR-019 規定「所有時間戳記均以 **UTC+8 儲存**」、「AttendanceSession.createdAt（UTC+8）為計日基準」；但 plan.md / tasks.md T008 改為「DateTime 欄位統一以 **UTC 儲存**，顯示層負責轉換 UTC+8」。儲存表示法直接衝突。 | 統一表述：建議將 spec.md TC-007 改為「邏輯時區固定 UTC+8（儲存採 UTC，所有對外顯示／CSV 匯出均以 UTC+8 呈現）」；或反向修正 plan.md T008 / data-model.md 改為 timestamptz 並以 UTC+8 儲存。同時更新 FR-019 跨日邊界描述對應實作層。 |
| C1 | Coverage Gap | MEDIUM | spec.md SC-001 / SC-006 / SC-008 ↔ tasks.md T073 | SC-002/003/004/005 各有專屬效能測試任務（T073d/T073b/T073a/T073c），但 SC-001（30 位學生 CSV 匯入 ≤ 120s）、SC-006（30,000 筆 CSV 匯出 ≤ 30s / 10s）、SC-008（統計頁面 ≤ 60s）僅靠 T073（quickstart 手動驗收）涵蓋，缺乏可重複的自動化量測任務。 | 新增三項 [P] 量測任務於 Phase 8：(a) CSV 匯入端到端計時（SC-001），(b) 串流 CSV 匯出 30,000 筆計時（SC-006），(c) Playwright 量測「Dashboard→Statistics→篩選→請假詳情」往返耗時（SC-008）。每項斷言對應 SC 門檻。 |
| U1 | Underspecification | MEDIUM | spec.md US5 描述 ↔ tasks.md T065 / contracts | US5 文敘述「可查看自己在所有課程中的個人出席記錄，包含**各課次的點名狀態（準時/遲到/請假/缺席）**」（per-session 粒度），但 T065 與 AS2 僅描述聚合統計（各狀態次數、出席率）。是否提供 per-session 列表未明確。 | 釐清 FR-023 是否包含 per-session detail rows；若是，擴充 T065 端點回應結構（如 `attendanceBySession: []`）並於 T066 表格中呈現；若否，修正 spec.md US5 文敘述移除「各課次」措辭。 |
| A1 | Ambiguity | MEDIUM | spec.md FR-009 ↔ plan.md / tasks.md T049, T051 | FR-009「在 QR Code 旁顯示倒數計時，告知**管理員和學生**距離下次更新的秒數」；但 tasks.md 僅 T049（管理員端 QRCodeDisplay）含倒數計時，T051（學生 /checkin 頁）未述及。學生掃描後實際不會反覆看到 QR Code，「告知學生」語義不通。 | 修訂 FR-009 為「於管理員 QR Code 顯示頁旁同步顯示倒數計時，協助管理員與學生即時掌握有效時段」；或刪除「和學生」措辭以對齊實作。 |
| CON1 | Constitution Alignment | MEDIUM | constitution.md 原則 IV ↔ spec.md FR-005a | 憲法 IV「明確區分角色：**管理員、教師、學生**」列出三個角色；spec.md 採二角色（admin / student）並於開頭以「管理員即教師」等同處理。功能上一致但憲法措辭仍可能造成審查歧義。 | 兩擇一：(a) 下次 `/speckit-constitution` PATCH 將原則 IV 改為「管理員（教師）、學生」；或 (b) 在 spec.md 開頭等同說明處同時引用憲法 IV 文字以消除誤解。本次 analyze 不要求立即修正。 |
| L1 | Coverage Gap | LOW | spec.md FR-017 ↔ tasks.md T054 | T054 描述「將對應 AttendanceRecord status 更新為 leave（若無則建立，isManual=true）」隱含請假需綁定既有 AttendanceSession；若該課次尚未開啟 Session（例如預先請整週假）則無 Session 可掛載，spec 與 plan 皆未說明此情境。 | 釐清是否允許「預先請假（Session 未開）」；若允許，定義 LeaveRecord 可獨立於 AttendanceSession 存在的資料路徑；若不允許，於 FR-017 明確說明「請假僅能對已開啟 Session 之課次建立」。 |
| I2 | Inconsistency | LOW | spec.md US4 AS2 ↔ FR-021 | FR-021 匯出欄位含「課次日期」，但 US4 AS2「包含學生姓名、學號、點名狀態、點名時間、IP 位址、裝置資訊」未列出「課次日期」。 | 補入 US4 AS2 欄位列表以對齊 FR-021，或於 FR-021 補註「課次日期由點名時間衍生」。 |
| U2 | Underspecification | LOW | spec.md FR-006a ↔ contracts/ | FR-006a 規定 CSV 必填欄位（學號、姓名、Google Email），但未說明標題列字串、欄位順序、編碼（UTF-8 BOM？）。匯入解析端可能解讀分歧。 | 於 `contracts/api-routes.md` 中明列 CSV header 規範（如 `studentCode,name,googleEmail`、UTF-8 with BOM、必含 header row），並於 T029 / T029a 引用。 |
| L2 | Coverage Gap | LOW | spec.md US2 AS5 ↔ tasks.md T048 | T048 列舉了「查找 Google Email 對應 Student」與「確認已選課」兩步驟，但未明確「未綁定 Google 帳號」（AS5）的錯誤回應格式與訊息文字。 | T048 補上錯誤回應對映：未綁定 → 404 + 訊息「找不到對應學生」；未選修 → 403 + 訊息「未選修此課程」；於 contracts/api-routes.md 落點。 |
| D1 | Inconsistency | LOW | tasks.md T015 [P] 標記 ↔ T014 依賴 | T015 `[P]` 表示可平行，但其 Route Handler 需 import T014 產出的 NextAuth 設定，邏輯上需 T014 完成才能整合運行。 | 將 T015 改為非 [P]（移除標記），或於描述中標註「框架代碼可平行撰寫，整合測試需待 T014 完成」。 |
| L3 | Style / Numbering | LOW | tasks.md T072 註記 | 任務編號 T072 已刪除但仍以註記保留段落，輕微影響任務計數一致性。 | 確認團隊接受註記保留可追溯性即可，無需處理；如要極簡可整段移除並於 changelog 註記變更。 |
| L4 | Constraint Note | LOW | plan.md 複雜度追蹤 ↔ TC-005 | T061 統計 SSE 採「伺服器端 2 秒輪詢」推送，已於 plan.md 複雜度追蹤中以「server-side polling ≠ client polling」說明合規性；屬可接受設計取捨。 | 無需處理；建議於 T073c 量測時加註：若實測延遲 ≥ 4s 觸發效能改善任務（升級為 in-process pub/sub 或縮短輪詢間隔）。 |

---

## Coverage Summary（節錄）

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 課程新增 | ✅ | T023, T032 | |
| FR-002 編輯／軟刪除 | ✅ | T024, T025, T035, T036, T037 | |
| FR-003 學生 CRUD | ✅ | T026, T027, T028 | |
| FR-004 防重複學號 | ✅ | T026 | |
| FR-005a NextAuth 統一認證 | ✅ | T014, T015 | |
| FR-005b ADMIN_EMAILS 白名單 | ✅ | T014, T014a | |
| FR-005c 學生 role 預設 | ✅ | T008, T014, T014a | |
| FR-005d 角色變更 / 自我禁止 | ✅ | T030, T030a, T037a | |
| FR-005e Email Unique | ✅ | T008, T028, T029 | |
| FR-006a CSV 批次匯入 | ✅ | T029, T029a, T033 | 欄位 header 規格待補（U2） |
| FR-006b 手動逐筆新增 | ✅ | T028 | |
| FR-007 Session 四狀態 | ✅ | T042, T044, T045, T047 | |
| FR-007a 手動關閉 | ✅ | T044 | |
| FR-007b 自動逾時 | ✅ | T043, T047, T047a | 改採懶惰檢查（T072 併入 T047） |
| FR-007c 單一 active | ✅ | T042 | |
| FR-007d 寬限期 | ✅ | T042, T048, T050 | |
| FR-008 HMAC QR | ✅ | T010a, T011, T012, T038, T041, T046, T047 | |
| FR-009 倒數計時 | ⚠️ | T049 | 學生端缺對應實作（A1） |
| FR-010～014 點名流程 | ✅ | T040, T048, T051 | |
| FR-015 遲到判定 | ✅ | T025, T032, T042, T050 | |
| FR-016 自動標記 | ✅ | T048 | |
| FR-017 請假記錄 | ✅ | T054 | Session 未開情境未涵蓋（L1） |
| FR-017a 手動補登／覆寫 | ✅ | T055, T056 | |
| FR-018 請假與缺席分開 | ✅ | T052, T053 | |
| FR-019 出席率（含跨日） | ✅ | T052, T053, T060 | UTC 儲存衝突（I1） |
| FR-020 統計總覽 | ✅ | T060, T064 | |
| FR-021 CSV 匯出 | ✅ | T057, T058, T059, T062 | US4 AS2 欄位不一致（I2） |
| FR-021a PII 警告 | ✅ | T062, T064 | |
| FR-021b 匯出稽核 | ✅ | T062 | |
| FR-021c 個資刪除 | ✅ | T063, T064b | |
| FR-022 30,000 上限 | ✅ | T058, T062 | |
| FR-023 學生自助查詢 | ⚠️ | T065, T065a, T066, T067 | per-session 粒度未明（U1） |
| FR-024 稽核日誌雙軌 | ✅ | T013, T016, T068, T068a, T069, T070 | 7 種事件全部覆蓋 |
| FR-025 兩學年保留 | ✅ | T004, T075 | 由 Volume + 備份策略支撐 |
| SC-001 課程＋CSV ≤120s | ⚠️ | T073（手動） | 無自動量測（C1） |
| SC-002 點名 ≤30s | ✅ | T073d | |
| SC-003 QR 更新 ≤1s | ✅ | T073b | |
| SC-004 100 並發 | ✅ | T073a | |
| SC-005 統計 ≤5s | ✅ | T073c | |
| SC-006 匯出 ≤30s | ⚠️ | T073（手動） | 無自動量測（C1） |
| SC-007 過期 QR 100% 拒絕 | ✅ | T040 | |
| SC-008 統計頁 ≤60s | ⚠️ | T073（手動） | 無自動量測（C1） |
| SC-009 99.5% 可用性 | ✅ | T074, T075 | 健康檢查 + 部署備份 |

> 圖例：✅ 充分覆蓋；⚠️ 有覆蓋但有 finding；❌ 完全缺失（本次無）。

---

## Constitution Alignment Issues

- **CON1（MEDIUM）**：constitution.md 原則 IV 列出三角色「管理員、教師、學生」，spec.md 採二角色（admin/student）並聲明等同；功能行為一致但措辭可被審查者誤判。屬可後續以憲法 PATCH 修正項目，**不阻擋實作**。
- 其餘原則（I 文件語言、II 使用者優先、III TDD、IV 資料安全、V YAGNI）皆通過：
  - I：所有 spec/plan/tasks 為繁體中文 ✅
  - II：5 個 User Story 含管理員與學生視角 ✅
  - III：每個 User Story 均含「測試先行」任務（T021, T029a, T030a, T038–T040, T047a, T052, T057, T058, T065a, T068a, T068b, T070a） ✅
  - IV：RBAC、稽核日誌雙軌、PII 匯出警告、個資刪除入口齊備 ✅
  - V：voided Session、雙軌稽核、SSE 等於 plan.md 複雜度追蹤逐項說明 ✅

---

## Unmapped Tasks

- **T001–T007（Setup）**：屬基礎建設，無法直接對應單一 FR，符合 Phase 1 慣例。
- **T009, T010, T013, T015, T017, T031, T034, T071, T074, T075**：基礎設施／共用元件／部署文件，間接支撐多項 FR/TC。
- **T073**：跨 SC 端到端驗收，已對應所有 Success Criteria。

無任務「完全無法歸屬」於需求／憲法，故無需移除。

---

## Metrics

| 指標 | 數值 |
|------|------|
| Total Functional Requirements (FR-###) | 35（含子項 a/b/c/d/e） |
| Total Success Criteria (SC-###) | 9 |
| Total Technical Constraints (TC-###) | 7 |
| Total Tasks（含子任務，扣除 T072 註記） | 75 |
| Requirements with ≥1 mapped task | 35 / 35 = **100%** |
| SC with automated benchmark task | 5 / 9 = **56%**（C1 缺口） |
| Ambiguity Findings | 1 |
| Duplication Findings | 0 |
| Coverage Gap Findings | 3 |
| Inconsistency Findings | 3 |
| Underspecification Findings | 2 |
| Constitution Alignment Findings | 1 |
| **CRITICAL** | 0 |
| **HIGH** | 1 |
| **MEDIUM** | 4 |
| **LOW** | 7 |

---

## Next Actions

**沒有 CRITICAL 問題阻擋實作**，惟下列為實作前建議處理：

1. **必要（HIGH）**：解決 I1（UTC 儲存表示衝突）。建議於 plan.md / data-model.md 統一儲存策略並修訂 spec.md TC-007 / FR-019 措辭。
   - 行動：手動編輯 spec.md 或 plan.md / data-model.md；不需要重跑 `/speckit-plan`，編輯後重新執行 `/speckit-analyze` 驗證。
2. **建議（MEDIUM）**：
   - **C1**：於 Phase 8 補三項自動效能量測任務（建議命名 T073e / T073f / T073g），覆蓋 SC-001 / SC-006 / SC-008。
   - **U1**：於 `/speckit-clarify` 或直接編輯 spec.md US5 明確 per-session vs 聚合粒度，必要時擴充 T065 回應結構。
   - **A1**：修正 FR-009 措辭或於 T051 補上倒數提示。
   - **CON1**：列入下一次 `/speckit-constitution` PATCH，無需阻擋本期實作。
3. **可後修（LOW）**：L1 / I2 / U2 / L2 / D1 / L3 / L4 可在 tasks.md / contracts/ 直接修文，或於對應 PR 中處理，不阻擋 MVP。

**建議命令序列**：

```text
# 1. 修正 I1（高優先）：人工編輯
edit specs/001-course-attendance-rollcall/spec.md   # TC-007 + FR-019
edit specs/001-course-attendance-rollcall/plan.md   # 若改回 UTC+8 儲存

# 2. 補 C1 / U1 / A1 任務（建議由人工於 tasks.md 補列）
edit specs/001-course-attendance-rollcall/tasks.md

# 3. 重跑 analyze 驗證
/speckit-analyze
```

進入實作前**至少應解決 I1**；其餘 MEDIUM/LOW 可在實作 PR 中順帶處理而不至於延誤 MVP。

---

## Remediation Offer

需要我針對前述 finding（特別是 I1 / C1 / U1 / A1）提出**具體的編輯片段建議**（含 before / after 文字）嗎？回覆「是」我會列出 top-N 改寫文字，但**不會直接修改檔案**（仍由你最後確認後執行）。

---

## Extension Hooks

**Optional Hook**: git
Command: `/speckit-git-commit`
Description: Auto-commit after analysis

Prompt: Commit analysis results?
To execute: `/speckit-git-commit`
