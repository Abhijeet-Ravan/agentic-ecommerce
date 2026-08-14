import { getProducts } from "@/lib/commerce/getProduct";
import type {
  ProductSearchFilters,
  ProductSort,
} from "@/lib/commerce/types";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function matches(value: string | undefined, filter: string | undefined) {
  return !filter || (value !== undefined && normalize(value) === normalize(filter));
}

/**
 * Our taxonomy is more specific than the words people use: the categories are
 * "Canvas sneaker" and "Lace-up sneaker", never plain "sneaker", and the colours
 * include "Navy Blue" and "Light Pink". An exact match hides those from anyone —
 * shopper or agent — who asks for a sneaker in blue, so a filter also matches
 * when either side contains the other.
 */
function matchesLoosely(value: string | undefined, filter: string | undefined) {
  if (!filter) return true;
  if (value === undefined) return false;

  const actual = normalize(value);
  const wanted = normalize(filter);

  return actual === wanted || actual.includes(wanted) || wanted.includes(actual);
}

function isAccessoryCategory(category: string | undefined) {
  return category !== undefined && /^(bag|belt|wallet)$/i.test(category);
}

export function searchProducts(filters: ProductSearchFilters = {}) {
  const query = filters.query ? normalize(filters.query) : undefined;
  const sort: ProductSort = filters.sort ?? "relevance";
  const selectedSlugs = filters.slugs?.map(normalize).filter(Boolean);
  const selectedSlugSet = selectedSlugs?.length
    ? new Set(selectedSlugs)
    : undefined;

  const results = getProducts().filter((product) => {
    const textFields = [
      product.name,
      product.brand,
      product.category,
      product.material,
      product.color,
    ];
    const queryMatches =
      !query ||
      textFields.some((field) => field && normalize(field).includes(query));
    const categoryMatches =
      !filters.category ||
      (normalize(filters.category) === "accessories"
        ? isAccessoryCategory(product.category)
        : matchesLoosely(product.category, filters.category));

    return (
      (!selectedSlugSet || selectedSlugSet.has(normalize(product.slug))) &&
      queryMatches &&
      matchesLoosely(product.brand, filters.brand) &&
      matches(product.gender, filters.gender) &&
      categoryMatches &&
      matchesLoosely(product.material, filters.material) &&
      matchesLoosely(product.color, filters.color) &&
      (filters.size === undefined || product.sizes?.includes(filters.size)) &&
      (filters.minPrice === undefined || product.price >= filters.minPrice) &&
      (filters.maxPrice === undefined || product.price <= filters.maxPrice)
    );
  });

  if (sort === "price-asc") {
    return results.toSorted((a, b) => a.price - b.price);
  }

  if (sort === "price-desc") {
    return results.toSorted((a, b) => b.price - a.price);
  }

  if (selectedSlugs?.length) {
    return results.toSorted(
      (a, b) => selectedSlugs.indexOf(normalize(a.slug)) - selectedSlugs.indexOf(normalize(b.slug)),
    );
  }

  return results;
}
