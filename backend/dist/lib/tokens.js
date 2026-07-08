import { createHash, randomBytes } from "node:crypto";
import { config } from "../config.js";
export function hashToken(token) {
    return createHash("sha256")
        .update(`${token}:${config.sessionSecret}`)
        .digest("hex");
}
export function generateToken(bytes = 32) {
    return randomBytes(bytes).toString("hex");
}
export function sessionExpiry() {
    const ms = config.sessionDays * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ms);
}
export function resetExpiry() {
    const ms = config.resetTokenHours * 60 * 60 * 1000;
    return new Date(Date.now() + ms);
}
export function extractBearer(header) {
    if (!header)
        return null;
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token)
        return null;
    return token.trim();
}
