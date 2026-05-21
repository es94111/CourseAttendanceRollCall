import { stringify } from "csv-stringify/sync"
import { toTaipeiIso } from "@/lib/time"
import { formatIpLocation } from "@/lib/request-ip"

const FORMULA_PREFIX = /^[=+\-@\t\r]/

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  return FORMULA_PREFIX.test(text) ? `'${text}` : text
}

export function attendanceRowsToCsv(rows: Array<Record<string, any>>) {
  return stringify(
    rows.map((row) => ({
      學生姓名: sanitizeCsvCell(row.student?.name ?? row.name ?? ""),
      學號: sanitizeCsvCell(row.student?.studentCode ?? row.studentCode ?? ""),
      課次日期: sanitizeCsvCell(toTaipeiIso(row.session?.createdAt ?? row.createdAt) ?? ""),
      點名狀態: sanitizeCsvCell(row.status),
      點名時間: sanitizeCsvCell(toTaipeiIso(row.attendedAt) ?? ""),
      "IP 位址": sanitizeCsvCell(row.ipAddress ?? ""),
      "IP 國家": sanitizeCsvCell(formatIpLocation(row.ipCountry, row.ipCountryName)),
      裝置資訊: sanitizeCsvCell(row.userAgent ?? "")
    })),
    { header: true }
  )
}
