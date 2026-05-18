# API 路由契約

**日期**：2026-05-18 | **功能**：001-course-attendance-rollcall

所有 API 路由皆位於 `src/app/api/`。  
認證方式：NextAuth.js Session Cookie（`next-auth.session-token`）。  
所有時間戳記以 **UTC+8（ISO 8601）** 格式回傳與接收。  
所有錯誤回應格式：`{ "error": "錯誤描述（繁體中文）" }`

---

## 權限說明

| 角色 | 說明 |
|------|------|
| `admin` | 管理員，可存取所有管理端 API |
| `student` | 學生，只能存取個人出席查詢 |
| `public` | 未登入，可存取點名提交端點（需有效 HMAC Token） |

---

## 1. 課程管理（/api/courses）

### GET /api/courses
**說明**：取得課程列表（僅 `active` 課程）  
**權限**：admin  
**回應 200**：
```json
[
  {
    "id": "cuid",
    "name": "資料結構",
    "dayOfWeek": 2,
    "startTime": "09:00",
    "endTime": "12:00",
    "lateThresholdMinutes": 10,
    "status": "active",
    "enrolledCount": 35,
    "createdAt": "2026-05-18T08:00:00+08:00"
  }
]
```

### POST /api/courses
**說明**：新增課程  
**權限**：admin  
**請求 Body**：
```json
{
  "name": "資料結構",
  "dayOfWeek": 2,
  "startTime": "09:00",
  "endTime": "12:00",
  "lateThresholdMinutes": 10
}
```
**驗證**：`name` 必填；`dayOfWeek` 0-6；`startTime/endTime` HH:MM 格式且 end > start；`lateThresholdMinutes` ≥ 0  
**回應 201**：新建課程物件  
**回應 400**：驗證失敗

---

### GET /api/courses/archived
**說明**：取得封存課程列表  
**權限**：admin  
**回應 200**：與 `GET /api/courses` 相同結構，`status: "archived"`

---

### GET /api/courses/:id
**說明**：取得單一課程詳情（含學生名單）  
**權限**：admin  
**回應 200**：課程物件 + `students: Student[]`

### PUT /api/courses/:id
**說明**：編輯課程基本資訊  
**權限**：admin  
**請求 Body**：同 POST，所有欄位可選（PATCH 語意）  
**回應 200**：更新後課程物件  
**回應 404**：課程不存在

### DELETE /api/courses/:id
**說明**：封存課程（軟刪除，status → `archived`）  
**權限**：admin  
**回應 200**：`{ "message": "課程已封存" }`  
**注意**：`archived` 課程仍保留所有歷史資料，但不可再開新 Session

---

### GET /api/courses/:courseId/students
**說明**：取得課程學生名單  
**權限**：admin  
**回應 200**：
```json
[
  {
    "id": "cuid",
    "studentCode": "B11234567",
    "name": "王小明",
    "googleEmail": "wang@gmail.com",
    "isGoogleLinked": true
  }
]
```

### POST /api/courses/:courseId/students
**說明**：將學生加入課程（建立 CourseEnrollment）  
**權限**：admin  
**請求 Body**：`{ "studentId": "cuid" }`  
**回應 201**：`{ "message": "學生已加入課程" }`  
**回應 409**：學生已在此課程中  
**回應 400**：相同課程中學號重複

### DELETE /api/courses/:courseId/students/:studentId
**說明**：將學生移出課程  
**權限**：admin  
**回應 200**：`{ "message": "學生已從課程移除" }`

---

### GET /api/courses/:courseId/statistics
**說明**：取得課程出席統計總覽  
**權限**：admin  
**查詢參數**：`?startDate=2026-01-01&endDate=2026-06-30`（選填）  
**回應 200**：
```json
{
  "courseId": "cuid",
  "totalSessions": 15,
  "students": [
    {
      "studentId": "cuid",
      "studentCode": "B11234567",
      "name": "王小明",
      "onTimeCount": 12,
      "lateCount": 2,
      "leaveCount": 1,
      "absentCount": 0,
      "attendanceRate": 93.3
    }
  ]
}
```

### GET /api/courses/:courseId/export
**說明**：匯出課程點名記錄 CSV  
**權限**：admin  
**查詢參數**：`?startDate=2026-01-01&endDate=2026-06-30`（必填）  
**流程**：
1. 計算符合條件的記錄總筆數
2. 若超過 30,000 筆 → 回傳 400，要求縮小範圍
3. 顯示 PII 警告（前端處理，需確認參數 `?confirmed=true`）
4. 串流回傳 CSV

