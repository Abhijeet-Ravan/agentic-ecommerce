import type { NextRequest } from "next/server";
import { cartState, openProduct } from "@/lib/agni/currentPage";
import {
  fail,
  list,
  money,
  num,
  ok,
  openFunctionCall,
  queueAll,
  str,
} from "@/lib/agni/functionKit";
import { getProduct } from "@/lib/commerce/getProduct";

/**
 * `add_to_cart` — the one function that spends the shopper's intent, so it
 * refuses anything ambiguous: no product, or a size the product doesn't stock.
 *
 * It also opens the cart in the same queue. Asking the agent to call `open_cart`
 * afterwards costs a whole extra round trip — tool call, poll, navigation — and
 * the shopper hears the gap.
 */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const slug = str(call.args, "slug");
  const product = (slug ? getProduct(slug) : undefined) ?? openProduct(call.sessionId);

  if (!product) {
    return fail("I don't know which product to add. Open one first.");
  }

  const sizes = product.sizes ?? [];
  const size = num(call.args, "size");
  const rawQuantity = num(call.args, "quantity") ?? 1;

  if (!Number.isInteger(rawQuantity) || rawQuantity < 1 || rawQuantity > 20) {
    return fail("Quantity must be a whole number from 1 to 20.");
  }

  const quantity = rawQuantity;

  if (sizes.length && size === undefined) {
    return ok(
      `Ask which size first — the ${product.name} comes in ${list(sizes)}. Don't add anything until they answer.`,
      { available_sizes: sizes },
    );
  }

  if (size !== undefined && sizes.length && !sizes.includes(size)) {
    return ok(
      `Size ${size} isn't stocked for the ${product.name}. It comes in ${list(sizes)}.`,
      { available_sizes: sizes },
    );
  }

  const existing = cartState(call.sessionId);
  const others = existing.lines.filter(({ product: line }) => line.slug !== product.slug);
  const total = existing.subtotal + product.price * quantity;
  const added = `${quantity} ${quantity === 1 ? "pair" : "pairs"} of ${product.name}${size === undefined ? "" : ` in size ${size}`}, ${money(product.price * quantity)}`;

  return queueAll(
    call.sessionId,
    [
      {
        type: "add_to_cart",
        slug: product.slug,
        quantity,
        ...(size === undefined ? {} : { size }),
      },
      { type: "open_cart" },
    ],
    others.length
      ? `Added the ${added}, and opening the cart. It already holds ${list(
          others.map(({ item, product: line }) => `${line.name} (${money(line.price * item.quantity)})`),
        )}. Tell them the new total is ${money(total)}, then ask whether they want everything or just the new pair — if it's just the new pair, call update_cart with operation keep_only.`
      : `Added the ${added}, and opening the cart. Tell them the total is ${money(total)} and ask whether to buy now or keep shopping.`,
    );
}
