# Stripe payments (TailorSend)

## Recommendation: **Stripe Checkout**

Stripe is the best fit for TailorSend because:

- **One integration** handles credit packs (one-time), Season Pass (one-time), and Flex (monthly subscription).
- **Stripe Checkout** hosts the payment UI — PCI compliance, 3D Secure, Apple Pay, and Google Pay without building forms.
- **Webhooks** reliably fulfill kits server-side (never trust the browser redirect alone).
- **Customer Portal** lets Flex subscribers update cards, view invoices, and cancel.
- Works with **Next.js API routes** on Netlify/Railway and your existing Postgres usage ledger.

Alternatives considered:

| Provider | Why not primary |
|----------|-----------------|
| PayPal | Weaker subscription UX; split checkout experience |
| Lemon Squeezy | Good for indie SaaS but less control over custom kit logic |
| Paddle | Merchant of record; higher fees, less ideal for usage-based kits |

---

## What we built

| Product | Stripe mode | Fulfillment |
|---------|-------------|-------------|
| Credit packs (5 / 15 / 40 kits) | `payment` | `addCredits()` |
| Season Pass | `payment` | `setPlan("season")` |
| Flex | `subscription` | `setPlan("flex")` + store `stripeSubscriptionId` |

**API routes**

- `POST /api/billing/checkout` — create Checkout Session, redirect user
- `POST /api/billing/webhook` — Stripe events (fulfillment + cancel)
- `GET /api/billing/confirm` — fast UI refresh after redirect
- `POST /api/billing/portal` — Stripe Customer Portal

**Dev fallback:** If `STRIPE_SECRET_KEY` is unset, the old simulated `POST /api/billing` flow still works.

---

## Setup

### 1. Create a Stripe account

[https://dashboard.stripe.com](https://dashboard.stripe.com) → use **Test mode** first.

### 2. Environment variables

Add to `.env` (local), Netlify, and/or Railway Web service:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=https://tailorsend.cc          # or http://localhost:3000
```

`APP_URL` must match where users land after checkout (used for success/cancel URLs).

### 3. Webhook endpoint

In Stripe Dashboard → **Developers → Webhooks → Add endpoint**:

- **URL:** `https://<your-domain>/api/billing/webhook`
- **Events:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

**Local testing** with Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET` locally.

### 4. Enable Customer Portal

Stripe Dashboard → **Settings → Billing → Customer portal** → enable and save.

### 5. Run migration

```bash
npm run db:migrate
```

Adds `stripeCustomerId`, `stripeSubscriptionId` on `UsageAccount` and `StripeCheckout` for idempotent fulfillment.

---

## Flow

1. User clicks **Checkout** / **Subscribe** on `/billing`.
2. Server creates a Stripe Checkout Session with metadata (`userId`, `kind`, `packId`).
3. User pays on Stripe-hosted page.
4. Stripe sends `checkout.session.completed` → webhook calls `fulfillCheckoutSession()`.
5. User returns to `/billing/success` → confirm endpoint refreshes usage in the UI.
6. Flex cancellations via portal → `customer.subscription.deleted` → downgrade to free.

---

## Student pricing

Pack 15 uses dynamic `price_data` — if the user email matches `.edu`, the checkout amount is the student price ($6). No separate Stripe Price IDs required.

Promotion codes can be enabled in Checkout (`allow_promotion_codes: true`).

---

## Production checklist

- [ ] Switch to `sk_live_...` keys
- [ ] Live webhook endpoint on production domain
- [ ] `APP_URL=https://tailorsend.cc`
- [ ] Test pack purchase, Season Pass, Flex subscribe, Flex cancel via portal
- [ ] Stripe tax settings if you need sales tax (Stripe Tax optional add-on)
