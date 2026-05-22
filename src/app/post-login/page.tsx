import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function PostLoginPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  if (session.user.role === "admin") redirect("/dashboard")
  redirect("/my-attendance")
}
