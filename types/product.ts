export type Product = {
  id: number;
  slug: string;

  name: string;
  brand: string;
  productCode: string;

  price: number;

  gender: "men" | "women" | "kids";
  category: string;
  material: string;
  color: string;

  sizes: number[];

  images: string[];

  description: string;
};