**CSV 欄位**：學生姓名、學號、課次日期（UTC+8）、點名狀態、點名時間（UTC+8）、IP 位址、裝置資訊  
**回應 200**：`Content-Type: text/csv; charset=utf-8`，串流回傳  
**回應 400**：超過 30,000 筆或缺少 `confirmed=true` 或日期範圍未填  
**稽核**：成功匯出後自動寫入 AuditLog（event_type: `export_attendance`）

---

## 2. 學生管理（/api/students）

### POST /api/students
**說明**：手動逐筆新增學生  
**權限**：admin  
**請求 Body**：
```json
{
  "studentCode": "B11234567",
  "name": "王小明",
  "googleEmail": "wang@gmail.com"
}
```
**驗證**：`studentCode`、`name` 必填；`googleEmail` 選填但若填則需符合 Email 格式；學號不可重複；googleEmail 不可重複  
**回應 201**：新建學生物件  
**回應 409**：學號或 googleEmail 已存在

### POST /api/students/import
**說明**：CSV 批次匯入學生  
**權限**：admin  
**請求**：`multipart/form-data`，欄位 `file`（CSV 檔案）  
**CSV 必填欄位**：`學號`、`姓名`、`Google Email`  
**策略**：部分匯入（有效列寫入，無效列略過）  
**回應 200**：
```json
{
  "successCount": 28,
  "skipCount": 2,
  "errors": [
    { "row": 5, "reason": "學號 B11234567 已存在" },
    { "row": 12, "reason": "Google Email 格式不符" }
  ]
}
```

---

## 3. 點名 Session 管理（/api/courses/:courseId/sessions、/api/sessions/:id）

### GET /api/courses/:courseId/sessions
**說明**：取得課程所有 Session 列表  
**權限**：admin  
**回應 200**：
```json
[
  {
    "id": "cuid",
    "courseId": "cuid",
    "officialStartTime": "2026-05-20T09:00:00+08:00",
    "status": "active",
    "autoExpireMinutes": 90,
    "gracePeriodSeconds": 60,
    "createdAt": "2026-05-20T08:55:00+08:00"
  }
]
```

### POST /api/courses/:courseId/sessions
**說明**：開啟新點名 Session  
**權限**：admin  
**請求 Body**：
```json
{
  "officialStartTime": "2026-05-20T09:00:00+08:00",
  "autoExpireMinutes": 90,
  "gracePeriodSeconds": 60
}
```
**驗證**：`officialStartTime` 必填；`gracePeriodSeconds` 預設 60（> 0）；同課程不可有 `active` Session  
**回應 201**：新建 Session 物件  
**回應 409**：此課程已有進行中的 Session

---

### GET /api/sessions/:id
**說明**：取得 Session 詳情（含點名人數）  
**權限**：admin

### POST /api/sessions/:id/close
**說明**：手動關閉 Session（status → `closed`）  
**權限**：admin  
**回應 200**：`{ "message": "點名已關閉" }`

### POST /api/sessions/:id/void
**說明**：作廢 Session（非 active 狀態的 Session → `voided`）  
**權限**：admin  
**請求 Body**：`{ "reason": "誤開，實際未上課" }`（必填）  
**回應 200**：`{ "message": "Session 已作廢" }`  
**稽核**：寫入 AuditLog（event_type: `void_session`，含 reason）  
**注意**：`active` Session 需先關閉或逾時才能作廢

---

### GET /api/sessions/:id/qrcode
**說明**：取得當前 QR Code Token 與圖片（一次性請求）  
**權限**：admin  
**回應 200**：
```json
{
  "token": "base64url_encoded_hmac_token",
  "qrcodeDataUrl": "data:image/png;base64,...",
  "expiresAt": "2026-05-20T09:00:15+08:00",
  "remainingSeconds": 12
}
```

---

## 4. 點名提交（/api/attendance）

