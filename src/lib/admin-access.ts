export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: { email: string; role: string }): boolean {
  if (user.role === "admin") return true;
  return adminEmails().includes(user.email.toLowerCase());
}
