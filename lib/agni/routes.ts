import type { ProductSearchFilters } from "@/lib/commerce/types";

const ALLOWED_PREFIXES = ["/", "/blogs", "/products", "/cart", "/checkout"];
const SAFE_ROUTE_CHARACTERS = /^[A-Za-z0-9/?=&%._~+,:@-]*$/;

/**
 * Only ever hand internal, same-origin paths to the router — the agent is an
 * untrusted source and `router.push` will happily run a `javascript:` URL.
 */
export function safeInternalRoute(route: string) {
  const trimmed = route.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (!SAFE_ROUTE_CHARACTERS.test(trimmed)) return null;

  const [path] = trimmed.split("?");
  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  return allowed ? trimmed : null;
}

export function productRoute(slug: string) {
  return `/products/${encodeURIComponent(slug)}`;
}

export function comparisonRoute(slugA: string, slugB: string, returnToCart = false) {
  const slugs = [slugA, slugB].join(",");
  const params = new URLSearchParams({ slugs, compare: slugs });

  if (returnToCart) params.set("returnTo", "cart");

  return `/products?${params}`;
}

export function searchRoute(filters: ProductSearchFilters) {
  const params = new URLSearchParams();
  const entries: Array<[string, string | number | undefined]> = [
    ["q", filters.query],
    ["brand", filters.brand],
    ["gender", filters.gender],
    ["category", filters.category],
    ["material", filters.material],
    ["color", filters.color],
    ["size", filters.size],
    ["minPrice", filters.minPrice],
    ["maxPrice", filters.maxPrice],
    ["sort", filters.sort === "relevance" ? undefined : filters.sort],
  ];

  for (const [name, value] of entries) {
    if (value !== undefined && String(value).trim()) {
      params.set(name, String(value).trim());
    }
  }

  if (filters.slugs?.length) {
    params.set("slugs", filters.slugs.join(","));
  }

  return `/products${params.size ? `?${params}` : ""}`;
}

/** Order-insensitive comparison so `?q=a&size=8` matches `?size=8&q=a`. */
export function sameRoute(a: string, b: string) {
  const [pathA, queryA = ""] = a.split("?");
  const [pathB, queryB = ""] = b.split("?");

  if (pathA.replace(/\/$/, "") !== pathB.replace(/\/$/, "")) return false;

  const normalize = (query: string) =>
    [...new URLSearchParams(query).entries()]
      .map(([key, value]) => `${key}=${value}`)
      .toSorted((x, y) => x.localeCompare(y))
      .join("&");

  return normalize(queryA) === normalize(queryB);
}
