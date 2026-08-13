import type { NextRequest } from "next/server";
import { cartState } from "@/lib/agni/currentPage";
import { list, money, openFunctionCall, queue } from "@/lib/agni/functionKit";

/** `open_cart` — show the cart, then ask whether to buy now or keep shopping. */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const cart = cartState(call.sessionId);
  const items = cart.lines.map(
    ({ item, product }) =>
      `${product.name}${item.size === undefined ? "" : ` size ${item.size}`}${item.quantity > 1 ? ` ×${item.quantity}` : ""} (${money(product.price * item.quantity)})`,
  );

  const summary = !cart.count
    ? "Opening the cart, but it's empty. Offer to find them something."
    : cart.lines.length === 1
      ? `Opening the cart: ${items[0]}. Total ${money(cart.subtotal)}. Ask whether to buy now or keep shopping.`
      : `Opening the cart: ${list(items)}. Total ${money(cart.subtotal)}. Read them the total, then ask whether they want all of it or only some — to drop the rest, call update_cart with operation keep_only and the slug they want.`;

  return queue(call.sessionId, { type: "open_cart" }, summary);
}
