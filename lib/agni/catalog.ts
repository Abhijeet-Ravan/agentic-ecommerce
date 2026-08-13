import { getProduct, getProducts } from "@/lib/commerce/getProduct";
import { searchProducts } from "@/lib/commerce/searchProducts";
import { productRoute } from "@/lib/agni/routes";
import type { ProductSearchFilters } from "@/lib/commerce/types";
import type { Product } from "@/types/product";

export type ProductSummary = {
  id: number;
  slug: string;
  name: string;
  brand?: string;
  gender?: string;
  category?: string;
  material?: string;
  color?: string;
  price: number;
  sizes: number[];
  route: string;
};

export function summarize(product: Product): ProductSummary {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    gender: product.gender,
    category: product.category,
    material: product.material,
    color: product.color,
    price: product.price,
    sizes: product.sizes ?? [],
    route: productRoute(product.slug),
  };
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].toSorted(
    (a, b) => a.localeCompare(b),
  );
}

/**
 * What the agent is allowed to ask for. Voice models invent brands ("Nike")
 * that this catalog does not carry, so the facet list is the grounding.
 */
export function catalogFacets() {
  const products = getProducts();

  return {
    brands: unique(products.map((product) => product.brand)),
    genders: unique(products.map((product) => product.gender)),
    categories: unique(products.map((product) => product.category)),
    materials: unique(products.map((product) => product.material)),
    colors: unique(products.map((product) => product.color)),
    sizes: [...new Set(products.flatMap((product) => product.sizes ?? []))].toSorted(
      (a, b) => a - b,
    ),
    priceRange: {
      min: Math.min(...products.map((product) => product.price)),
      max: Math.max(...products.map((product) => product.price)),
    },
  };
}

function colorMatches(product: Product, color: string) {
  const wanted = color.trim().toLocaleLowerCase();
  const actual = product.color?.trim().toLocaleLowerCase() ?? "";

  return actual === wanted || actual.includes(wanted) || wanted.includes(actual);
}

/**
 * Every product in this catalog is a single colourway, so "the same shoe in
 * blue" means a sibling: same brand, category and gender, different colour.
 */
export function colorSiblings(product: Product) {
  return getProducts().filter(
    (candidate) =>
      candidate.slug !== product.slug &&
      candidate.brand === product.brand &&
      candidate.category === product.category &&
      candidate.gender === product.gender,
  );
}

/**
 * Resolves "in blue" against the product the shopper is looking at:
 * an exact sibling when one exists, otherwise the filters for a listing page.
 */
export function resolveColorRequest(slug: string | undefined, color: string) {
  const product = slug ? getProduct(slug) : undefined;

  if (product) {
    if (colorMatches(product, color)) {
      return { kind: "already" as const, product: summarize(product) };
    }

    const sibling = colorSiblings(product).find((candidate) =>
      colorMatches(candidate, color),
    );

    if (sibling) return { kind: "product" as const, product: summarize(sibling) };

    // No exact colourway: fall back to the tightest listing that isn't empty.
    return {
      kind: "search" as const,
      ...firstNonEmpty([
        { color, category: product.category, gender: product.gender },
        { color, category: product.category },
        { color, gender: product.gender },
        { color },
      ]),
    };
  }

  return { kind: "search" as const, ...firstNonEmpty([{ color }]) };
}

/**
 * Least to most important: what a shopper is willing to give up first. Brand and
 * colour go last because those are usually the whole request.
 */
const RELAX_ORDER = [
  "material",
  "size",
  "minPrice",
  "maxPrice",
  "category",
  "gender",
  "query",
  "color",
  "brand",
] as const satisfies readonly (keyof ProductSearchFilters)[];

export type RelaxedSearch = {
  products: ReturnType<typeof searchProducts>;
  filters: ProductSearchFilters;
  dropped: string[];
};

/**
 * A search that answers "what CAN I offer?" rather than "did this exact
 * combination match?". A voice agent stacks filters — brand and category and
 * colour and gender — and one bad guess anywhere used to come back as a flat
 * "we don't stock that", which the agent then said out loud to a shopper looking
 * at the very shoe it was denying. Now the narrowest non-empty version wins, and
 * the caller is told what had to give.
 */
export function relaxSearch(filters: ProductSearchFilters): RelaxedSearch {
  const direct = searchProducts(filters);

  if (direct.length) return { products: direct, filters, dropped: [] };

  const working: ProductSearchFilters = { ...filters };
  const dropped: string[] = [];

  for (const key of RELAX_ORDER) {
    if (working[key] === undefined) continue;

    delete working[key];
    dropped.push(key);

    const products = searchProducts(working);

    if (products.length) return { products, filters: { ...working }, dropped: [...dropped] };
  }

  return { products: [], filters: working, dropped };
}

/**
 * Turns "I dropped brand and size" into something the agent can say. Dropping a
 * brand or a colour is a denial the shopper needs to hear plainly — burying it
 * as "ignoring brand" is how you end up offering Bata to someone who asked for
 * Nike without ever saying we don't sell Nike.
 */
export function describeRelaxation(
  original: ProductSearchFilters,
  dropped: string[],
) {
  const sentences = dropped.map((key) => {
    switch (key) {
      case "brand":
        return `We don't carry ${original.brand}.`;
      case "color":
        return `We have nothing in ${original.color}.`;
      case "size":
        return `Nothing in size ${original.size}.`;
      case "gender":
        return `Nothing in the ${original.gender}'s range for that.`;
      case "category":
        return `No ${original.category} exactly.`;
      case "material":
        return `Nothing in ${original.material}.`;
      case "query":
        return `Nothing matching "${original.query}".`;
      case "minPrice":
      case "maxPrice":
        return "Not at that price.";
      default:
        return "";
    }
  });

  return sentences.filter(Boolean).join(" ");
}

function firstNonEmpty(candidates: ProductSearchFilters[]) {
  for (const filters of candidates) {
    const count = searchProducts(filters).length;

    if (count) return { filters, count };
  }

  return { filters: candidates.at(-1) as ProductSearchFilters, count: 0 };
}
