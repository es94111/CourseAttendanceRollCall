# Tasks: 課程點名系統（Course Attendance Roll Call）

**輸入**：設計文件來自 `/specs/001-course-attendance-rollcall/`

**前置條件**：plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**測試原則**：依照 plan.md 憲法原則 III（測試驅動開發），測試任務**必須**先於實作執行（紅燈 → 綠燈 → 重構循環）。

**組織方式**：任務依 User Story 分組，每個 Story 可獨立實作與驗證。

## 格式說明：`[ID] [P?] [Story] 描述`

- **[P]**：可平行執行（不同檔案、無相依未完成任務）
- **[Story]**：對應 User Story（US1–US5）
- 所有任務含明確檔案路徑

---

## Phase 1: Setup（專案初始化）

**Purpose**: 建立專案骨架與基礎工具配置

- [ ] T001 建立 Next.js App Router 專案，安裝 next、next-auth、@auth/prisma-adapter、@prisma/client、prisma、qrcode、csv-stringify、zod、winston、winston-daily-rotate-file，根目錄為 `./`
- [ ] T002 [P] 配置 TypeScript（tsconfig.json）、ESLint（eslint.config.mjs）、Prettier（.prettierrc）
- [ ] T003 [P] 配置 Tailwind CSS（tailwind.config.ts）與初始化 shadcn/ui（components.json）
- [ ] T004 [P] 建立 Docker 容器配置（docker/Dockerfile、docker/docker-compose.yml），含 PostgreSQL healthcheck、logs Volume 掛載，以及 `TZ=Asia/Taipei` 環境變數設定（確保 Node.js 進程使用 UTC+8，TC-007）；docker-compose.yml 需包含 PostgreSQL data Volume 掛載的健康驗證設定，確保容器重啟後資料不遺失（FR-025）
- [ ] T005 [P] 建立環境變數範本（.env.example），含 DATABASE_URL、NEXTAUTH_URL、NEXTAUTH_SECRET、GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、QR_SECRET、ADMIN_EMAILS、`TZ=Asia/Taipei`（TC-007 UTC+8 固定時區）
- [ ] T006 [P] 建立共用型別定義（src/types/index.ts），含 UserRole、CourseStatus、SessionStatus、AttendanceStatus、AuditEventType（值：`export_attendance | manual_attendance_override | leave_record_add | void_session | role_change | delete_student_data | session_opened`）及所有 API 回應型別（L1、L5）
- [ ] T007 [P] 配置 Vitest 測試框架（vitest.config.ts），設定 supertest 整合測試環境與測試目錄結構（tests/unit/、tests/integration/、tests/contract/）

---

## Phase 2: Foundational（核心基礎設施）

**Purpose**: 所有 User Story 共用的核心模組，MUST 在任何 User Story 開始前完成

**⚠️ CRITICAL**: 此 Phase 完成前，任何 User Story 均不得開始實作

