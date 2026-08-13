import type { NextRequest } from "next/server";
import { catalogFacets, resolveColorRequest } from "@/lib/agni/catalog";
import { openProduct } from "@/lib/agni/currentPage";
import { fail, list, ok, openFunctionCall, queue, str } from "@/lib/agni/functionKit";
import { searchProducts } from "@/lib/commerce/searchProducts";

/**
 * `choose_color` — "have you got it in blue?". Every catalogue entry is a single
 * colourway, so this either switches to the sibling product or filters the list.
 */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const color = str(call.args, "color", "colour");

  if (!color) return fail("Ask the shopper which colour they want.");

  if (!searchProducts({ color }).length) {
    return ok(
      `We have nothing in ${color}. Our colours are ${list(catalogFacets().colors)}. Offer one of those.`,
      { available_colors: catalogFacets().colors },
    );
  }

  const product = openProduct(call.sessionId);
  const resolved = resolveColorRequest(product?.slug, color);

  const summary =
    resolved.kind === "already"
      ? `They're already looking at the ${color} one.`
      : resolved.kind === "product"
        ? `Switching to the ${resolved.product.name} in ${resolved.product.color ?? color}.`
        : product
          ? `That style doesn't come in ${color}, so I'm showing our ${color} alternatives instead.`
          : `Showing everything we have in ${color}.`;

  return queue(call.sessionId, { type: "select_color", color }, summary);
}
