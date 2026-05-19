export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { runStartupMigrations } = await import("./lib/startup-migrate")
  await runStartupMigrations()
}
