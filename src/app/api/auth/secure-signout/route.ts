import { signOut } from "@/lib/auth"

export async function POST() {
  await signOut({ redirect: false })
  return new Response(null, { status: 204 })
}
