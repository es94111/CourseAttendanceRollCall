import { spawnSync } from "node:child_process"
import path from "node:path"
import { existsSync } from "node:fs"

declare global {
  // eslint-disable-next-line no-var
  var __rollcallMigrated: Promise<void> | undefined
}

export function runStartupMigrations(): Promise<void> {
  if (globalThis.__rollcallMigrated) return globalThis.__rollcallMigrated
  globalThis.__rollcallMigrated = execute()
  return globalThis.__rollcallMigrated
}

async function execute(): Promise<void> {
  if (process.env.SKIP_STARTUP_MIGRATE === "true") {
    console.log("[startup-migrate] SKIP_STARTUP_MIGRATE=true, skipping prisma migrate deploy")
    return
  }
  if (!process.env.DATABASE_URL) {
    console.warn("[startup-migrate] DATABASE_URL not set, skipping prisma migrate deploy")
    return
  }

  const prismaBin = resolvePrismaBinary()
  if (!prismaBin) {
    throw new Error(
      "[startup-migrate] prisma CLI not found. Ensure `prisma` is in `dependencies` (not just devDependencies) so it ships in production."
    )
  }

  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma")
  console.log(`[startup-migrate] Running prisma migrate deploy (schema=${schemaPath})...`)

  const result = spawnSync(process.execPath, [prismaBin, "migrate", "deploy", `--schema=${schemaPath}`], {
    stdio: "inherit",
    env: process.env
  })

  if (result.status !== 0) {
    throw new Error(`[startup-migrate] prisma migrate deploy failed with exit code ${result.status}`)
  }
  console.log("[startup-migrate] prisma migrate deploy completed")
}

function resolvePrismaBinary(): string | null {
  const candidates = [
    path.join(process.cwd(), "node_modules", "prisma", "build", "index.js"),
    path.join(process.cwd(), ".prisma-cli", "node_modules", "prisma", "build", "index.js")
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}
