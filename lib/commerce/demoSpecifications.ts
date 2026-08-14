import type { DemoSpecifications, Product } from "@/types/product";

type SpecificationInput = Pick<
  Product,
  "slug" | "brand" | "gender" | "category" | "material"
>;

function isOneOf(value: string, options: readonly string[]) {
  return options.some((option) => value.includes(option));
}

function getFootwearUpperMaterial(material?: string) {
  if (!material) {
    return undefined;
  }

  if (material.includes("+")) {
    return material.replaceAll("+", " and ");
  }

  if (material.includes("/") && material !== "Full grain waterproof leather") {
    return material.replaceAll("/", " and ");
  }

  return material;
}

function createBagSpecifications(
  product: SpecificationInput,
): DemoSpecifications {
  const isBackpack = product.category?.toLowerCase() === "backpack";

  return {
    source: "synthetic_demo",
    bodyMaterial: product.material,
    closure: "Zip closure",
    weight: isBackpack ? "Lightweight carry design" : "Standard carry weight",
    ...(isBackpack
      ? { waterResistance: "Water-resistant exterior" }
      : {}),
    idealFor: isBackpack
      ? ["Daily commuting", "Casual travel"]
      : ["Daily organization", "Casual outings"],
    features: isBackpack
      ? ["Organized storage", "Adjustable shoulder straps", "Top carry handle"]
      : ["Organized interior", "Adjustable carry strap", "Compact profile"],
  };
}

function createAccessorySpecifications(
  product: SpecificationInput,
): DemoSpecifications {
  const category = product.category?.toLowerCase();

  if (category === "wallet") {
    return {
      source: "synthetic_demo",
      bodyMaterial: product.material,
      closure: "Fold-over",
      fit: "Slim profile",
      idealFor: ["Daily organization", "Travel essentials"],
      features: ["Card organization", "Compact carry", "Bill compartment"],
    };
  }

  if (category === "belt") {
    return {
      source: "synthetic_demo",
      bodyMaterial: product.material,
      closure: "Buckle",
      fit: "Adjustable",
      idealFor: ["Office wear", "Smart-casual outfits"],
      features: ["Adjustable fastening", "Classic profile"],
    };
  }

  if (category === "water bottle") {
    return {
      source: "synthetic_demo",
      bodyMaterial: product.material,
      closure: "Screw-top lid",
      weight: "Portable everyday weight",
      idealFor: ["Workdays", "Exercise", "Travel"],
      features: ["Reusable design", "Portable profile", "Wide opening"],
    };
  }

  return {
    source: "synthetic_demo",
    fit: "Flexible everyday fit",
    cushioning: "Light cushioning",
    weight: "Lightweight",
    idealFor: ["Everyday wear", "Office wear"],
    features: ["Soft-touch knit", "Stretch construction", "Low-bulk profile"],
  };
}

