"use client"

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
  return (
    <button
      className="btn secondary"
      type="button"
      onClick={() => {
        if (window.confirm(`${title}\n${message}`)) onConfirm()
      }}
    >
      {confirmText}
    </button>
  )
}
