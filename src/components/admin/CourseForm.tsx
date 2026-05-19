"use client"

export function CourseForm({ course }: { course?: any }) {
  return (
    <form className="panel">
      <div className="field">
        <label>課程名稱</label>
        <input name="name" defaultValue={course?.name ?? ""} required />
      </div>
      <div className="field">
        <label>星期</label>
        <select name="dayOfWeek" defaultValue={course?.dayOfWeek ?? 1}>
          {["日", "一", "二", "三", "四", "五", "六"].map((label, index) => (
            <option key={index} value={index}>
              週{label}
            </option>
          ))}
        </select>
      </div>
      <div className="toolbar">
        <div className="field">
          <label>開始</label>
          <input name="startTime" type="time" defaultValue={course?.startTime ?? "09:00"} />
        </div>
        <div className="field">
          <label>結束</label>
          <input name="endTime" type="time" defaultValue={course?.endTime ?? "12:00"} />
        </div>
        <div className="field">
          <label>遲到分鐘</label>
          <input name="lateThresholdMinutes" type="number" min={0} defaultValue={course?.lateThresholdMinutes ?? 0} />
        </div>
      </div>
      <button className="btn" type="submit">
        儲存
      </button>
    </form>
  )
}
