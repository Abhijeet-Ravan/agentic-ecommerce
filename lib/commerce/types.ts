export type ProductSort = "relevance" | "price-asc" | "price-desc";

export type ProductSearchFilters = {
  slugs?: readonly string[];
  query?: string;
  brand?: string;
  gender?: string;
  category?: string;
  material?: string;
  color?: string;
  size?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
};
