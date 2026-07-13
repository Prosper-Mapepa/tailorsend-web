import "server-only";
import Stripe from "stripe";
import {
  CREDIT_PACKS,
  FLEX_PRICE_CENTS,
  SEASON_PRICE_CENTS,
  FLEX_MONTHLY_KITS,
  SEASON_TOTAL_KITS,
  SEASON_MONTHS,
  isStudentEmail,
  packById,
  type CreditPack,
} from "./plans";

export type CheckoutKind = "pack" | "flex" | "season";

let stripeClient: Stripe | null = null;

export function isStripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function appBaseUrl(): string {
  const url =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function packUnitPriceCents(pack: CreditPack, email: string): number {
  const student = isStudentEmail(email);
  if (student && pack.studentPriceCents != null) {
    return pack.studentPriceCents;
  }
  return pack.priceCents;
}

export function checkoutLineItems(
  kind: CheckoutKind,
  email: string,
  packId?: string,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  if (kind === "pack") {
    const pack = packById(packId ?? "");
    if (!pack) throw new Error("Unknown credit pack.");
    return [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: packUnitPriceCents(pack, email),
          product_data: {
            name: `TailorSend ${pack.label}`,
            description: `${pack.kits} application kits (tailor, autofill, or incorporate)`,
          },
        },
      },
    ];
  }

  if (kind === "flex") {
    return [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: FLEX_PRICE_CENTS,
          recurring: { interval: "month" },
          product_data: {
            name: "TailorSend Flex",
            description: `${FLEX_MONTHLY_KITS} application kits per month · pause up to 30 days`,
          },
        },
      },
    ];
  }

  return [
    {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: SEASON_PRICE_CENTS,
        product_data: {
          name: "TailorSend Season Pass",
          description: `${SEASON_TOTAL_KITS} kits over ${SEASON_MONTHS} months`,
        },
      },
    },
  ];
}

export function checkoutMode(
  kind: CheckoutKind,
): Stripe.Checkout.SessionCreateParams.Mode {
  return kind === "flex" ? "subscription" : "payment";
}

export { CREDIT_PACKS };
