import type { NextRequest } from "next/server";
import { catalogFacets } from "@/lib/agni/catalog";
import { list, num, ok, openFunctionCall, queue, str } from "@/lib/agni/functionKit";
import { searchProducts } from "@/lib/commerce/searchProducts";

/**
 * `show_products` — put a filtered listing on the shopper's screen.
 * Refuses rather than navigating to an empty page.
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
  const results = searchProducts(filters);

  if (!results.length) {
    const facets = catalogFacets();

    return ok(
      `Nothing matches that, so I haven't moved the page. We do carry ${list(facets.brands)}. Suggest one of those.`,
      { count: 0 },
    );
  }

  return queue(
    call.sessionId,
    { type: "search_products", ...filters },
    `Showing ${results.length} product${results.length === 1 ? "" : "s"} now. Top result: ${results[0].name}.`,
  );
}
