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

function isAccessoryCategory(category: string | undefined) {
  return category !== undefined && /^(bag|belt|wallet)$/i.test(category);
}

export function searchProducts(filters: ProductSearchFilters = {}) {
  const query = filters.query ? normalize(filters.query) : undefined;
  const sort: ProductSort = filters.sort ?? "relevance";

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
        : matches(product.category, filters.category));

    return (
      queryMatches &&
      matches(product.brand, filters.brand) &&
      matches(product.gender, filters.gender) &&
      categoryMatches &&
      matches(product.material, filters.material) &&
      matches(product.color, filters.color) &&
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

  return results;
}
