import path from "node:path"
import { defineConfig } from "prisma/config"

try {
  await import("dotenv/config")
} catch {
  // dotenv unavailable (e.g. Next standalone production bundle).
  // Env vars come from the deployment platform directly.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations")
  },
  datasource: {
    url: process.env.DATABASE_URL ?? ""
  }
})
