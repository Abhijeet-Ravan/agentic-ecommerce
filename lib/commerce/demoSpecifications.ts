import type { DemoSpecifications, Product } from "@/types/product";

type SpecificationInput = Pick<
  Product,
  | "slug"
  | "name"
  | "brand"
  | "gender"
  | "category"
  | "material"
  | "description"
>;

type PerformanceScores = {
  comfort: number;
  breathability: number;
  grip: number;
  durability: number;
  flexibility: number;
  stability: number;
};

type FootwearKind =
  | "turf"
  | "sports"
  | "sneaker"
  | "school"
  | "formal"
  | "heel"
  | "open"
  | "casual";

const FOOTWEAR_BASELINES: Record<FootwearKind, PerformanceScores> = {
  turf: { comfort: 7, breathability: 7, grip: 9, durability: 8, flexibility: 7, stability: 8 },
  sports: { comfort: 8, breathability: 8, grip: 8, durability: 7, flexibility: 8, stability: 7 },
  sneaker: { comfort: 7, breathability: 7, grip: 7, durability: 7, flexibility: 7, stability: 6 },
  school: { comfort: 7, breathability: 6, grip: 7, durability: 8, flexibility: 6, stability: 8 },
  formal: { comfort: 7, breathability: 5, grip: 6, durability: 8, flexibility: 5, stability: 8 },
  heel: { comfort: 6, breathability: 6, grip: 6, durability: 7, flexibility: 5, stability: 8 },
  open: { comfort: 7, breathability: 9, grip: 6, durability: 6, flexibility: 8, stability: 5 },
  casual: { comfort: 7, breathability: 6, grip: 7, durability: 7, flexibility: 7, stability: 7 },
};

const FOOTWEAR_WEIGHT_RANGES: Record<FootwearKind, readonly [number, number]> = {
  turf: [285, 385],
  sports: [245, 345],
  sneaker: [255, 365],
  school: [250, 355],
  formal: [325, 470],
  heel: [235, 350],
  open: [145, 285],
  casual: [255, 390],
};

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededInteger(
  product: SpecificationInput,
  key: string,
  minimum: number,
  maximum: number,
) {
  return minimum + (hashString(`${product.slug}:${key}`) % (maximum - minimum + 1));
}