- [ ] T008 依照 data-model.md 定義完整 Prisma Schema（prisma/schema.prisma），含 User（`role` 欄位**預設值設為 `student`**，FR-005c）、Account、Session、VerificationToken（NextAuth 所需）、Student、Course、CourseEnrollment、AttendanceSession、AttendanceRecord、LeaveRecord、AuditLog 及所有 Enum；DateTime 欄位統一以 **UTC 儲存**，顯示層負責轉換 UTC+8（TC-007）
- [ ] T009 執行初始 Prisma Migration 建立所有資料庫資料表與索引（prisma/migrations/），包含 `(course_id, status)` 複合索引、`(session_id, student_id)` 唯一索引等
- [ ] T010 [P] 實作 Prisma Client 單例，防止開發模式熱重載產生多餘連線（src/lib/prisma.ts）
- [ ] T010a [P] 撰寫 HMAC Token 單元測試骨架（tests/unit/lib/hmac.test.ts）：涵蓋 generateToken 結構驗證、verifyToken 正確 Token、過期 Token、竄改 Token、寬限期邊界（gracePeriodSeconds）；此時實作不存在，確認所有測試紅燈後再進行 T011/T012
- [ ] T011 [P] 實作 HMAC Token 簽發工具：`generateToken(sessionId)` 產生 base64url 簽名 Token（payload = `${sessionId}:${slot}`，slot = Math.floor(Date.now()/15000)）（src/lib/hmac.ts）
- [ ] T012 [P] 實作 HMAC Token 驗簽工具：`verifyToken(token, gracePeriodSeconds)` 使用 crypto.timingSafeEqual 比對，驗證時間槽與寬限期（src/lib/hmac.ts，與 T011 同檔）
- [ ] T013 [P] 實作 Winston 結構化 JSON 日誌，含 DailyRotateFile（90 天保留，單檔 100MB 上限）（src/lib/logger.ts）
- [ ] T014 實作 NextAuth.js 設定：Google OAuth Provider、Prisma Adapter、Database Session 策略；signIn callback 邏輯（FR-005b/c）：(1) email 在 ADMIN_EMAILS → 設定 `role=admin`；(2) **新使用者不在白名單 → 明確設定 `role=student`**（User.role schema 預設值為 `student`，此處確保 callback 覆寫邏輯正確，避免 null role 導致學生無法路由）；(3) 既有使用者保留現有 role 不覆寫；session/jwt callback 傳遞 role 欄位至前端（src/lib/auth.ts）
- [ ] T015 [P] 建立 NextAuth Route Handler（src/app/api/auth/[...nextauth]/route.ts）
- [ ] T016 [P] 實作稽核日誌雙軌寫入工具 `writeAuditLog(event)`：同時寫入 AuditLog 資料庫表與 JSON 日誌檔案（src/lib/audit.ts）
- [ ] T017 建立 Root Layout，含 SessionProvider（src/app/layout.tsx）
- [ ] T018 建立共用登入頁面，含 Google OAuth 登入按鈕，登入後依 role 自動導向（src/app/login/page.tsx）
- [ ] T019 [P] 建立管理員 Layout，含 role=admin 授權檢查，未授權重導向 /login（src/app/(admin)/layout.tsx）
- [ ] T020 [P] 建立學生 Layout，含 role=student 授權檢查，未授權重導向 /login（src/app/(student)/layout.tsx）

**Checkpoint**: 基礎設施就緒 — 可在各 User Story 之間平行展開實作

---

## Phase 3: User Story 1 — 管理員建立課程與學生名單（Priority: P1）🎯 MVP

**Goal**: 管理員可新增課程（含上課時間、遲到設定）、管理學生名單（CSV 批次或逐筆），及管理使用者角色

**Independent Test**: 管理員新增一門課程並加入學生名單後，可在課程詳情頁看到正確資料，即視為功能完整

### US1 測試任務（測試先行：必須在實作前撰寫並確認失敗）

- [ ] T021 [P] [US1] 撰寫課程 API 整合測試，涵蓋 GET /api/courses、POST（含驗證）、PUT、DELETE（封存）、GET archived（tests/integration/api/courses.test.ts）
- [ ] T022 [P] [US1] 撰寫 API 路由契約測試，驗證課程與學生管理端點的回應格式符合 api-routes.md 契約（tests/contract/api-routes.test.ts）

### US1 實作任務

