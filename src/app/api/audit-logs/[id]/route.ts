import { error } from "@/lib/api"

export function PUT() {
  return error("Method Not Allowed", 405)
}

export function PATCH() {
  return error("Method Not Allowed", 405)
}

export function DELETE() {
  return error("Method Not Allowed", 405)
}
