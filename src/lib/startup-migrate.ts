import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

declare global {
  var __rollcallMigrated: Promise<void> | undefined
}

const DEFAULT_MAX_ATTEMPTS = 12
const DEFAULT_RETRY_DELAY_MS = 5_000
const DEFAULT_COMMAND_TIMEOUT_MS = 15_000

type SpawnSyncResult = {
  stdout?: string | null
  stderr?: string | null
  error?: Error
  status: number | null
}

export type StartupMigrateOptions = {
  maxAttempts?: number
  retryDelayMs?: number
  commandTimeoutMs?: number
  prismaBin?: string
  sleep?: (delayMs: number) => Promise<void>
  spawn?: (
    command: string,
    args: string[],
    options: { encoding: "utf8"; env: NodeJS.ProcessEnv; timeout: number }
  ) => SpawnSyncResult
}

export function runStartupMigrations(): Promise<void> {
  if (globalThis.__rollcallMigrated) return globalThis.__rollcallMigrated
  const migration = executeStartupMigrations()
  globalThis.__rollcallMigrated = migration.catch((error: unknown) => {
    globalThis.__rollcallMigrated = undefined
    throw error
  })
  return globalThis.__rollcallMigrated
}

export async function executeStartupMigrations(options: StartupMigrateOptions = {}): Promise<void> {
  if (process.env.SKIP_STARTUP_MIGRATE === "true") {
    console.log("[startup-migrate] SKIP_STARTUP_MIGRATE=true, skipping prisma migrate deploy")
    return
  }
  if (!process.env.DATABASE_URL) {
    console.warn("[startup-migrate] DATABASE_URL not set, skipping prisma migrate deploy")
    return
  }

  const prismaBin = options.prismaBin ?? resolvePrismaBinary()
  if (!prismaBin) {
    throw new Error(
      "[startup-migrate] prisma CLI not found. Ensure `prisma` is in `dependencies` (not just devDependencies) so it ships in production."
    )
  }

  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma")
  const maxAttempts = readPositiveInteger(
    options.maxAttempts,
    process.env.STARTUP_MIGRATE_MAX_ATTEMPTS,
    DEFAULT_MAX_ATTEMPTS
  )
  const retryDelayMs = readPositiveInteger(
    options.retryDelayMs,
    process.env.STARTUP_MIGRATE_RETRY_DELAY_MS,
    DEFAULT_RETRY_DELAY_MS
  )
  const commandTimeoutMs = readPositiveInteger(
    options.commandTimeoutMs,
    process.env.STARTUP_MIGRATE_COMMAND_TIMEOUT_MS,
    DEFAULT_COMMAND_TIMEOUT_MS
  )
  const sleep = options.sleep ?? delay
  const run = options.spawn ?? defaultSpawn
  const args = [prismaBin, "migrate", "deploy", `--schema=${schemaPath}`]

  console.log(
    `[startup-migrate] Running prisma migrate deploy (cli=${prismaBin}, schema=${schemaPath}, maxAttempts=${maxAttempts})...`
  )

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = run(process.execPath, args, {
      encoding: "utf8",
      env: process.env,
      timeout: commandTimeoutMs
    })

    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)

    const details = getFailureDetails(result)
    if (result.status === 0) {
      console.log("[startup-migrate] prisma migrate deploy completed")
      return
    }

    const retryable = isRetryableMigrationFailure(details)
    if (!retryable || attempt === maxAttempts) {
      const exitCode = result.status === null ? "unknown" : result.status
      throw new Error(
        `[startup-migrate] prisma migrate deploy failed with exit code ${exitCode}${
          details ? `\n${details}` : ""
        }`
      )
    }

    console.warn(
      `[startup-migrate] database is not ready (attempt ${attempt}/${maxAttempts}); retrying in ${retryDelayMs}ms...`
    )
    await sleep(retryDelayMs)
  }
}

export function isRetryableMigrationFailure(details: string): boolean {
  return [
    /\bP1001\b/i,
    /\bP1002\b/i,
    /\bP1008\b/i,
    /\bP1017\b/i,
    /ECONNREFUSED/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i,
    /ENOTFOUND/i,
    /EAI_AGAIN/i,
    /can't reach database server/i,
    /connection refused/i,
    /connection timed out/i,
    /server closed the connection unexpectedly/i
  ].some((pattern) => pattern.test(details))
}

function getFailureDetails(result: SpawnSyncResult): string {
  return [result.error?.message, result.stderr?.trim(), result.stdout?.trim()]
    .filter(Boolean)
    .join("\n")
}

function defaultSpawn(
  command: string,
  args: string[],
  options: { encoding: "utf8"; env: NodeJS.ProcessEnv; timeout: number }
): SpawnSyncResult {
  return spawnSync(command, args, options)
}

function readPositiveInteger(
  explicitValue: number | undefined,
  environmentValue: string | undefined,
  fallback: number
): number {
  const value = explicitValue ?? Number(environmentValue)
  return Number.isInteger(value) && value > 0 ? value : fallback
}

function delay(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

function resolvePrismaBinary(): string | null {
  const candidates = [
    path.join(process.cwd(), ".prisma-cli", "node_modules", "prisma", "build", "index.js"),
    path.join(process.cwd(), "node_modules", "prisma", "build", "index.js")
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}