- [ ] T023 [P] [US1] 實作 GET /api/courses（僅回傳 active 課程，含 enrolledCount）與 POST /api/courses（Zod 驗證：name 必填、dayOfWeek 0-6、startTime/endTime HH:MM 且 end>start、lateThresholdMinutes≥0）在 src/app/api/courses/route.ts
- [ ] T024 [P] [US1] 實作 GET /api/courses/archived（封存課程列表）在 src/app/api/courses/archived/route.ts
- [ ] T025 [P] [US1] 實作 GET（archived 課程亦回傳完整資料，FR-002）、PUT（lateThresholdMinutes 修改時回應附帶 `lateThresholdChanged: true` 旗標，供前端顯示警示 Banner，spec.md EC2）、DELETE（軟刪除 status→archived）/api/courses/[id] 在 src/app/api/courses/[id]/route.ts
- [ ] T026 [US1] 實作 GET /api/courses/[courseId]/students 與 POST（建立 CourseEnrollment，防重複學號 409）在 src/app/api/courses/[id]/students/route.ts
- [ ] T027 [P] [US1] 實作 DELETE /api/courses/[courseId]/students/[studentId]（移出課程）在 src/app/api/courses/[id]/students/[studentId]/route.ts
- [ ] T028 [P] [US1] 實作 POST /api/students（手動逐筆新增，驗證 studentCode 唯一、googleEmail 唯一）在 src/app/api/students/route.ts
- [ ] T029 [US1] 實作 POST /api/students/import（CSV 批次匯入，multipart/form-data，部分匯入策略，回傳 successCount/skipCount/errors[]）在 src/app/api/students/import/route.ts
- [ ] T030 [P] [US1] 實作 PUT /api/users/[id]/role（角色變更，不可修改自身，寫入 AuditLog role_change 事件）在 src/app/api/users/[id]/role/route.ts
- [ ] T031 [P] [US1] 建立共用 DataTable 元件（支援排序、篩選）與 ConfirmDialog 元件（src/components/shared/DataTable.tsx、src/components/shared/ConfirmDialog.tsx）
- [ ] T032 [P] [US1] 建立 CourseForm 元件（新增/編輯課程表單，含 dayOfWeek 下拉、startTime/endTime 時間輸入、lateThresholdMinutes 設定）（src/components/admin/CourseForm.tsx）
- [ ] T033 [P] [US1] 建立 StudentImportDialog 元件（CSV 上傳 dialog，顯示匯入結果摘要含錯誤列表）（src/components/admin/StudentImportDialog.tsx）
- [ ] T034 [US1] 建立管理後台首頁（顯示課程概覽與快速操作入口）（src/app/(admin)/dashboard/page.tsx）
- [ ] T035 [US1] 建立課程列表頁面（含新增課程按鈕、搜尋、進入課程詳情）（src/app/(admin)/courses/page.tsx）
- [ ] T036 [US1] 建立課程詳情頁面（含學生名單管理、手動新增、CSV 匯入、移除學生）；偵測 PUT /api/courses/[id] 回應中的 `lateThresholdChanged: true` 旗標，顯示提示 Banner「此修改僅對後續點名生效，已記錄點名狀態不受影響」（spec.md EC2）；archived 課程以**唯讀模式**呈現歷史 AttendanceSession 列表與出席記錄，隱藏所有編輯操作按鈕（FR-002）；個資刪除按鈕位置預留 `{/* DELETE_BUTTON_PLACEHOLDER: T064b */}` 佔位符（T064b 在 Phase 6 替換，降低合併衝突面積）（src/app/(admin)/courses/[id]/page.tsx）
- [ ] T037 [P] [US1] 建立封存課程列表頁面（顯示 archived 課程歷史資料）（src/app/(admin)/courses/archived/page.tsx）
- [ ] T037a [P] [US1] 建立使用者角色管理頁面（顯示已登入過的 Google 帳號清單、角色切換下拉選單，呼叫 PUT /api/users/[id]/role；不可修改自身帳號角色）（src/app/(admin)/users/page.tsx）

**Checkpoint**: US1 完成 — 管理員可獨立建立課程與學生名單，驗證資料正確儲存

---

## Phase 4: User Story 2 — 學生透過 QR Code 完成點名（Priority: P1）

**Goal**: 管理員開啟點名 Session 並顯示動態 QR Code（每 15 秒 SSE 推送），學生掃描後以 Google 帳號完成點名，系統記錄時間/IP/UA

**Independent Test**: 管理員開啟 Session 並看到 QR Code，一位學生掃描後點名成功，管理員在 Session 頁面看到即時更新的點名人數，即視為功能完整

### US2 測試任務（測試先行：必須在實作前撰寫並確認失敗）

