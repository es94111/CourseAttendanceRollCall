"use client"

import { useState } from "react"
import { Dialog } from "@/components/shared/Dialog"

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  confirmText = "確認"
}: {
  title: string
  message: string
  onConfirm: () => void
  confirmText?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn secondary" type="button" onClick={() => setOpen(true)}>
        {confirmText}
      </button>
      <Dialog title={title} open={open} onClose={() => setOpen(false)}>
        <p>{message}</p>
        <div className="toolbar dialog-actions">
          <button className="btn secondary" type="button" onClick={() => setOpen(false)}>
            取消
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setOpen(false)
              onConfirm()
            }}
          >
            {confirmText}
          </button>
        </div>
      </Dialog>
    </>
  )
}
