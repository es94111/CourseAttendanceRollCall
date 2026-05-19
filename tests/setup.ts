import "@testing-library/jest-dom/vitest"

process.env.QR_SECRET ??= "test-secret-with-at-least-thirty-two-characters"
process.env.NEXTAUTH_SECRET ??= "test-nextauth-secret-with-thirty-two-characters"
process.env.NEXTAUTH_URL ??= "http://localhost:3000"
process.env.ADMIN_EMAILS ??= "admin@example.edu"