- [ ] T038 [P] [US2] 補強 HMAC 與 Session 整合測試：含 active Session 流程中 Token 驗證端到端驗證、寬限期實際邊界場景（T010a 已涵蓋純單元測試，本任務聚焦整合層）（tests/unit/lib/hmac.test.ts）
- [ ] T039 [P] [US2] 撰寫 Session 管理 API 整合測試：開啟 Session、防重複 active Session、手動關閉、作廢（含稽核日誌）（tests/integration/api/sessions.test.ts）
- [ ] T040 [P] [US2] 撰寫點名提交 API 整合測試：有效 Token 點名成功、過期 Token 拒絕、寬限期內允許、重複點名 409、找不到學生 404（tests/integration/api/attendance.test.ts）

### US2 實作任務

- [ ] T041 [P] [US2] 實作 QR Code 圖片生成工具 `generateQRCodeDataURL(url)`，使用 qrcode 套件產生 base64 PNG（src/lib/qrcode.ts）
- [ ] T042 [US2] 實作 GET /api/courses/[courseId]/sessions（Session 列表）與 POST（開啟新 Session，驗證無 active Session 衝突 409，officialStartTime 必填（API 層必填；前端 UI 預填 Course.startTime，使用者可覆寫），gracePeriodSeconds 預設 60，**寫入 AuditLog `session_opened` 事件**含 courseId、officialStartTime、gracePeriodSeconds，FR-007/L5）在 src/app/api/courses/[id]/sessions/route.ts
- [ ] T043 [P] [US2] 實作 GET /api/sessions/[id]（Session 詳情含點名人數）在 src/app/api/sessions/[id]/route.ts；回應前須執行懶惰逾時檢查：若 Session 超過 autoExpireMinutes 則更新 status→expired 後再回應，確保 REST API 與 SSE 讀取路徑狀態一致
- [ ] T044 [P] [US2] 實作 POST /api/sessions/[id]/close（status→closed）在 src/app/api/sessions/[id]/close/route.ts
- [ ] T045 [P] [US2] 實作 POST /api/sessions/[id]/void（status→voided，reason 必填，寫入 AuditLog void_session 事件，注意 active Session 需先 close 後才能 void）在 src/app/api/sessions/[id]/void/route.ts
- [ ] T046 [P] [US2] 實作 GET /api/sessions/[id]/qrcode（回傳當前 token、qrcodeDataUrl、expiresAt、remainingSeconds）在 src/app/api/sessions/[id]/qrcode/route.ts
- [ ] T047 [US2] 實作 SSE 端點 GET /api/sessions/[id]/stream：每 15 秒推送 qrcode_update 前，**先執行懶惰檢查**：若 Session 已超過 autoExpireMinutes 則更新 status→expired 並推送 `session_status_changed` 事件（此為 FR-007b 自動逾時的實作位置，取代不可靠的背景定時器，M1）；有學生點名時推送 attendance_count 事件；連線終止時清除 interval（src/app/api/sessions/[id]/stream/route.ts）（含 FR-007b 逾時懶惰檢查；T072 整合於此，無需另行實作）
- [ ] T048 [US2] 實作 POST /api/attendance：驗證 HMAC Token 簽名 → 驗證時間有效性（含 gracePeriodSeconds 寬限）→ 驗證 Session active → 查找 Google Email 對應 Student → 確認已選課 → 防重複點名 → 計算遲到狀態 → 寫入 AttendanceRecord（記錄 attendedAt、ipAddress、userAgent）（src/app/api/attendance/route.ts）
- [ ] T049 [P] [US2] 建立 QRCodeDisplay 元件：顯示 QR Code 圖片、倒數計時器（每秒更新）、透過 EventSource 訂閱 /stream 自動更新 QR Code，Session 狀態變更時顯示對應提示（src/components/admin/QRCodeDisplay.tsx）
- [ ] T050 [US2] 建立管理員點名 Session 頁面：含 QRCodeDisplay、即時點名人數統計、開啟/關閉/作廢 Session 按鈕（src/app/(admin)/sessions/[id]/page.tsx）
- [ ] T051 [US2] 建立學生點名頁面：掃描 QR Code 後跳轉，顯示 Google 登入按鈕，登入後自動提交點名（含 token 和 sessionId query param），顯示成功/失敗/已點名訊息；POST /api/attendance 失敗（網路中斷或逾時）時顯示「網路異常，請重新掃描 QR Code」提示，不重試避免重複點名（EC4）（src/app/checkin/page.tsx）

