import type { NextRequest } from "next/server";
import { openProduct } from "@/lib/agni/currentPage";
import { fail, list, num, ok, openFunctionCall, queue } from "@/lib/agni/functionKit";

/**
 * `choose_size` — pick the size chip on the open product page. Validated here so
 * the agent hears "we only have 6 to 10" instead of a silent failure.
 */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const size = num(call.args, "size");

  if (size === undefined) return fail("Ask the shopper which size they take.");

  const product = openProduct(call.sessionId);

  if (!product) {
    return fail("No product is open. Open one first, then pick the size.");
  }

  const sizes = product.sizes ?? [];

  if (!sizes.length) {
    return fail(`The ${product.name} is one-size — no size needs choosing.`);
  }

  if (!sizes.includes(size)) {
    return ok(
      `We don't have size ${size} in the ${product.name}. It comes in ${list(sizes)}. Offer the nearest.`,
      { available_sizes: sizes },
    );
  }

  return queue(call.sessionId, { type: "select_size", size }, `Size ${size} selected.`);
}
