import type { NextRequest } from "next/server";
import { cartState } from "@/lib/agni/currentPage";
import { money, ok, openFunctionCall, queue } from "@/lib/agni/functionKit";

/**
 * `checkout` — clicks Proceed to Checkout. This is where the agent's job ends:
 * delivery and payment are the shopper's to complete.
 */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const cart = cartState(call.sessionId);

  if (!cart.count) {
    return ok("The cart is empty, so there's nothing to buy yet. Offer to find something first.");
  }

  return queue(
    call.sessionId,
    { type: "checkout" },
    `Checkout navigation is queued for ${cart.count} item${cart.count === 1 ? "" : "s"}, ${money(cart.subtotal)}. Call get_page_context next and only say checkout is open when it reports PAGE: checkout. Never say the order is placed.`,
  );
}