**Checkpoint**: US2 完成 — QR Code 點名流程端到端可用，含 SSE 即時更新

---

## Phase 5: User Story 3 — 管理員設定遲到判定與請假記錄（Priority: P2）

**Goal**: 管理員可為課程設定遲到門檻、為學生新增請假記錄，及手動補登/覆寫出席狀態

**Independent Test**: 設定遲到門檻後，不同時間點的點名正確標記「準時」/「遲到」；新增請假記錄後，統計中該次課程顯示「請假」

### US3 測試任務（測試先行）

- [ ] T052 [P] [US3] 撰寫出席率計算單元測試：測試各狀態計數、應出席課次計算（排除 voided Session）、出席率百分比（tests/unit/lib/attendance-stats.test.ts）

### US3 實作任務

- [ ] T053 [P] [US3] 實作出席率計算邏輯：`calculateStats(sessions, records)` 回傳各生 onTimeCount/lateCount/leaveCount/absentCount/attendanceRate（分母排除 voided Session）（src/lib/attendance-stats.ts）
- [ ] T054 [US3] 實作 POST /api/leave：建立 LeaveRecord → 將對應 AttendanceRecord status 更新為 leave（若無則建立，isManual=true）→ 寫入 AuditLog **`leave_record_add`** 事件（與 T055 的 `manual_attendance_override` 事件區分，便於稽核日誌精確篩選，L1）（src/app/api/leave/route.ts）
- [ ] T055 [US3] 實作 PUT /api/attendance/[id]：管理員手動補登或覆寫出席狀態（isManual=true），寫入 AuditLog manual_attendance_override 事件（含 oldValue、newValue、reason 必填）（src/app/api/attendance/[id]/route.ts）
- [ ] T056 [P] [US3] 建立 AttendanceTable 元件：顯示點名記錄（狀態、時間、IP、UA），含手動補登按鈕、新增請假按鈕、狀態 Badge 顯示（src/components/admin/AttendanceTable.tsx）

**Checkpoint**: US3 完成 — 遲到判定與請假管理功能獨立可用

---

## Phase 6: User Story 4 — 管理員查看自動出席統計與匯出名單（Priority: P2）

**Goal**: 系統自動計算每位學生出席率，管理員可查看統計總覽、篩選日期範圍後匯出 CSV（含 PII 警告），及刪除學生個資

**Independent Test**: 有若干點名記錄後，管理員可下載含所有欄位的 CSV，統計頁面顯示每位學生出席率百分比

### US4 測試任務（測試先行）

- [ ] T057 [P] [US4] 撰寫 CSV 匯出工具單元測試：測試 UTC+8 時間格式化、欄位映射、串流輸出（tests/unit/lib/csv.test.ts）
- [ ] T058 [P] [US4] 撰寫匯出 API 整合測試：30,000 筆上限、confirmed=true 參數、稽核日誌寫入、CSV 格式正確性（tests/integration/api/export.test.ts）

### US4 實作任務

