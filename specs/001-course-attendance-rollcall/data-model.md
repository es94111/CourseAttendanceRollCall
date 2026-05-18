# 資料模型：課程點名系統

**日期**：2026-05-18 | **功能**：001-course-attendance-rollcall

---

## 實體關係圖（ER Diagram）

```
User (NextAuth.js)
  ├── Account (NextAuth, Google OAuth)
  ├── Session (NextAuth, DB Session)
  └── (role: admin | student)
       │
       │ user_id (nullable FK, 首次 QR 掃描後設定)
       ▼
Student (學籍檔案，管理員預建)
  ├── student_id (唯一學號)
  ├── google_email (唯一，可為 null)
  └── ◄── CourseEnrollment (多對多)
            │
            │ course_id
            ▼
          Course (課程)
            │
            ▼
          AttendanceSession (點名 Session)
            │
            ▼
          AttendanceRecord (點名記錄)  ◄── LeaveRecord (請假)

AuditLog (稽核日誌，全域)
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ====================================================
// NextAuth.js 所需資料表（@auth/prisma-adapter）
// ====================================================

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          UserRole  @default(student)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // NextAuth 關聯
  accounts Account[]
  sessions Session[]

  // 應用關聯
  student         Student?          // 學生資料（如有）
  createdSessions AttendanceSession[] @relation("CreatedByAdmin")
  auditLogs       AuditLog[]        @relation("ActorUser")

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ====================================================
// 應用業務實體
// ====================================================

enum UserRole {
  admin
  student
}

model Student {
  id           String   @id @default(cuid())
  studentCode  String   @unique                   // 學號
  name         String                              // 姓名
  googleEmail  String?  @unique                   // Google Email（可為 null，首次掃描後設定）
  userId       String?  @unique                   // FK to User（首次掃描 QR Code 後關聯）
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user        User?              @relation(fields: [userId], references: [id])
  enrollments CourseEnrollment[]
  records     AttendanceRecord[]
  leaveRecords LeaveRecord[]

  @@index([googleEmail])
  @@map("students")
}

model Course {
  id                   String      @id @default(cuid())
  name                 String                           // 課程名稱
  dayOfWeek            Int                              // 0=週日 … 6=週六
  startTime            String                           // "HH:MM" 格式（TIME 以字串儲存）
  endTime              String                           // "HH:MM" 格式
  lateThresholdMinutes Int         @default(0)          // 遲到判定門檻（分鐘）
  status               CourseStatus @default(active)
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt

  enrollments CourseEnrollment[]
  sessions    AttendanceSession[]

  @@map("courses")
}

enum CourseStatus {
  active
  archived
}

model CourseEnrollment {
  id        String   @id @default(cuid())
  studentId String
  courseId  String
  createdAt DateTime @default(now())

  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  course  Course  @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([studentId, courseId])
  @@map("course_enrollments")
}

model AttendanceSession {
  id                 String        @id @default(cuid())
  courseId           String
  officialStartTime  DateTime                           // 官方開始時間（遲到判定基準，UTC+8）
  autoExpireMinutes  Int?                               // 自動逾時分鐘數（null = 不自動逾時）
  gracePeriodSeconds Int           @default(60)         // QR Code 掃描寬限期（秒）
  status             SessionStatus @default(active)
  voidReason         String?                            // 作廢原因（status=voided 時填寫）
  createdBy          String                             // 建立者 User.id
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  course   Course             @relation(fields: [courseId], references: [id])
  creator  User               @relation("CreatedByAdmin", fields: [createdBy], references: [id])
  records  AttendanceRecord[]
  leaveRecords LeaveRecord[]

  @@index([courseId, status])
  @@map("attendance_sessions")
}

enum SessionStatus {
  active
  closed
  expired
  voided
}

model AttendanceRecord {
  id          String           @id @default(cuid())
  sessionId   String
  studentId   String
  status      AttendanceStatus
  attendedAt  DateTime?                               // 實際點名時間（UTC+8）
  ipAddress   String?
  userAgent   String?          @db.Text
  isManual    Boolean          @default(false)       // true = 管理員手動補登／覆寫
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  session AttendanceSession @relation(fields: [sessionId], references: [id])
  student Student          @relation(fields: [studentId], references: [id])

  @@unique([sessionId, studentId])
  @@index([sessionId, attendedAt])
  @@map("attendance_records")
}

enum AttendanceStatus {
  on_time   // 準時
  late      // 遲到
  leave     // 請假
  absent    // 缺席
}

model LeaveRecord {
  id        String   @id @default(cuid())
  studentId String
  sessionId String
  reason    String
  createdBy String                                   // 建立者 User.id
  createdAt DateTime @default(now())

  student Student          @relation(fields: [studentId], references: [id])
  session AttendanceSession @relation(fields: [sessionId], references: [id])

  @@map("leave_records")
}

model AuditLog {
  id        String         @id @default(cuid())
  eventType AuditEventType
  actorId   String                                   // 操作者 User.id
  actorEmail String                                  // 操作者 Email（冗餘欄位，防 User 刪除後失去記錄）
  target    Json                                     // 目標物件（含 id、型別等）
  oldValue  Json?                                    // 原始值（補登、覆寫時）
  newValue  Json?                                    // 新值
  reason    String?                                  // 操作原因（補登時必填）
  createdAt DateTime       @default(now())

  actor User @relation("ActorUser", fields: [actorId], references: [id])

  @@index([eventType, createdAt])
  @@index([actorEmail, createdAt])
  @@map("audit_logs")
}

enum AuditEventType {
  export_attendance          // 匯出點名記錄
  manual_attendance_override // 手動補登／覆寫出席記錄
  void_session               // 作廢點名 Session
  role_change                // 變更使用者角色
  delete_student_data        // 刪除學生個人資料
}
```

