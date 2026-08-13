import type { NextRequest } from "next/server";
import { catalogFacets, resolveColorRequest, summarize } from "@/lib/agni/catalog";
import { searchRoute } from "@/lib/agni/routes";
import { getProduct } from "@/lib/commerce/getProduct";
import { searchProducts } from "@/lib/commerce/searchProducts";
import type { ProductSearchFilters, ProductSort } from "@/lib/commerce/types";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;

function readFilters(params: URLSearchParams): ProductSearchFilters {
  const number = (name: string) => {
    const raw = params.get(name);
    const parsed = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const sortValue = params.get("sort");
  const sort: ProductSort =
    sortValue === "price-asc" || sortValue === "price-desc" ? sortValue : "relevance";

  return {
    query: params.get("q") ?? params.get("query") ?? undefined,
    brand: params.get("brand") ?? undefined,
    gender: params.get("gender") ?? undefined,
    category: params.get("category") ?? undefined,
    material: params.get("material") ?? undefined,
    color: params.get("color") ?? undefined,
    size: number("size"),
    minPrice: number("minPrice"),
    maxPrice: number("maxPrice"),
    sort,
  };
}

/**
 * The agent's `search_catalog` tool — and the bridge's colour resolver.
 * Read-only, so it needs no secret; it exposes nothing a shopper cannot see.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  if (params.get("facets") !== null) {
    return Response.json(catalogFacets());
  }

  const slug = params.get("slug");
  const siblingOf = params.get("siblingOf");
  const color = params.get("color");

  if (siblingOf && color) {
    const resolved = resolveColorRequest(siblingOf, color);

    return Response.json(
      resolved.kind === "search"
        ? { ...resolved, route: searchRoute(resolved.filters) }
        : resolved,
    );
  }

  if (slug) {
    const product = getProduct(slug);

    return product
      ? Response.json({ product: summarize(product) })
      : Response.json({ error: `No product with slug "${slug}".` }, { status: 404 });
  }

  const filters = readFilters(params);
  const results = searchProducts(filters);
  const limit = Math.min(Number(params.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);

  return Response.json({
    count: results.length,
    route: searchRoute(filters),
    products: results.slice(0, limit).map(summarize),
  });
}
