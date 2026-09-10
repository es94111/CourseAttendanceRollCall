import { afterEach, describe, expect, it, vi } from "vitest"
import {
  executeStartupMigrations,
  isRetryableMigrationFailure,
  type StartupMigrateOptions
} from "@/lib/startup-migrate"

const originalDatabaseUrl = process.env.DATABASE_URL
const originalSkipStartupMigrate = process.env.SKIP_STARTUP_MIGRATE

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = originalDatabaseUrl

  if (originalSkipStartupMigrate === undefined) delete process.env.SKIP_STARTUP_MIGRATE
  else process.env.SKIP_STARTUP_MIGRATE = originalSkipStartupMigrate
})

describe("isRetryableMigrationFailure", () => {
  it("recognizes temporary database connectivity failures", () => {
    expect(
      isRetryableMigrationFailure(
        "Error: P1001: Can't reach database server at postgres.railway.internal:5432"
      )
    ).toBe(true)
    expect(isRetryableMigrationFailure("connect ECONNREFUSED 10.0.0.2:5432")).toBe(true)
  })

  it("does not retry migration or configuration failures", () => {
    expect(isRetryableMigrationFailure("P3009: migrate found failed migrations")).toBe(false)
    expect(isRetryableMigrationFailure("P1013: invalid database string")).toBe(false)
  })
})

describe("executeStartupMigrations", () => {
  it("retries a temporary database failure and succeeds once the database is ready", async () => {
    process.env.DATABASE_URL = "postgresql://postgres:password@db:5432/rollcall"
    const spawn = vi
      .fn<NonNullable<StartupMigrateOptions["spawn"]>>()
      .mockReturnValueOnce({
        status: 1,
        stderr: "Error: P1001: Can't reach database server"
      })
      .mockReturnValueOnce({ status: 0, stdout: "All migrations have been applied." })
    const sleep = vi.fn(async () => {})

    await executeStartupMigrations({
      prismaBin: "/app/.prisma-cli/node_modules/prisma/build/index.js",
      maxAttempts: 2,
      retryDelayMs: 25,
      sleep,
      spawn
    })

    expect(spawn).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(25)
  })

  it("fails immediately for a non-connectivity migration error", async () => {
    process.env.DATABASE_URL = "postgresql://postgres:password@db:5432/rollcall"
    const spawn = vi.fn<NonNullable<StartupMigrateOptions["spawn"]>>().mockReturnValue({
      status: 1,
      stderr: "P3009: migrate found failed migrations"
    })
    const sleep = vi.fn(async () => {})

    await expect(
      executeStartupMigrations({
        prismaBin: "/app/.prisma-cli/node_modules/prisma/build/index.js",
        maxAttempts: 5,
        retryDelayMs: 25,
        sleep,
        spawn
      })
    ).rejects.toThrow("P3009")

    expect(spawn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })
})
