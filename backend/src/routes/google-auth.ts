import { Router } from "express";
import { prisma } from "../db.js";
import { createSession } from "../middleware/auth.js";
import {
  createOAuthState,
  exchangeGoogleCode,
  googleAuthUrl,
  isGoogleAuthConfigured,
  oauthCallbackRedirect,
  verifyOAuthState,
} from "../lib/google-oauth.js";

const router = Router();

router.get("/google", (_req, res) => {
  if (!isGoogleAuthConfigured()) {
    res.status(503).json({
      error:
        "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    });
    return;
  }

  const state = createOAuthState();
  res.redirect(googleAuthUrl(state));
});

router.get("/google/callback", async (req, res) => {
  if (!isGoogleAuthConfigured()) {
    res.redirect(oauthCallbackRedirect({ error: "google_not_configured" }));
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const googleError =
    typeof req.query.error === "string" ? req.query.error : "";

  if (googleError) {
    res.redirect(
      oauthCallbackRedirect({
        error: googleError === "access_denied" ? "cancelled" : googleError,
      }),
    );
    return;
  }

  if (!code || !state || !verifyOAuthState(state)) {
    res.redirect(oauthCallbackRedirect({ error: "invalid_state" }));
    return;
  }

  try {
    const profile = await exchangeGoogleCode(code);
    const email = profile.email.toLowerCase().trim();
    const displayName =
      profile.name?.trim() ||
      [profile.given_name, profile.family_name].filter(Boolean).join(" ").trim() ||
      email.split("@")[0] ||
      "";

    let isNewUser = false;
    let user = await prisma.user.findUnique({
      where: { googleId: profile.id },
    });

    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        if (byEmail.googleId && byEmail.googleId !== profile.id) {
          res.redirect(oauthCallbackRedirect({ error: "account_conflict" }));
          return;
        }
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: {
            googleId: profile.id,
            name: byEmail.name || displayName,
          },
        });
      } else {
        isNewUser = true;
        user = await prisma.user.create({
          data: {
            email,
            name: displayName,
            googleId: profile.id,
            profile: {
              create: {
                email,
                fullName: displayName,
              },
            },
          },
        });
      }
    }

    const token = await createSession(user.id);
    res.redirect(oauthCallbackRedirect({ token, newUser: isNewUser }));
  } catch (err) {
    console.error("[google/oauth]", err);
    res.redirect(oauthCallbackRedirect({ error: "google_auth_failed" }));
  }
});

export default router;
