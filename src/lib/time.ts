export function toTaipeiIso(date: Date | string | null | undefined) {
  if (!date) return null
  const value = typeof date === "string" ? new Date(date) : date
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(value)
  return `${parts.replace(" ", "T")}+08:00`
}

export function taipeiDateTimeToDate(value: string) {
  return new Date(value)
}

export function startOfTaipeiDay(value: string) {
  return new Date(`${value}T00:00:00+08:00`)
}

export function endOfTaipeiDay(value: string) {
  return new Date(`${value}T23:59:59.999+08:00`)
}
