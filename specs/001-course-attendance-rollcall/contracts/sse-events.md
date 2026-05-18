# SSE 事件結構契約

**日期**：2026-05-18 | **功能**：001-course-attendance-rollcall

本系統透過 **Server-Sent Events（SSE）** 實現兩類即時資料推送，符合 TC-005 約束。  
所有時間戳記以 **UTC+8（ISO 8601）** 格式推送。

---

## 端點一：點名 Session QR Code 串流

**路由**：`GET /api/sessions/:id/stream`  
**權限**：admin（需有效 Session Cookie）  
**Content-Type**：`text/event-stream`  
**說明**：管理員開啟 QR Code 顯示頁面後連線，每 15 秒接收新的 QR Code Token 與圖片。Session 關閉、逾時或作廢時，推送終止事件。

### 事件類型

#### `qrcode_update`（每 15 秒推送一次）
```
event: qrcode_update
data: {
  "token": "base64url_encoded_hmac_token",
  "qrcodeDataUrl": "data:image/png;base64,...",
  "slot": 1747612800,
  "expiresAt": "2026-05-20T09:00:15+08:00",
  "remainingSeconds": 15
}

```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `token` | string | HMAC 簽名 Token（學生點名時傳給 API） |
| `qrcodeDataUrl` | string | Base64 PNG 圖片（可直接放 `<img src>` 顯示） |
| `slot` | number | 當前時間槽（Unix 時間 / 15 的整數部分） |
| `expiresAt` | string | Token 到期時間（UTC+8 ISO 8601） |
| `remainingSeconds` | number | 距離下次更新的剩餘秒數（倒數計時用） |

---

#### `attendance_count`（每次有學生完成點名時推送）
```
event: attendance_count
data: {
  "sessionId": "cuid",
  "onTimeCount": 25,
  "lateCount": 3,
  "totalCount": 28,
  "enrolledCount": 35,
  "latest": {
    "studentName": "王小明",
    "studentCode": "B11234567",
    "status": "on_time",
    "attendedAt": "2026-05-20T09:03:45+08:00"
  }
}

```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `sessionId` | string | 點名 Session ID |
| `onTimeCount` | number | 準時人數 |
| `lateCount` | number | 遲到人數 |
| `totalCount` | number | 已點名總人數 |
| `enrolledCount` | number | 應點名學生總數 |
| `latest` | object | 最新點名的學生資訊（隱私：僅顯示姓名前綴，如「王○○」） |

---

#### `session_status_changed`（Session 狀態變更時推送）
```
event: session_status_changed
data: {
  "sessionId": "cuid",
  "oldStatus": "active",
  "newStatus": "closed",
  "changedAt": "2026-05-20T10:30:00+08:00"
}

```
**觸發時機**：
- 管理員手動關閉 → `active` → `closed`
- 自動逾時 → `active` → `expired`
- 管理員作廢 → 任意 → `voided`

前端收到此事件後應關閉 EventSource 連線並顯示對應提示。

---

#### `error`（伺服器端錯誤時推送）
```
event: error
data: {
  "code": "SESSION_NOT_FOUND",
  "message": "點名 Session 不存在或無權存取"
}

```

**前端行為**：收到 `error` 事件後關閉連線，顯示錯誤訊息。

---

## 端點二：出席統計即時串流

**路由**：`GET /api/courses/:courseId/statistics/stream`  
**權限**：admin  
**Content-Type**：`text/event-stream`  
**說明**：管理員查看統計頁面時連線，每當有新的點名記錄、補登或請假時，推送最新統計資料。

### 事件類型

#### `statistics_update`（有出席記錄變動時推送）
```
event: statistics_update
data: {
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
  ],
  "updatedAt": "2026-05-20T09:05:30+08:00"
}

```

---

## 前端使用範例

```typescript
// QR Code 串流（管理員點名頁）
const es = new EventSource(`/api/sessions/${sessionId}/stream`)

es.addEventListener('qrcode_update', (event) => {
  const data = JSON.parse(event.data)
  document.querySelector('#qrcode').src = data.qrcodeDataUrl
  startCountdown(data.remainingSeconds)
})

es.addEventListener('attendance_count', (event) => {
  const data = JSON.parse(event.data)
  updateAttendanceCounter(data.onTimeCount, data.lateCount, data.totalCount)
})

es.addEventListener('session_status_changed', (event) => {
  const data = JSON.parse(event.data)
  if (data.newStatus !== 'active') {
    es.close()
    showSessionClosedMessage(data.newStatus)
  }
})

es.addEventListener('error', (event) => {
  es.close()
  showError(JSON.parse(event.data).message)
})

// 組件卸載時關閉連線
return () => es.close()
```

---

## 注意事項

1. **重連**：`EventSource` 在網路中斷時會自動重連（瀏覽器內建行為），無需前端手動處理。
2. **認證失效**：若 Session 過期，SSE 端點回傳 `401`，`EventSource` 觸發 `onerror`，前端應導向登入頁。
3. **一個管理員端只需一個 EventSource 連線**；多個管理員同時連線同一 Session 是允許的（廣播模式）。
4. **學生點名端不連接 SSE**，點名頁面提交後立即跳轉，無需即時推送。
