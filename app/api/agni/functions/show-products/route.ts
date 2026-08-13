import type { NextRequest } from "next/server";
import { catalogFacets, describeRelaxation, relaxSearch } from "@/lib/agni/catalog";
import { list, num, ok, openFunctionCall, queue, str } from "@/lib/agni/functionKit";

/**
 * `show_products` — put a filtered listing on the shopper's screen. Loosens the
 * filters rather than landing them on an empty page, and says what it loosened.
 */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const { args } = call;
  const filters = {
    query: str(args, "query", "q") || undefined,
    brand: str(args, "brand") || undefined,
    gender: str(args, "gender") || undefined,
    category: str(args, "category") || undefined,
    material: str(args, "material") || undefined,
    color: str(args, "color") || undefined,
    size: num(args, "size"),
    minPrice: num(args, "min_price", "minPrice"),
    maxPrice: num(args, "max_price", "maxPrice"),
  };
  const relaxed = relaxSearch(filters);

  if (!relaxed.products.length) {
    const facets = catalogFacets();

    return ok(
      `Nothing like that exists, so I haven't moved the page. We do carry ${list(facets.brands)}. Suggest one of those.`,
      { count: 0 },
    );
  }

  const count = relaxed.products.length;
  const top = relaxed.products[0].name;

  return queue(
    call.sessionId,
    { type: "search_products", ...relaxed.filters },
    relaxed.dropped.length
      ? `${describeRelaxation(filters, relaxed.dropped)} I'm showing the closest ${count} instead, starting with ${top}. Tell the shopper what's missing before you describe these.`
      : `Showing ${count} product${count === 1 ? "" : "s"} now. Top result: ${top}.`,
  );
}
