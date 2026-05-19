import { describe, expect, it } from "vitest"
import { resolveSignInRole } from "@/lib/auth-role"

describe("NextAuth role resolution", () => {
  it("assigns admin for allowlisted email", () => {
    expect(resolveSignInRole("Admin@Example.edu", null, "admin@example.edu")).toBe("admin")
  })

  it("assigns student for a first login outside the allowlist", () => {
    expect(resolveSignInRole("student@example.edu", null, "admin@example.edu")).toBe("student")
  })

  it("preserves existing roles", () => {
    expect(resolveSignInRole("admin@example.edu", "student", "admin@example.edu")).toBe("student")
    expect(resolveSignInRole("student@example.edu", "admin", "")).toBe("admin")
  })

  it("defaults all new users to student when ADMIN_EMAILS is empty", () => {
    expect(resolveSignInRole("admin@example.edu", null, "")).toBe("student")
    expect(resolveSignInRole("admin@example.edu", null, undefined)).toBe("student")
  })

  it("compares admin emails case-insensitively", () => {
    expect(resolveSignInRole("TEACHER@SCHOOL.EDU", null, "teacher@school.edu")).toBe("admin")
  })
})
