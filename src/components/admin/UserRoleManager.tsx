"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"
import { useToast } from "@/components/shared/ToastProvider"

interface UserRow {
  id: string
  email: string
  name: string | null
  role: "admin" | "student"
}

export function UserRoleManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [pendingChange, setPendingChange] = useState<{ user: UserRow; role: "admin" | "student" } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const adminCount = useMemo(() => users.filter((user) => user.role === "admin").length, [users])

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return users.filter((user) => {
      const matchesQuery =
        !needle ||
        user.email.toLowerCase().includes(needle) ||
        (user.name ?? "").toLowerCase().includes(needle)
      const matchesRole = roleFilter === "all" || user.role === roleFilter
      return matchesQuery && matchesRole
    })
  }, [query, roleFilter, users])

  function isLastAdmin(user: UserRow) {
    return user.role === "admin" && adminCount <= 1
  }

  async function updateRole() {
    if (!pendingChange) return
    setError("")
    const response = await fetch(`/api/users/${pendingChange.user.id}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: pendingChange.role })
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "角色更新失敗")
      return
    }
    showToast("使用者角色已更新", "success")
    setPendingChange(null)
    startTransition(() => router.refresh())
  }

  async function deleteUser() {
    if (!pendingDelete) return
    setError("")
    const response = await fetch(`/api/users/${pendingDelete.id}`, { method: "DELETE" })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "刪除使用者失敗")
      return
    }
    showToast("使用者已刪除", "success")
    setPendingDelete(null)
    startTransition(() => router.refresh())
  }

  return (
    <section className="panel">
      <div className="toolbar">
        <input placeholder="搜尋 Email 或姓名" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="all">全部角色</option>
          <option value="admin">admin</option>
          <option value="student">student</option>
        </select>
        <span className="text-muted">目前管理員 {adminCount} 位</span>
      </div>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
      {filteredUsers.length === 0 ? (
        <div className="empty-state">沒有符合條件的使用者</div>
      ) : (
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>姓名</th>
            <th>角色</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user) => {
            const isSelf = user.id === currentUserId
            const lastAdmin = isLastAdmin(user)
            const deleteDisabled = isPending || isSelf || lastAdmin
            const deleteTitle = isSelf
              ? "不可刪除自己"
              : lastAdmin
                ? "系統至少需保留 1 位管理員"
                : ""
            return (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.name ?? "-"}</td>
                <td>
                  <select
                    value={user.role}
                    disabled={isPending || isSelf || lastAdmin}
                    onChange={(event) =>
                      setPendingChange({ user, role: event.target.value as "admin" | "student" })
                    }
                  >
                    <option value="student">student</option>
                    <option value="admin">admin</option>
                  </select>
                  {isSelf && <span style={{ marginLeft: 8 }}>不可修改自身</span>}
                  {!isSelf && lastAdmin && <span style={{ marginLeft: 8 }}>最後一位管理員</span>}
                </td>
                <td>
                  <button
                    className="btn secondary"
                    type="button"
                    disabled={deleteDisabled}
                    title={deleteTitle}
                    onClick={() => setPendingDelete(user)}
                  >
                    刪除
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      )}
      <Dialog title="確認角色變更" open={pendingChange !== null} onClose={() => setPendingChange(null)}>
        <p>
          將 {pendingChange?.user.email} 的角色改為 {pendingChange?.role}。此操作會影響後台權限。
        </p>
        <div className="toolbar dialog-actions">
          <button className="btn secondary" type="button" disabled={isPending} onClick={() => setPendingChange(null)}>
            取消
          </button>
          <button className="btn" type="button" disabled={isPending} onClick={updateRole}>
            確認變更
          </button>
        </div>
      </Dialog>
      <Dialog title="確認刪除使用者" open={pendingDelete !== null} onClose={() => setPendingDelete(null)}>
        <p>
          確定要刪除 {pendingDelete?.email}？此操作會移除其登入帳號與 OAuth 連結，
          並保留其過往點名 Session 與稽核紀錄（操作者欄位將顯示為已刪除）。
        </p>
        <div className="toolbar dialog-actions">
          <button className="btn secondary" type="button" disabled={isPending} onClick={() => setPendingDelete(null)}>
            取消
          </button>
          <button className="btn" type="button" disabled={isPending} onClick={deleteUser}>
            確認刪除
          </button>
        </div>
      </Dialog>
    </section>
  )
}