- [ ] T059 [P] [US4] 實作 CSV 匯出工具：使用 csv-stringify 串流模式，cursor-based pagination（每批 1,000 筆），時間戳記轉 UTC+8 格式，ReadableStream 串流回傳（src/lib/csv.ts）
- [ ] T060 [US4] 實作 GET /api/courses/[courseId]/statistics：查詢出席統計（支援 startDate/endDate 篩選），使用 attendance-stats.ts 計算各生數據（src/app/api/courses/[id]/statistics/route.ts）
- [ ] T061 [US4] 實作 SSE 統計即時串流 GET /api/courses/[courseId]/statistics/stream：當有新 AttendanceRecord 寫入時推送 statistics_update 事件（實作輪詢機制，每 2 秒檢查更新，確保 SC-005「5 秒內反映」最差延遲 ≤ 4 秒）（src/app/api/courses/[id]/statistics/stream/route.ts）
- [ ] T062 [US4] 實作 GET /api/courses/[courseId]/export：驗證日期範圍 → 計算總筆數（>30,000 回 400）→ 驗證 confirmed=true → 串流回傳 CSV → 寫入 AuditLog export_attendance 事件（src/app/api/courses/[id]/export/route.ts）
- [ ] T063 [P] [US4] 實作 DELETE /api/students/[id]/data：驗證 confirmed=true → 刪除 User/Account/Session → 匿名化 Student（清除 googleEmail/userId/name）→ 清除 AttendanceRecord.ipAddress 與 userAgent → 寫入 AuditLog delete_student_data 事件（src/app/api/students/[id]/data/route.ts）
- [ ] T064 [US4] 建立課程出席統計頁面：顯示學生出席率表格（含各狀態計數）、日期篩選、匯出按鈕（含 PII 警告 dialog）、透過 EventSource 訂閱 /statistics/stream 即時更新（src/app/(admin)/statistics/[courseId]/page.tsx）
- [ ] T064b [US4] 在課程詳情頁面（src/app/(admin)/courses/[id]/page.tsx）或學生列表中加入「刪除個人資料」功能按鈕（含 ConfirmDialog 二次確認與 PII 警告說明），呼叫 DELETE /api/students/[id]/data，刪除成功後重新整理學生列表（FR-021c；修改既有 T036 建立的頁面，實作前確認 T036 已合併，避免 PR 衝突）

**Checkpoint**: US4 完成 — 統計與 CSV 匯出獨立可用，PII 警告與稽核日誌正確寫入

---

## Phase 7: User Story 5 — 學生查看個人出席記錄（Priority: P2）

**Goal**: 學生以 Google 帳號登入後，唯讀查看自己在所有課程的點名狀態與出席率統計

**Independent Test**: 已完成點名的學生以相同 Google 帳號登入，個人出席頁面正確顯示各課程出席記錄與統計

### US5 測試任務（測試先行：必須在實作前撰寫並確認失敗）

- [ ] T065a [P] [US5] 撰寫學生個人出席查詢 API 整合測試：已綁定 Google Email 正確回傳各課程出席統計（onTimeCount/lateCount/leaveCount/absentCount/attendanceRate）、未綁定 Email 回傳空陣列、嘗試存取他人資料回傳 403、尚未加入任何課程回傳空陣列（tests/integration/api/students-me.test.ts）

### US5 實作任務

- [ ] T065 [US5] 實作 GET /api/students/me/attendance：依登入 Google Email 查找 Student，回傳所有已選課的出席統計（onTimeCount/lateCount/leaveCount/absentCount/attendanceRate），未綁定學生回傳空陣列（src/app/api/students/me/attendance/route.ts）
- [ ] T066 [P] [US5] 建立 MyAttendanceTable 元件：顯示各課程出席記錄表格，含課程名稱、各狀態次數、出席率 Badge（src/components/student/MyAttendanceTable.tsx）
- [ ] T067 [US5] 建立學生個人出席頁面：顯示所有已選課程出席統計，無課程時顯示「尚未加入任何課程」提示（src/app/(student)/my-attendance/page.tsx）

**Checkpoint**: US5 完成 — 學生可獨立查看個人出席記錄，資料隔離已驗證

---

## Phase 8: Polish & Cross-Cutting Concerns（收尾與橫切關注點）

**Purpose**: 稽核日誌 UI、效能驗證、全域錯誤處理與最終整合測試

