export type DemoSpecifications = {
  source: "synthetic_demo";
  profile:
    | "footwear"
    | "bag"
    | "backpack"
    | "wallet"
    | "belt"
    | "bottle"
    | "socks";
  upperMaterial?: string;
  liningMaterial?: string;
  soleMaterial?: string;
  bodyMaterial?: string;
  outsoleType?: string;
  insoleType?: string;
  closure?: string;
  toeShape?: string;
  ankleHeight?: string;
  fit?: string;
  width?: string;
  cushioning?: string;
  archSupport?: string;
  flexibility?: string;
  breathability?: string;
  grip?: string;
  stability?: string;
  weightClass?: string;
  estimatedWeightGrams?: number;
  waterResistance?: string;
  durability?: string;
  terrain?: readonly string[];
  heelHeight?: string;
  idealFor?: readonly string[];
  season?: readonly string[];
  comfortScore?: number;
  breathabilityScore?: number;
  gripScore?: number;
  durabilityScore?: number;
  flexibilityScore?: number;
  stabilityScore?: number;
  organizationScore?: number;
  portabilityScore?: number;
  capacityLiters?: number;
  capacityMilliliters?: number;
  compartments?: number;
  strapType?: string;
  laptopCompatibility?: string;
  carryStyle?: string;
  cardSlots?: number;
  billCompartments?: number;
  coinPocket?: boolean;
  buckleType?: string;
  widthMillimeters?: number;
  adjustability?: string;
  style?: string;
  occasion?: readonly string[];
  insulation?: string;
  lidType?: string;
  leakResistance?: string;
  portability?: string;
  sockHeight?: string;
  stretch?: string;
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