### POST /api/attendance
**說明**：學生提交點名（掃描 QR Code 後 Google 登入完成）  
**權限**：public（需有效 HMAC Token + 已登入 Google 帳號）  
**請求 Body**：
```json
{
  "token": "base64url_encoded_hmac_token",
  "sessionId": "cuid"
}
```
**驗證流程**：
1. 驗證 HMAC Token 簽名
2. 驗證 Token 時間有效性（含 `grace_period_seconds` 寬限）
3. 驗證 Session 狀態為 `active`
4. 以登入 Google Email 查找對應 Student
5. 確認 Student 已選修此課程
6. 確認尚未點名過（防重複）
7. 計算遲到狀態並寫入 AttendanceRecord

**回應 200**：
```json
{
  "message": "點名成功",
  "status": "on_time",
  "attendedAt": "2026-05-20T09:05:30+08:00"
}
```
**回應 400**：Token 無效或已過期  
**回應 403**：Session 已關閉  
**回應 404**：找不到對應學生記錄  
**回應 409**：已完成點名，不重複記錄

---

### PUT /api/attendance/:id
**說明**：管理員手動補登或覆寫出席記錄  
**權限**：admin  
**請求 Body**：
```json
{
  "status": "on_time",
  "reason": "系統故障期間手動補登"
}
```
**行為**：若 AttendanceRecord 已存在則更新，若不存在則建立（`isManual: true`）  
**稽核**：寫入 AuditLog（event_type: `manual_attendance_override`，含 oldValue、newValue、reason）  
**回應 200**：更新後的 AttendanceRecord 物件

---

## 5. 請假管理（/api/leave）

### POST /api/leave
**說明**：管理員為學生新增請假記錄  
**權限**：admin  
**請求 Body**：
```json
{
  "studentId": "cuid",
  "sessionId": "cuid",
  "reason": "病假"
}
```
**行為**：
1. 建立 LeaveRecord
2. 將該 AttendanceRecord 的 status 更新為 `leave`（若不存在則建立，`isManual: true`）
3. 寫入 AuditLog

**回應 201**：`{ "message": "請假記錄已新增" }`

---

## 6. 使用者與角色管理（/api/users）

### PUT /api/users/:id/role
**說明**：管理員變更其他使用者角色  
**權限**：admin（不可變更自身角色）  
**請求 Body**：`{ "role": "admin" }` 或 `{ "role": "student" }`  
**稽核**：寫入 AuditLog（event_type: `role_change`，含 oldValue、newValue）  
**回應 200**：`{ "message": "角色已更新" }`  
**回應 400**：不可修改自身角色  
**回應 404**：使用者不存在

---

## 7. 稽核日誌（/api/audit-logs）

### GET /api/audit-logs
**說明**：查詢稽核日誌  
**權限**：admin  
**查詢參數**：
- `eventType`（選填）：`export_attendance | manual_attendance_override | void_session | role_change | delete_student_data`
- `actorEmail`（選填）：操作者 Email
- `startDate`（選填）：UTC+8 日期
- `endDate`（選填）：UTC+8 日期
- `page`（選填，預設 1）、`pageSize`（選填，預設 50）

**回應 200**：
```json
{
  "total": 128,
  "page": 1,
  "pageSize": 50,
  "logs": [
    {
      "id": "cuid",
      "eventType": "export_attendance",
      "actorEmail": "admin@school.edu",
      "target": { "courseId": "cuid", "courseName": "資料結構" },
      "reason": null,
      "createdAt": "2026-05-20T10:30:00+08:00"
    }
  ]
}
```

---

## 8. 個資刪除（/api/students/:id/data）

### DELETE /api/students/:id/data
**說明**：刪除特定學生所有個人資料（支援個資法部分合規）  
**權限**：admin  
**行為**：
1. 顯示二次確認（前端處理，需傳入 `?confirmed=true`）
2. 刪除 User 記錄及 Account/Session
3. 清除 Student.googleEmail、Student.userId、Student.name（匿名化）
4. 清除 AttendanceRecord.ipAddress、AttendanceRecord.userAgent

**稽核**：寫入 AuditLog（event_type: `delete_student_data`）  
**回應 200**：`{ "message": "學生個人資料已刪除" }`  
**注意**：AttendanceRecord 的點名狀態與時間戳不刪除，學號保留（用於歷史統計）

---

## 共用錯誤碼

| HTTP 狀態碼 | 情境 |
|------------|------|
| 400 | 驗證失敗、格式錯誤、超出匯出上限 |
| 401 | 未登入 |
| 403 | 權限不足（role 不符） |
| 404 | 資源不存在 |
| 409 | 衝突（重複資料、重複點名） |
| 500 | 伺服器內部錯誤 |
