export type Product = {
  id: number;
  slug: string;
  name: string;
  price: number;
  images: readonly string[];
  brand?: string;
  gender?: "men" | "women" | "kids";
  category?: string;
  material?: string;
  color?: string;
  sizes?: number[];
  productCode?: string;
  description?: string;
};