- [ ] T068a [P] 撰寫稽核日誌查詢 API 整合測試：GET /api/audit-logs 事件類型篩選、操作者篩選、日期範圍篩選、分頁功能、非 admin 帳號存取回傳 403（tests/integration/api/audit-logs.test.ts）
- [ ] T068 [P] 實作稽核日誌查詢 API：GET /api/audit-logs（支援 eventType、actorEmail、startDate/endDate 篩選、分頁），權限限 admin（src/app/api/audit-logs/route.ts）
- [ ] T068b [P] 撰寫 AuditLogTable 元件渲染測試：事件類型 Badge 顯示、操作者欄位、時間格式（UTC+8）；確認測試紅燈後再進行 T069（tests/unit/components/AuditLogTable.test.tsx）
- [ ] T069 [P] 建立 AuditLogTable 元件：顯示稽核記錄表格，含事件類型 Badge、操作者、時間（src/components/admin/AuditLogTable.tsx）
- [ ] T070 建立管理後台稽核日誌頁面：含事件類型/操作者/日期範圍篩選（src/app/(admin)/audit-logs/page.tsx）
- [ ] T071 [P] 實作全域 API 錯誤處理：統一 `{ "error": "..." }` 格式回應，所有 500 錯誤寫入 logger，加入 Zod 驗證中間件工具（src/lib/）
> **T072（已整合於 T047，非獨立任務）**：FR-007b 自動逾時 Session 機制已整合至 T047 SSE stream handler（懶惰檢查策略）；GET /api/sessions/[id] 等 REST API 路徑亦應在回應前執行逾時檢查，相關邏輯已在 T047 說明中涵蓋。此條目保留供可追溯性，不需另行實作。
- [ ] T073 依照 quickstart.md 執行完整驗收場景：新增課程 → CSV 匯入學生 → 開啟 Session → 學生掃描點名 → 查看統計 → 匯出 CSV → 查看個人出席記錄，驗證所有 Success Criteria（SC-001 到 SC-009）
- [ ] T073a [P] 使用 autocannon 或 k6 執行並發點名負載測試：模擬 100 位學生在 15 秒內同時提交有效點名請求（含合法 HMAC Token），驗證所有請求無錯誤回應且點名記錄無漏記（SC-004）（tests/load/concurrent-checkin.test.ts）
- [ ] T073b [P] 量測 SSE QR Code 更新延遲：使用 Node.js EventSource 客戶端訂閱 /api/sessions/[id]/stream，記錄從 15 秒輪換時間點到接收 qrcode_update 事件的實際延遲，驗證延遲 ≤ 1 秒（SC-003）（tests/load/sse-latency.test.ts）
- [ ] T073c [P] 量測統計 SSE 更新延遲：使用 Node.js EventSource 客戶端訂閱 /api/courses/[courseId]/statistics/stream，提交一筆有效 POST /api/attendance 後，量測從請求完成到接收 statistics_update 事件的實際延遲，驗證最差延遲 ≤ 5 秒（SC-005）（tests/load/sse-statistics-latency.test.ts）
- [ ] T074 [P] 實作應用健康檢查端點 `GET /api/health`：回傳應用狀態與資料庫連線狀態（200 OK 含 `{ status: "ok", db: "connected" }` / 503 Service Unavailable），供 Docker healthcheck 與 Zeabur 平台健康探針使用（SC-009 可用性支撐，L3）（src/app/api/health/route.ts）
- [ ] T075 [P] 建立生產部署配置文件（docs/deployment.md 或 quickstart.md 補充）：涵蓋 Google OAuth Callback URL 設定步驟（正式域名）、Zeabur 環境變數清單（含 TZ、ADMIN_EMAILS、QR_SECRET）、PostgreSQL 托管服務配置、docker-compose 生產模式說明、**備份策略說明**（如 `pg_dump` cron 排程指令、平台托管備份設定、Volume 掛載驗證操作指引，支援 FR-025 兩學年資料保留要求）（TC-003）

---

## V1 暫緩功能備注

以下功能已確認在 V1 版本中**不實作**，非遺漏，供後續版本追蹤：

| 功能 | 規格依據 | 暫緩理由 |
|------|---------|---------|
| 管理員端 SSE 斷線自動停止點名偵測 | spec.md Edge Cases#5 | V1 維持簡潔性（憲法原則 V）；管理員需手動重新整理頁面重建 SSE 連線 |

---

## Dependencies & Execution Order

### Phase 相依關係

- **Setup（Phase 1）**: 無相依，立即開始
- **Foundational（Phase 2）**: 相依 Phase 1 完成，**封鎖所有 User Story**
- **US1（Phase 3）**: 相依 Phase 2 完成，無相依其他 Story
- **US2（Phase 4）**: 相依 Phase 2 完成，無相依其他 Story
- **US3（Phase 5）**: 相依 Phase 2 完成，部分邏輯建立在 US1/US2 資料之上，但可獨立測試
- **US4（Phase 6）**: 相依 Phase 2 完成、attendance-stats.ts（T053）完成
- **US5（Phase 7）**: 相依 Phase 2 完成，US2 資料有助於驗證但非硬性相依
- **Polish（Phase 8）**: 相依所有期望完成的 User Story

