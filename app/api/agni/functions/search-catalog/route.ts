import type { NextRequest } from "next/server";
import {
  catalogFacets,
  describeRelaxation,
  relaxSearch,
  summarize,
} from "@/lib/agni/catalog";
import { list, money, num, ok, openFunctionCall, str } from "@/lib/agni/functionKit";
import { searchRoute } from "@/lib/agni/routes";
import type { ProductSummary } from "@/lib/agni/catalog";

const MAX_LIMIT = 12;

function describe(product: ProductSummary) {
  return `${product.name}, ${product.color ?? "unlisted colour"}, ${money(product.price)}${
    product.sizes.length ? `, sizes ${product.sizes[0]} to ${product.sizes.at(-1)}` : ""
  }`;
}

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
  const relaxed = relaxSearch(filters);
  const limit = Math.min(num(args, "limit") ?? 6, MAX_LIMIT);
  const shown = relaxed.products.slice(0, limit).map(summarize);

  if (!relaxed.products.length) {
    const facets = catalogFacets();

    return ok(
      `We stock nothing like that at all. We carry ${list(facets.brands)}, in colours like ${list(facets.colors.slice(0, 6))}. Offer the closest of those — do not promise anything else.`,
      { count: 0, products: [], brands: facets.brands, colors: facets.colors },
    );
  }

  // Something matched, but only after loosening the request. Say which part gave
  // way, so the agent tells the shopper the truth rather than "we don't have it".
  if (relaxed.dropped.length) {
    return ok(
      `${describeRelaxation(filters, relaxed.dropped)} What we do have: ${shown
        .slice(0, 3)
        .map(describe)
        .join("; ")}${relaxed.products.length > 3 ? `, and ${relaxed.products.length - 3} more` : ""}. Say the missing part plainly, then offer these — they are real.`,
      {
        count: relaxed.products.length,
        products: shown,
        relaxed: relaxed.dropped,
        listing_route: searchRoute(relaxed.filters),
      },
    );
  }

  return ok(
    `${relaxed.products.length} match${relaxed.products.length === 1 ? "" : "es"}. Closest is the ${describe(shown[0])}.`,
    {
      count: relaxed.products.length,
      products: shown,
      listing_route: searchRoute(filters),
    },
  );
}
