export type DemoSpecifications = {
  source: "synthetic_demo";
  upperMaterial?: string;
  soleMaterial?: string;
  bodyMaterial?: string;
  closure?: string;
  fit?: string;
  cushioning?: string;
  weight?: string;
  waterResistance?: string;
  heelHeight?: string;
  idealFor?: readonly string[];
  features?: readonly string[];
};

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
  demoSpecifications: DemoSpecifications;
};