### User Story 相依

- **US1（P1）**: Phase 2 完成後立即開始，無其他 Story 相依
- **US2（P1）**: Phase 2 完成後立即開始，無其他 Story 相依（US1 資料有助於 E2E 測試但非必要）
- **US3（P2）**: Phase 2 完成後開始，US2 的 AttendanceRecord 結構提供測試資料
- **US4（P2）**: Phase 2 + T053（attendance-stats.ts）完成後開始
- **US5（P2）**: Phase 2 完成後開始，US2 完成後有完整測試資料

### 各 Story 內部執行順序

1. **測試任務**（標記 [P] 可平行）→ 確認**失敗（紅燈）**
2. **實作任務**：工具/Service → API Route → UI 元件 → 頁面整合
3. **驗收**：確認測試通過（綠燈）→ 重構

---

## Parallel Example: User Story 2（QR Code 點名）

```bash
# 同時撰寫所有 US2 測試（全部標記 [P]）：
Task T038: "tests/unit/lib/hmac.test.ts — HMAC Token 單元測試"
Task T039: "tests/integration/api/sessions.test.ts — Session API 整合測試"
Task T040: "tests/integration/api/attendance.test.ts — 點名提交 API 整合測試"

# 測試失敗確認後，平行實作 US2 工具層（全部標記 [P]）：
Task T041: "src/lib/qrcode.ts — QR Code 圖片生成"
Task T043: "src/app/api/sessions/[id]/route.ts — Session 詳情"
Task T044: "src/app/api/sessions/[id]/close/route.ts — 關閉 Session"
Task T045: "src/app/api/sessions/[id]/void/route.ts — 作廢 Session"
Task T046: "src/app/api/sessions/[id]/qrcode/route.ts — QR Code Token"
```

---

## Implementation Strategy

### MVP First（僅 US1 + US2，共兩個 P1 Story）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（⚠️ 封鎖點）
3. 完成 Phase 3: US1（課程與學生名單）
4. 完成 Phase 4: US2（QR Code 點名）
5. **STOP and VALIDATE**: 端到端驗收點名流程
6. Demo / 部署最小可行產品

### Incremental Delivery

1. Setup + Foundational → 基礎就緒
2. US1 → 管理員可建立課程與學生名單 → 驗收 → 部署
3. US2 → 學生可掃描 QR Code 點名 → 驗收 → 部署（**MVP 完成**）
4. US3 → 遲到判定與請假管理 → 驗收 → 部署
5. US4 → 統計與 CSV 匯出 → 驗收 → 部署
6. US5 → 學生個人出席查詢 → 驗收 → 部署
7. Polish → 稽核日誌 UI、效能驗證 → 最終上線

### Parallel Team Strategy（多人協作）

```
Phase 2 完成後：
  開發者 A: US1（課程/學生管理）
  開發者 B: US2（QR Code/點名流程）

US1 + US2 完成後：
  開發者 A: US3（遲到/請假） + US5（學生出席查詢）
  開發者 B: US4（統計/匯出）
```

---

## Notes

- **[P] 任務** = 不同檔案、無相依未完成任務，可平行執行
- **[Story] 標籤** 對應 spec.md 中的 User Story，提供可追溯性
- **測試任務必須先寫並確認失敗**，再開始對應實作任務
- **每個 User Story 應獨立完整且可測試**，不依賴其他未完成 Story
- 每個任務或邏輯群組完成後 commit
- 可在任何 Checkpoint 停下驗收 Story，無需等待整個系統完成
- **UTC+8 時間**：所有 DateTime 存取與 CSV 匯出均轉換為 UTC+8（`Asia/Taipei`）
- **Prisma Migration**：每次 Schema 變更需建立新 migration，勿直接修改 schema 而跳過 migrate
