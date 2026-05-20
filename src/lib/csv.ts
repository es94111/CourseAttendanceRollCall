import { stringify } from "csv-stringify/sync"
import { toTaipeiIso } from "@/lib/time"
import { formatIpLocation } from "@/lib/request-ip"

export function attendanceRowsToCsv(rows: Array<Record<string, any>>) {
  return stringify(
    rows.map((row) => ({
      "學生姓名": row.student?.name ?? row.name ?? "",
      "學號": row.student?.studentCode ?? row.studentCode ?? "",
      "課次日期": toTaipeiIso(row.session?.createdAt ?? row.createdAt) ?? "",
      "點名狀態": row.status,
      "點名時間": toTaipeiIso(row.attendedAt) ?? "",
      "IP 位址": row.ipAddress ?? "",
      "IP 國家": formatIpLocation(row.ipCountry, row.ipCountryName),
      "裝置資訊": row.userAgent ?? ""
    })),
    { header: true }
  )
}
