import { isAdminUser } from "../lib/admin-access.js";

export function userPayload(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isAdmin: isAdminUser(user),
  };
}
