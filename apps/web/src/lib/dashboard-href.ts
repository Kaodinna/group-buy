import type { Role } from "@/types/user";

export function dashboardHrefFor(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "SELLER") return "/seller";
  return "/dashboard";
}
