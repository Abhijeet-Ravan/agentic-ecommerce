import type { NextRequest } from "next/server";
import { cartState } from "@/lib/agni/currentPage";
import {
  fail,
  list,
  money,
  num,
  openFunctionCall,
  queue,
  queueAll,
  str,
} from "@/lib/agni/functionKit";
import type { AgniAction } from "@/lib/agni/types";
import { getPage } from "@/lib/agni/store";

/**
 * `update_cart` — remove a line, keep only one, change a quantity, or empty the
 * cart. `keep_only` exists because "just the new pair, thanks" is otherwise one
 * tool call per unwanted item, each with its own round trip.
 */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const operation = str(call.args, "operation", "action").toLowerCase();
  const slug = str(call.args, "slug");
  const size = num(call.args, "size");
  const cart = cartState(call.sessionId);
  const page = getPage(call.sessionId);
  const comparisonOpen = page?.path === "/products" &&
    new URLSearchParams(page.search).has("compare");
  const explicitCartRequest = call.args.explicit_cart_request === true ||
    str(call.args, "explicit_cart_request").toLowerCase() === "true";

  if (comparisonOpen && !explicitCartRequest) {
    return fail(
      "The cart was not changed. A preference such as 'I like the first one' means choose that compared product, not remove another cart item. Use choose_compared_product. Only retry update_cart when the shopper explicitly said cart, remove, delete, quantity, or empty.",
    );
  }

  if (operation === "clear") {
    return queue(
      call.sessionId,
      { type: "clear_cart" },
      "Emptying the cart. Offer to start again when they're ready.",
    );
  }

  if (!slug) return fail("Say which item — I need its slug from the page context.");

  const line = cart.lines.find(({ product }) => product.slug === slug);

  if (!line) {
    return fail("That item isn't in the cart. Read the page context for what is.");
  }

  if (operation === "keep_only") {
    const dropped = cart.lines.filter(({ product }) => product.slug !== slug);

    if (!dropped.length) {
      return queue(
        call.sessionId,
        { type: "open_cart" },
        `The ${line.product.name} is the only thing in the cart already. Total ${money(cart.subtotal)}.`,
      );
    }

    const kept = line.product.price * line.item.quantity;

    return queueAll(
      call.sessionId,
      dropped.map(
        ({ item, product }): AgniAction => ({
          type: "remove_from_cart",
          slug: product.slug,
          size: item.size,
        }),
      ),
      `Removing ${list(dropped.map(({ product }) => product.name))}, leaving the ${line.product.name}. Tell them the new total is ${money(kept)}.`,
    );
  }

  if (operation === "remove") {
    const remaining = cart.subtotal - line.product.price * line.item.quantity;

    return queue(
      call.sessionId,
      { type: "remove_from_cart", slug, size: size ?? line.item.size },
      `Removing the ${line.product.name}. That leaves ${remaining > 0 ? money(remaining) : "an empty cart"}.`,
    );
  }

  const quantity = num(call.args, "quantity");

  if (operation !== "set_quantity" || quantity === undefined || quantity < 0) {
    return fail("Use operation remove, keep_only, set_quantity with a quantity, or clear.");
  }

  const rounded = Math.round(quantity);
  const difference = (rounded - line.item.quantity) * line.product.price;

  return queue(
    call.sessionId,
    { type: "set_quantity", slug, quantity: rounded, size: size ?? line.item.size },
    rounded === 0
      ? `Removing the ${line.product.name}.`
      : `Setting the ${line.product.name} to ${rounded}. New total ${money(cart.subtotal + difference)}.`,
  );
}