---

## 實體詳細說明

### User（使用者）
NextAuth.js 管理的認證記錄。`role` 欄位區分管理員與學生。首次以白名單 Email 登入時自動提升為 `admin`。

**驗證規則**：
- `email` MUST 唯一
- `role` MUST 為 `admin` 或 `student`

### Student（學生）
學籍檔案，由管理員預建（CSV 批次或手動逐筆）。`userId` 初始為 null，學生首次掃描 QR Code 完成 Google 登入後關聯至對應 User。

**驗證規則**：
- `studentCode`（學號）MUST 唯一（資料庫層）
- `googleEmail` 若非 null，MUST 唯一（資料庫層 Unique Index，FR-005）
- 同一課程中 studentCode 不可重複（CourseEnrollment 唯一約束）

**狀態轉換**：
```
[管理員建立] → Student (userId=null, googleEmail 可為 null)
     ↓ 首次掃描 QR Code 後
Student (userId=User.id, googleEmail=User.email)
```

### Course（課程）
**驗證規則**：
- `name` 必填
- `dayOfWeek` MUST 為 0-6
- `startTime` / `endTime` MUST 為 "HH:MM" 格式，且 `endTime > startTime`
- `lateThresholdMinutes` MUST ≥ 0

**狀態轉換**：
```
active → archived（軟刪除，資料保留）
archived 不可再建立 active AttendanceSession
```

### AttendanceSession（點名 Session）
**驗證規則**：
- 同一 Course 同一時間 MUST 只能有一個 `active` Session（資料庫層：查詢前檢查）
- `officialStartTime` 預設帶入 Course 排定時間，允許手動調整
- `gracePeriodSeconds` MUST > 0，預設 60

**狀態機**：
```
active ──(手動關閉)──► closed
active ──(逾時)──────► expired
closed │
expired├──(作廢)──────► voided
active ┘
```

**HMAC Token 生成**（伺服器端，不持久化）：
```
slot = Math.floor(Date.now() / 15000)   // 15 秒時間槽
payload = `${sessionId}:${slot}`
token = base64url(payload + "." + HMAC-SHA256(payload, QR_SECRET))
```

### AttendanceRecord（點名記錄）
**驗證規則**：
- `(sessionId, studentId)` MUST 唯一（防重複點名，FR-013）
- 若 `isManual=false`：`attendedAt` MUST NOT NULL；`ipAddress`、`userAgent` 應填寫
- 若 `isManual=true`：稽核日誌 MUST 同時寫入

**遲到判定邏輯**：
```
if attendedAt <= session.officialStartTime + course.lateThresholdMinutes * 60:
  status = on_time
else:
  status = late
```

### AuditLog（稽核日誌）
**不可刪除、不可修改**（僅限 INSERT）。`actorEmail` 為冗餘欄位，確保即使 User 記錄被刪除後仍可追溯操作者。

---

## 出席率計算公式

```
應出席課次 = AttendanceSession 中 status != 'voided' 的數量
出席次數 = AttendanceRecord 中 status = 'on_time' 的數量
出席率 = 出席次數 / 應出席課次 * 100%

各項統計：
- 準時次數：status = on_time
- 遲到次數：status = late
- 請假次數：status = leave
- 缺席次數：應出席課次 - 準時 - 遲到 - 請假
```

---

## 索引策略摘要

| 資料表 | 索引欄位 | 用途 |
|--------|---------|------|
| `students` | `student_code` (UNIQUE) | 學號唯一性 |
| `students` | `google_email` (UNIQUE) | Google Email 唯一性查詢 |
| `course_enrollments` | `(student_id, course_id)` (UNIQUE) | 防重複選課 |
| `attendance_sessions` | `(course_id, status)` | 查詢課程 active Session |
| `attendance_records` | `(session_id, student_id)` (UNIQUE) | 防重複點名 |
| `attendance_records` | `(session_id, attended_at)` | CSV 匯出排序 |
| `audit_logs` | `(event_type, created_at)` | 稽核日誌篩選 |
| `audit_logs` | `(actor_email, created_at)` | 按操作者篩選 |