function pick<T>(
  product: SpecificationInput,
  key: string,
  values: readonly T[],
) {
  return values[hashString(`${product.slug}:${key}`) % values.length];
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function variedScore(
  product: SpecificationInput,
  key: string,
  baseline: number,
  modifier = 0,
) {
  return clamp(
    baseline + modifier + seededInteger(product, key, -1, 1),
    1,
    10,
  );
}

function isOneOf(value: string, options: readonly string[]) {
  return options.some((option) => value.includes(option));
}

function describeScore(
  score: number,
  low: string,
  medium: string,
  high: string,
) {
  return score >= 8 ? high : score >= 6 ? medium : low;
}

function getFootwearKind(category: string): FootwearKind {
  if (category.includes("turf")) return "turf";
  if (category.includes("sports")) return "sports";
  if (category.includes("school")) return "school";
  if (category.includes("sneaker")) return "sneaker";
  if (isOneOf(category, ["formal", "derby", "loafer", "moccasin"])) return "formal";
  if (isOneOf(category, ["heel", "pumps", "mule"])) return "heel";
  if (isOneOf(category, ["sandal", "slide", "slipper", "clog"])) return "open";
  return "casual";
}

function getFootwearUpperMaterial(material?: string) {
  if (material?.toLowerCase().includes("pu+rubber")) {
    return "PU";
  }

  return material?.replaceAll("+", " and ").replaceAll("/", " and ");
}

function getScoreModifiers(product: SpecificationInput) {
  const brand = product.brand?.toLowerCase() ?? "";
  const material = product.material?.toLowerCase() ?? "";
  const modifiers: PerformanceScores = {
    comfort: 0,
    breathability: 0,
    grip: 0,
    durability: 0,
    flexibility: 0,
    stability: 0,
  };

  if (isOneOf(brand, ["comfit", "scholl"])) {
    modifiers.comfort += 2;
    modifiers.stability += 1;
  } else if (brand.includes("hush puppies")) {
    modifiers.comfort += 1;
    modifiers.durability += 1;
  }
  if (brand.includes("power")) {
    modifiers.grip += 1;
    modifiers.stability += 1;
  }
  if (brand.includes("weinbrenner")) {
    modifiers.grip += 1;
    modifiers.durability += 1;
  }
  if (brand.includes("floatz")) {
    modifiers.comfort += 1;
    modifiers.flexibility += 1;
  }
  if (isOneOf(brand, ["bubblegummers", "b. first"])) {
    modifiers.comfort += 1;
    modifiers.flexibility += 1;
  }
  if (isOneOf(material, ["mesh", "flyknit"])) {
    modifiers.breathability += 2;
    modifiers.flexibility += 1;
  } else if (isOneOf(material, ["canvas", "textile", "lycra"])) {
    modifiers.breathability += 1;
    modifiers.flexibility += 1;
  }
  if (material.includes("leather")) {
    modifiers.durability += 1;
    modifiers.stability += 1;
    modifiers.breathability -= 1;
  }
  if (material.includes("rubber")) {
    modifiers.grip += 1;
    modifiers.durability += 1;
    modifiers.breathability -= 2;
  }
  if (material.includes("pvc")) {
    modifiers.durability += 1;
    modifiers.breathability -= 1;
  }
  if (material.includes("eva")) {
    modifiers.comfort += 1;
    modifiers.flexibility += 1;
  }
  return modifiers;
}

function createFootwearScores(
  product: SpecificationInput,
  kind: FootwearKind,
): PerformanceScores {
  const baseline = FOOTWEAR_BASELINES[kind];
  const modifiers = getScoreModifiers(product);
  return {
    comfort: variedScore(product, "comfort-score", baseline.comfort, modifiers.comfort),
    breathability: variedScore(product, "breathability-score", baseline.breathability, modifiers.breathability),
    grip: variedScore(product, "grip-score", baseline.grip, modifiers.grip),
    durability: variedScore(product, "durability-score", baseline.durability, modifiers.durability),
    flexibility: variedScore(product, "flexibility-score", baseline.flexibility, modifiers.flexibility),
    stability: variedScore(product, "stability-score", baseline.stability, modifiers.stability),
  };
}

function getFootwearClosure(
  product: SpecificationInput,
  kind: FootwearKind,
  category: string,
) {
  const name = product.name.toLowerCase();
  if (isOneOf(category, ["toe-post", "thong"])) return "Toe-post";
  if (
    isOneOf(category, [
      "slip-on", "loafer", "moccasin", "ballerina", "pumps",
      "mule", "slide", "slipper", "clog",
    ]) ||
    name.includes("slip-on")
  ) {
    return "Slip-on";
  }
  if (kind === "turf" || kind === "sports" || kind === "sneaker") return "Lace-up";
  if (kind === "open") {
    return product.gender === "kids" ? "Adjustable strap" : "Open strap";
  }
  if (category.includes("derby") || category === "formal shoe") return "Lace-up";
  return "Easy-entry";
}

function getToeShape(
  product: SpecificationInput,
  kind: FootwearKind,
  category: string,
) {
  if (isOneOf(category, ["sandal", "slide", "slipper", "thong", "toe-post"])) {
    return "Open toe";
  }
  if (category.includes("clog")) return "Rounded closed toe";
  if (category.includes("mule") || category.includes("block heel")) return "Open toe";
  if (kind === "formal" || category.includes("pumps")) {
    return pick(product, "toe-shape", ["Almond toe", "Rounded toe"]);
  }
  return "Rounded toe";
}

function getLiningMaterial(product: SpecificationInput, kind: FootwearKind) {
  if (kind === "open") return "Minimal synthetic lining";
  if (kind === "sports" || kind === "turf" || kind === "sneaker") {
    return pick(product, "lining", ["Breathable textile lining", "Soft mesh lining"]);
  }
  if (kind === "school" || product.gender === "kids") return "Soft textile lining";
  return pick(product, "lining", [
    "Soft textile lining",
    "Lightly padded synthetic lining",
  ]);
}

function getSoleMaterial(product: SpecificationInput, kind: FootwearKind) {
  const material = product.material?.toLowerCase() ?? "";
  if (material.includes("rubber")) return "Rubber";
  if (material === "eva") return "EVA";
  if (kind === "turf") return "Textured rubber";
  if (kind === "sports" || kind === "sneaker") {
    return pick(product, "sole-material", ["Rubber and EVA", "Phylon and rubber"]);
  }
  if (kind === "open") {
    return pick(product, "sole-material", ["Lightweight EVA", "Flexible TPR"]);
  }
  if (kind === "formal" || kind === "heel") return "TPR";
  return "Flexible synthetic outsole";
}

function getOutsoleType(product: SpecificationInput, kind: FootwearKind) {
  const values: Record<FootwearKind, readonly string[]> = {
    turf: ["Multi-stud turf outsole", "Low-profile turf traction outsole"],
    sports: ["Textured athletic outsole", "Segmented traction outsole"],
    sneaker: ["Flexible street outsole", "Patterned everyday outsole"],
    school: ["Durable everyday outsole", "Non-marking patterned outsole"],
    formal: ["Low-profile formal outsole", "Stable dress outsole"],
    heel: ["Stable heel outsole", "Textured dress outsole"],
    open: ["Flexible patterned outsole", "Lightweight grooved outsole"],
    casual: ["Everyday traction outsole", "Flexible patterned outsole"],
  };
  return pick(product, "outsole-type", values[kind]);
}

function getInsoleType(product: SpecificationInput, kind: FootwearKind) {
  const values: Record<FootwearKind, readonly string[]> = {
    turf: ["Supportive foam insole", "Contoured sports insole"],
    sports: ["Responsive foam insole", "Cushioned performance insole"],
    sneaker: ["Cushioned foam insole", "Lightly contoured insole"],
    school: ["Padded everyday insole", "Supportive foam insole"],
    formal: ["Lightly padded insole", "Contoured comfort insole"],
    heel: ["Cushioned forefoot insole", "Lightly padded insole"],
    open: ["Contoured comfort footbed", "Lightly cushioned footbed"],
    casual: ["Cushioned foam insole", "Lightly padded insole"],
  };
  return pick(product, "insole-type", values[kind]);
}

function getTerrain(kind: FootwearKind): readonly string[] {
  return {
    turf: ["Artificial turf", "Firm recreational ground"],
    sports: ["Gym floors", "Paved paths"],
    sneaker: ["Paved streets", "Indoor floors"],
    school: ["Indoor floors", "Paved school grounds"],
    formal: ["Indoor floors", "Paved surfaces"],
    heel: ["Indoor floors", "Smooth paved surfaces"],
    open: ["Indoor floors", "Dry paved surfaces"],
    casual: ["Paved streets", "Indoor floors"],
  }[kind];
}

function getIdealFor(kind: FootwearKind): readonly string[] {
  return {
    turf: ["Turf play", "Sports practice"],
    sports: ["Training", "Exercise", "Active days"],
    sneaker: ["Everyday wear", "Walking", "Casual outings"],
    school: ["School days", "Daily activities"],
    formal: ["Office wear", "Formal occasions"],
    heel: ["Smart-casual wear", "Occasions"],
    open: ["Casual outings", "Warm-weather wear"],
    casual: ["Everyday wear", "Casual outings"],
  }[kind];
}

function getWaterResistance(product: SpecificationInput, material: string) {
  const description = product.description?.toLowerCase() ?? "";
  if (material.includes("waterproof") || description.includes("waterproof")) {
    return "Waterproof";
  }
  if (isOneOf(material, ["rubber", "pvc", "eva"])) return "Splash-resistant";
  if (isOneOf(material, ["mesh", "canvas", "flyknit", "textile"])) return "Low";
  return "Limited";
}

function getFootwearFeatures(product: SpecificationInput, kind: FootwearKind) {
  const core: Record<FootwearKind, readonly string[]> = {
    turf: ["Turf-focused traction", "Supportive upper", "Flexible forefoot"],
    sports: ["Breathable construction", "Responsive cushioning", "Grippy outsole"],
    sneaker: ["Flexible construction", "Everyday cushioning", "Street traction"],
    school: ["Easy-wear design", "Durable outsole", "Padded interior"],
    formal: ["Clean profile", "Cushioned footbed", "Stable outsole"],
    heel: ["Stable heel profile", "Cushioned forefoot", "Dress outsole"],
    open: ["Open design", "Flexible sole", "Easy-on construction"],
    casual: ["Flexible construction", "Everyday traction", "Cushioned footbed"],
  };
  return [
    ...core[kind],
    pick(product, "feature-variant", [
      "Reinforced stress points",
      "Lightweight construction",
      "Textured outsole pattern",
      "Soft-touch interior",
    ]),
  ];
}

function createFootwearSpecifications(
  product: SpecificationInput,
): DemoSpecifications {
  const category = product.category?.toLowerCase() ?? "";
  const material = product.material?.toLowerCase() ?? "";
  const kind = getFootwearKind(category);
  const scores = createFootwearScores(product, kind);
  const [minimumWeight, maximumWeight] = FOOTWEAR_WEIGHT_RANGES[kind];
  const adultWeight = seededInteger(product, "estimated-weight", minimumWeight, maximumWeight);
  const estimatedWeightGrams =
    product.gender === "kids" ? Math.round(adultWeight * 0.72) : adultWeight;
  const isOpen = kind === "open";
  const isPerformance = kind === "sports" || kind === "turf";
  const comfortBrand = isOneOf(product.brand?.toLowerCase() ?? "", [
    "comfit", "scholl", "hush puppies",
  ]);

  return {
    source: "synthetic_demo",
    profile: "footwear",
    upperMaterial: getFootwearUpperMaterial(product.material),
    liningMaterial: getLiningMaterial(product, kind),
    soleMaterial: getSoleMaterial(product, kind),
    outsoleType: getOutsoleType(product, kind),
    insoleType: getInsoleType(product, kind),
    closure: getFootwearClosure(product, kind, category),
    toeShape: getToeShape(product, kind, category),
    ankleHeight: isOpen ? "Open" : "Low-top",
    fit: isPerformance ? "Performance fit" : isOpen ? "Relaxed fit" : "Regular fit",
    width: kind === "turf" ? "Snug" : isOpen || product.gender === "kids" ? "Roomy" : "Standard",
    cushioning: describeScore(scores.comfort, "Light cushioning", "Balanced cushioning", "Plush cushioning"),
    archSupport: comfortBrand || scores.stability >= 9 ? "Enhanced" : scores.stability >= 7 ? "Moderate" : "Light",
    flexibility: describeScore(scores.flexibility, "Structured", "Moderate", "Highly flexible"),
    breathability: describeScore(scores.breathability, "Low", "Moderate", "High"),
    grip: describeScore(scores.grip, "Light", "Everyday", "High-traction"),
    stability: describeScore(scores.stability, "Flexible", "Stable", "Highly stable"),
    weightClass: estimatedWeightGrams <= 240 ? "Lightweight" : estimatedWeightGrams <= 360 ? "Midweight" : "Substantial",
    estimatedWeightGrams,
    waterResistance: getWaterResistance(product, material),
    durability: describeScore(scores.durability, "Light-duty", "Everyday", "High"),
    terrain: getTerrain(kind),
    ...(kind === "heel"
      ? { heelHeight: category.includes("kitten") ? "Low heel (25–40 mm)" : "Medium heel (40–65 mm)" }
      : {}),
    idealFor: getIdealFor(kind),
    season: kind === "open"
      ? ["Warm weather", "Dry season"]
      : material.includes("waterproof")
        ? ["All-season", "Wet weather"]
        : ["All-season"],
    comfortScore: scores.comfort,
    breathabilityScore: scores.breathability,
    gripScore: scores.grip,
    durabilityScore: scores.durability,
    flexibilityScore: scores.flexibility,
    stabilityScore: scores.stability,
    features: getFootwearFeatures(product, kind),
  };
}

function createBagSpecifications(product: SpecificationInput): DemoSpecifications {
  const isBackpack = product.category?.toLowerCase() === "backpack";
  const isLeather = product.material?.toLowerCase().includes("leather") ?? false;
  const durabilityScore = variedScore(product, "bag-durability", isLeather || isBackpack ? 8 : 7);
  const organizationScore = variedScore(product, "bag-organization", isBackpack ? 8 : 6);
  const portabilityScore = variedScore(product, "bag-portability", isBackpack ? 7 : 8);
  const estimatedWeightGrams = isBackpack
    ? seededInteger(product, "bag-weight", 480, 680)
    : seededInteger(product, "bag-weight", isLeather ? 420 : 330, isLeather ? 650 : 520);

  return {
    source: "synthetic_demo",
    profile: isBackpack ? "backpack" : "bag",
    bodyMaterial: product.material,
    closure: "Zip closure",
    capacityLiters: isBackpack ? seededInteger(product, "capacity", 19, 25) : seededInteger(product, "capacity", 5, 11),
    compartments: isBackpack ? seededInteger(product, "compartments", 3, 5) : seededInteger(product, "compartments", 2, 4),
    strapType: isBackpack ? "Adjustable dual shoulder straps" : pick(product, "strap-type", ["Adjustable shoulder strap", "Detachable crossbody strap"]),
    laptopCompatibility: isBackpack ? pick(product, "laptop-fit", ["Up to 15-inch", "Up to 15.6-inch"]) : "Not designed for laptops",
    carryStyle: isBackpack ? "Back carry or top handle" : pick(product, "carry-style", ["Crossbody", "Shoulder carry"]),
    weightClass: estimatedWeightGrams < 500 ? "Lightweight" : "Midweight",
    estimatedWeightGrams,
    waterResistance: isBackpack ? "Water-resistant exterior" : "Limited splash resistance",
    durability: describeScore(durabilityScore, "Light-duty", "Everyday", "High"),
    idealFor: isBackpack ? ["Daily commuting", "Casual travel"] : ["Daily organization", "Casual outings"],
    season: ["All-season"],
    durabilityScore,
    organizationScore,
    portabilityScore,
    features: isBackpack
      ? ["Organized storage", "Adjustable shoulder straps", "Top carry handle", pick(product, "bag-feature", ["Quick-access pocket", "Padded back panel"])]
      : ["Organized interior", "Adjustable carry strap", "Compact profile", pick(product, "bag-feature", ["Inner slip pocket", "Quick-access pocket"])],
  };
}

function createWalletSpecifications(product: SpecificationInput): DemoSpecifications {
  const durabilityScore = variedScore(product, "wallet-durability", 8);
  const organizationScore = variedScore(product, "wallet-organization", 7);
  const portabilityScore = variedScore(product, "wallet-portability", 9);
  return {
    source: "synthetic_demo",
    profile: "wallet",
    bodyMaterial: product.material,
    closure: "Fold-over",
    fit: "Slim profile",
    carryStyle: "Pocket carry",
    cardSlots: seededInteger(product, "card-slots", 6, 10),
    billCompartments: seededInteger(product, "bill-compartments", 1, 2),
    coinPocket: seededInteger(product, "coin-pocket", 0, 1) === 1,
    weightClass: "Lightweight",
    estimatedWeightGrams: seededInteger(product, "wallet-weight", 90, 145),
    waterResistance: "Limited",
    durability: describeScore(durabilityScore, "Light-duty", "Everyday", "High"),
    idealFor: ["Daily organization", "Travel essentials"],
    season: ["All-season"],
    durabilityScore,
    organizationScore,
    portabilityScore,
    features: ["Card organization", "Compact carry", "Bill compartment", pick(product, "wallet-feature", ["Inner slip pocket", "Low-bulk fold"])],
  };
}

function createBeltSpecifications(product: SpecificationInput): DemoSpecifications {
  const durabilityScore = variedScore(product, "belt-durability", 8);
  const flexibilityScore = variedScore(product, "belt-flexibility", 6);
  const portabilityScore = variedScore(product, "belt-portability", 8);
  return {
    source: "synthetic_demo",
    profile: "belt",
    bodyMaterial: product.material,
    closure: "Buckle",
    buckleType: pick(product, "buckle-type", ["Classic pin buckle", "Single-prong buckle"]),
    widthMillimeters: seededInteger(product, "belt-width", 30, 38),
    flexibility: describeScore(flexibilityScore, "Structured", "Moderately flexible", "Highly flexible"),
    adjustability: "Multi-hole adjustable",
    fit: "Adjustable",
    style: pick(product, "belt-style", ["Classic", "Smart casual"]),
    occasion: ["Office wear", "Smart-casual outfits"],
    weightClass: "Lightweight",
    estimatedWeightGrams: seededInteger(product, "belt-weight", 145, 235),
    waterResistance: "Limited",
    durability: describeScore(durabilityScore, "Light-duty", "Everyday", "High"),
    idealFor: ["Office wear", "Smart-casual outfits"],
    season: ["All-season"],
    durabilityScore,
    flexibilityScore,
    portabilityScore,
    features: ["Adjustable fastening", "Classic profile", pick(product, "belt-feature", ["Finished edges", "Low-profile keeper"])],
  };
}

function createBottleSpecifications(product: SpecificationInput): DemoSpecifications {
  const durabilityScore = variedScore(product, "bottle-durability", 8);
  const portabilityScore = variedScore(product, "bottle-portability", 8);
  const estimatedWeightGrams = seededInteger(product, "bottle-weight", 280, 390);
  return {
    source: "synthetic_demo",
    profile: "bottle",
    bodyMaterial: product.material,
    closure: "Screw-top lid",
    capacityMilliliters: pick(product, "bottle-capacity", [650, 700, 750]),
    insulation: pick(product, "bottle-insulation", ["Double-wall insulation", "Vacuum-style insulation"]),
    lidType: "Threaded screw lid",
    leakResistance: describeScore(variedScore(product, "leak-resistance", 8), "Basic", "Leak-resistant", "High leak resistance"),
    portability: describeScore(portabilityScore, "Standard", "Portable", "Highly portable"),
    carryStyle: "Hand carry or bag pocket",
    weightClass: estimatedWeightGrams < 330 ? "Lightweight" : "Midweight",
    estimatedWeightGrams,
    durability: describeScore(durabilityScore, "Light-duty", "Everyday", "High"),
    idealFor: ["Workdays", "Exercise", "Travel"],
    season: ["All-season"],
    durabilityScore,
    portabilityScore,
    features: ["Reusable design", "Wide opening", "Portable profile", pick(product, "bottle-feature", ["Textured grip zone", "Compact lid profile"])],
  };
}

function createSockSpecifications(product: SpecificationInput): DemoSpecifications {
  const comfortScore = variedScore(product, "sock-comfort", 8);
  const breathabilityScore = variedScore(product, "sock-breathability", 8);
  const durabilityScore = variedScore(product, "sock-durability", 6);
  const flexibilityScore = variedScore(product, "sock-flexibility", 9);
  return {
    source: "synthetic_demo",
    profile: "socks",
    fit: "Stretch fit",
    cushioning: describeScore(comfortScore, "Minimal cushioning", "Light cushioning", "Soft cushioning"),
    breathability: describeScore(breathabilityScore, "Low", "Moderate", "High"),
    flexibility: describeScore(flexibilityScore, "Structured", "Flexible", "Highly flexible"),
    stretch: "Four-way knit stretch",
    sockHeight: pick(product, "sock-height", ["Crew and ankle mix", "Crew height"]),
    weightClass: "Lightweight",
    estimatedWeightGrams: seededInteger(product, "sock-weight", 45, 75),
    durability: describeScore(durabilityScore, "Light-duty", "Everyday", "High"),
    idealFor: ["Everyday wear", "Office wear"],
    season: ["All-season"],
    comfortScore,
    breathabilityScore,
    durabilityScore,
    flexibilityScore,
    portabilityScore: 10,
    features: ["Soft-touch knit", "Stretch construction", "Low-bulk profile", pick(product, "sock-feature", ["Comfort cuff", "Reinforced toe area"])],
  };
}

export function createDemoSpecifications(
  product: SpecificationInput,
): DemoSpecifications {
  const category = product.category?.toLowerCase();
  if (category === "bag" || category === "backpack") return createBagSpecifications(product);
  if (category === "wallet") return createWalletSpecifications(product);
  if (category === "belt") return createBeltSpecifications(product);
  if (category === "water bottle") return createBottleSpecifications(product);
  if (category === "socks") return createSockSpecifications(product);
  return createFootwearSpecifications(product);
}
