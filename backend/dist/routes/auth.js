import { Router } from "express";
import { z } from "zod";
import { config, isDev } from "../config.js";
import { prisma } from "../db.js";
import { sendPasswordResetEmail } from "../lib/email.js";
import { hashPassword, validatePassword, verifyPassword } from "../lib/password.js";
import { createSession, deleteSession, requireAuth, } from "../middleware/auth.js";
import { generateToken, hashToken, resetExpiry } from "../lib/tokens.js";
const router = Router();
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().trim().min(1).max(120).optional(),
});
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
const forgotSchema = z.object({
    email: z.string().email(),
});
const resetSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(8),
});
function userPayload(user) {
    return { id: user.id, email: user.email, name: user.name };
}
router.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
        return;
    }
    const { email, password, name } = parsed.data;
    const passwordError = validatePassword(password);
    if (passwordError) {
        res.status(400).json({ error: passwordError });
        return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
        res.status(409).json({ error: "An account with this email already exists." });
        return;
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
        data: {
            email: normalizedEmail,
            name: name?.trim() ?? "",
            passwordHash,
            profile: {
                create: {
                    email: normalizedEmail,
                    fullName: name?.trim() ?? "",
                },
            },
        },
    });
    const token = await createSession(user.id);
    res.status(201).json({ token, user: userPayload(user) });
});
router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Email and password are required." });
        return;
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
    }
    const token = await createSession(user.id);
    res.json({ token, user: userPayload(user) });
});
router.post("/logout", requireAuth, async (req, res) => {
    if (req.sessionId)
        await deleteSession(req.sessionId);
    res.json({ ok: true });
});
router.get("/me", requireAuth, async (req, res) => {
    res.json({ user: req.user });
});
router.post("/forgot-password", async (req, res) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "A valid email is required." });
        return;
    }
    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to avoid email enumeration.
    const generic = {
        message: "If an account exists for that email, a reset link has been sent.",
    };
    if (!user) {
        res.json(generic);
        return;
    }
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    const rawToken = generateToken();
    await prisma.passwordResetToken.create({
        data: {
            userId: user.id,
            tokenHash: hashToken(rawToken),
            expiresAt: resetExpiry(),
        },
    });
    const resetUrl = `${config.appUrl}/reset-password?token=${rawToken}`;
    try {
        const result = await sendPasswordResetEmail(email, resetUrl);
        res.json({
            ...generic,
            ...(isDev() && result.devLink ? { devResetLink: result.devLink } : {}),
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/reset-password", async (req, res) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
        return;
    }
    const { token, password } = parsed.data;
    const passwordError = validatePassword(password);
    if (passwordError) {
        res.status(400).json({ error: passwordError });
        return;
    }
    const tokenHash = hashToken(token);
    const reset = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: true },
    });
    if (!reset || reset.expiresAt < new Date()) {
        res.status(400).json({ error: "Reset link is invalid or has expired." });
        return;
    }
    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
        prisma.user.update({
            where: { id: reset.userId },
            data: { passwordHash },
        }),
        prisma.passwordResetToken.delete({ where: { id: reset.id } }),
        prisma.session.deleteMany({ where: { userId: reset.userId } }),
    ]);
    const sessionToken = await createSession(reset.userId);
    res.json({
        message: "Password updated. You are now signed in.",
        token: sessionToken,
        user: userPayload(reset.user),
    });
});
export default router;
