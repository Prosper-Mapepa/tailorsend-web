import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function BillingCancelPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <Card className="text-center">
        <h1 className="text-xl font-bold text-slate-900">Checkout canceled</h1>
        <p className="mt-2 text-sm text-slate-600">
          No charge was made. You can try again anytime from the billing page.
        </p>
      </Card>
      <div className="flex justify-center">
        <Link href="/billing">
          <Button>Return to billing</Button>
        </Link>
      </div>
    </div>
  );
}