function createFootwearSpecifications(
  product: SpecificationInput,
): DemoSpecifications {
  const category = product.category?.toLowerCase() ?? "";
  const material = product.material?.toLowerCase() ?? "";
  const isSports = category.includes("sports");
  const isSneaker = category.includes("sneaker");
  const isAthletic = isSports || isSneaker;
  const isTurf = category.includes("turf");
  const isSchool = category.includes("school");
  const isFormal = isOneOf(category, [
    "formal",
    "derby",
    "loafer",
    "moccasin",
  ]);
  const isOpenFootwear = isOneOf(category, [
    "sandal",
    "slide",
    "slipper",
    "clog",
  ]);
  const isHeel = isOneOf(category, ["heel", "pumps", "mule"]);
  const isSlipOn = isOneOf(category, [
    "slip-on",
    "loafer",
    "moccasin",
    "ballerina",
    "pumps",
    "mule",
    "slide",
    "slipper",
    "clog",
  ]);
  const isToePost = isOneOf(category, ["toe-post", "thong"]);
  const hasWaterFriendlyMaterial = isOneOf(material, [
    "rubber",
    "pvc",
    "waterproof",
  ]);

  let closure = "Easy-entry";
  if (isToePost) {
    closure = "Toe-post";
  } else if (isSlipOn) {
    closure = "Slip-on";
  } else if (isAthletic || isTurf || category.includes("lace-up")) {
    closure = "Lace-up";
  } else if (category === "sandal" || category === "flat sandal") {
    closure = product.gender === "kids" ? "Adjustable strap" : "Open strap";
  } else if (category === "derby shoe" || category === "formal shoe") {
    closure = "Lace-up";
  }

  let soleMaterial = "Flexible synthetic outsole";
  if (material === "rubber") {
    soleMaterial = "Rubber";
  } else if (material === "eva") {
    soleMaterial = "EVA";
  } else if (isTurf) {
    soleMaterial = "Textured rubber";
  } else if (isAthletic) {
    soleMaterial = "Rubber and EVA";
  } else if (isOpenFootwear) {
    soleMaterial = "Lightweight EVA";
  } else if (isFormal || isHeel) {
    soleMaterial = "TPR";
  }

  let fit = "Regular";
  if (isSports || isTurf) {
    fit = "Performance fit";
  } else if (isOpenFootwear) {
    fit = "Relaxed";
  }

  let cushioning = "Lightly cushioned footbed";
  if (isSports || isTurf) {
    cushioning = "Responsive foam cushioning";
  } else if (isSneaker) {
    cushioning = "Lightweight everyday cushioning";
  } else if (
    product.brand?.toLowerCase().includes("comfit") ||
    product.brand?.toLowerCase().includes("scholl")
  ) {
    cushioning = "Enhanced comfort footbed";
  } else if (isSchool || product.gender === "kids") {
    cushioning = "Soft everyday cushioning";
  }

  let idealFor: readonly string[] = ["Everyday wear", "Casual outings"];
  let features: readonly string[] = [
    "Flexible construction",
    "Everyday traction",
  ];

  if (isTurf) {
    idealFor = ["Turf play", "Sports practice"];
    features = [
      "Turf-focused traction",
      "Supportive upper",
      "Flexible forefoot",
    ];
  } else if (isSports) {
    idealFor = ["Training", "Exercise", "Active days"];
    features = ["Flexible construction", "Breathable design", "Grippy outsole"];
  } else if (isSneaker) {
    idealFor = ["Everyday wear", "Walking", "Casual outings"];
    features = ["Flexible construction", "Breathable design", "Grippy outsole"];
  } else if (isSchool) {
    idealFor = ["School days", "Daily activities"];
    features = ["Easy-wear design", "Durable outsole", "Padded interior"];
  } else if (isFormal) {
    idealFor = ["Office wear", "Formal occasions"];
    features = ["Clean profile", "Cushioned footbed", "Stable outsole"];
  } else if (isHeel) {
    idealFor = ["Smart-casual wear", "Occasions"];
    features = ["Stable heel profile", "Cushioned footbed"];
  } else if (isOpenFootwear) {
    idealFor = ["Casual outings", "Warm-weather wear"];
    features = ["Open design", "Flexible sole", "Easy-on construction"];
  }

  return {
    source: "synthetic_demo",
    upperMaterial: getFootwearUpperMaterial(product.material),
    soleMaterial,
    closure,
    fit,
    cushioning,
    weight:
      isAthletic || isOpenFootwear || product.gender === "kids"
        ? "Lightweight"
        : "Standard",
    ...(hasWaterFriendlyMaterial
      ? { waterResistance: "Splash-resistant" }
      : {}),
    ...(isHeel
      ? {
          heelHeight: category.includes("kitten")
            ? "Low heel"
            : "Medium heel",
        }
      : {}),
    idealFor,
    features,
  };
}

export function createDemoSpecifications(
  product: SpecificationInput,
): DemoSpecifications {
  const category = product.category?.toLowerCase();

  if (category === "bag" || category === "backpack") {
    return createBagSpecifications(product);
  }

  if (
    category === "wallet" ||
    category === "belt" ||
    category === "water bottle" ||
    category === "socks"
  ) {
    return createAccessorySpecifications(product);
  }

  return createFootwearSpecifications(product);
}
