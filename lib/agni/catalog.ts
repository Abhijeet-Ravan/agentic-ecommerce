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

function firstNonEmpty(candidates: ProductSearchFilters[]) {
  for (const filters of candidates) {
    const count = searchProducts(filters).length;

    if (count) return { filters, count };
  }

  return { filters: candidates.at(-1) as ProductSearchFilters, count: 0 };
}
