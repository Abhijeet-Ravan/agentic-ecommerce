import type { NextRequest } from "next/server";
import { catalogFacets, summarize } from "@/lib/agni/catalog";
import { list, money, num, ok, openFunctionCall, str } from "@/lib/agni/functionKit";
import { searchRoute } from "@/lib/agni/routes";
import { searchProducts } from "@/lib/commerce/searchProducts";

const MAX_LIMIT = 12;

/**
 * `search_catalog` — look up what we actually stock. Does not move the shopper;
 * this is the grounding step before promising anything exists.
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
  const limit = Math.min(num(args, "limit") ?? 6, MAX_LIMIT);
  const shown = results.slice(0, limit).map(summarize);

  if (!results.length) {
    const facets = catalogFacets();

    return ok(
      `Nothing matches that. We carry ${list(facets.brands)}, in colours like ${list(facets.colors.slice(0, 6))}. Offer the closest of those instead — do not promise anything else.`,
      { count: 0, products: [], brands: facets.brands, colors: facets.colors },
    );
  }

  const [first] = shown;

  return ok(
    `${results.length} match${results.length === 1 ? "" : "es"}. Closest is the ${first.name}, ${first.color ?? "unlisted colour"}, ${money(first.price)}${first.sizes.length ? `, sizes ${first.sizes[0]} to ${first.sizes.at(-1)}` : ""}.`,
    { count: results.length, products: shown, listing_route: searchRoute(filters) },
  );
}
