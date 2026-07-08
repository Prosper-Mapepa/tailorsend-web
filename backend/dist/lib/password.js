import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;
export async function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const derived = (await scryptAsync(password, salt, KEY_LEN));
    return `${salt}:${derived.toString("hex")}`;
}
export async function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash)
        return false;
    const derived = (await scryptAsync(password, salt, KEY_LEN));
    const hashBuf = Buffer.from(hash, "hex");
    if (hashBuf.length !== derived.length)
        return false;
    return timingSafeEqual(hashBuf, derived);
}
export function validatePassword(password) {
    if (password.length < 8)
        return "Password must be at least 8 characters.";
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return "Password must include at least one letter and one number.";
    }
    return null;
}
