import "server-only";
import { prisma } from "@/lib/db";
import { addCredits, setPlan } from "@/lib/billing/usage";
import { packById } from "@/lib/billing/plans";
import type { CheckoutKind } from "@/lib/billing/stripe";
import { getStripe } from "@/lib/billing/stripe";

export async function fulfillCheckoutSession(
  sessionId: string,
): Promise<{ alreadyFulfilled: boolean }> {
  const existing = await prisma.stripeCheckout.findUnique({
    where: { sessionId },
  });
  if (existing?.fulfilled) {
    return { alreadyFulfilled: true };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.payment_status !== "paid" && session.status !== "complete") {
    throw new Error("Checkout session is not paid.");
  }

  const userId = session.metadata?.userId;
  const kind = session.metadata?.kind as CheckoutKind | undefined;
  const packId = session.metadata?.packId ?? "";

  if (!userId || !kind) {
    throw new Error("Checkout session missing metadata.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found for checkout.");

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (customerId) {
    await prisma.usageAccount.upsert({
      where: { userId },
      create: { userId, stripeCustomerId: customerId },
      update: { stripeCustomerId: customerId },
    });
  }

  await prisma.stripeCheckout.upsert({
    where: { sessionId },
    create: {
      sessionId,
      userId,
      kind,
      meta: JSON.stringify({ packId }),
      fulfilled: false,
    },
    update: {},
  });

  if (kind === "pack") {
    const pack = packById(packId);
    if (!pack) throw new Error("Unknown pack in checkout.");
    await addCredits(userId, user.email, pack.kits, pack.id);
  } else if (kind === "season") {
    await setPlan(userId, user.email, "season");
    await prisma.usageAccount.update({
      where: { userId },
      data: { stripeSubscriptionId: null },
    });
  } else if (kind === "flex" || kind === "annual") {
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    await setPlan(userId, user.email, kind === "annual" ? "annual" : "flex");
    if (subId) {
      await prisma.usageAccount.update({
        where: { userId },
        data: { stripeSubscriptionId: subId },
      });
    }
  }

  await prisma.stripeCheckout.update({
    where: { sessionId },
    data: { fulfilled: true },
  });

  return { alreadyFulfilled: false };
}

export async function handleSubscriptionCanceled(
  subscriptionId: string,
): Promise<void> {
  const account = await prisma.usageAccount.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    include: { user: true },
  });
  if (!account?.user) return;

  await setPlan(account.userId, account.user.email, "free");
  await prisma.usageAccount.update({
    where: { userId: account.userId },
    data: { stripeSubscriptionId: null, flexPausedUntil: null },
  });
}
