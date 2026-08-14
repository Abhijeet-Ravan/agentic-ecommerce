import { getProduct } from "@/lib/commerce/getProduct";
import {
  getAverageRating,
  getProductReviews,
  getReviewCount,
} from "@/lib/reviews";
import type { DemoSpecifications, Product } from "@/types/product";

export type ComparisonProductReference = {
  slug: string;
  name: string;
};

export type ComparisonProduct = {
  identity: {
    id: number;
    slug: string;
    name: string;
  };
  brand: string | null;
  price: {
    amount: number;
    currency: "BDT";
  };
  gender: Product["gender"] | null;
  category: string | null;
  material: string | null;
  color: string | null;
  sizes: readonly number[];
  productCode: string | null;
  description: string | null;
  primaryImage: string | null;
  reviews: {
    averageRating: number;
    reviewCount: number;
    ratingBreakdown: Record<3 | 4 | 5, number>;
    sample: readonly {
      rating: 3 | 4 | 5;
      text: string;
    }[];
    source: "synthetic_demo";
  };
  demoSpecifications: DemoSpecifications;
};

export type ProductComparison = {
  ok: true;
  products: {
    a: ComparisonProduct;
    b: ComparisonProduct;
  };
  derived: {
    price: {
      difference: number;
      currency: "BDT";
      cheaperProduct: ComparisonProductReference | null;
    };
    sizes: {
      shared: readonly number[];
      uniqueToA: readonly number[];
      uniqueToB: readonly number[];
    };
    rating: {
      difference: number;
      higherRatedProduct: ComparisonProductReference | null;
      source: "synthetic_demo";
    };
  };
};

export type ProductRecommendation = {
  winner: ComparisonProductReference;
  alternative: ComparisonProductReference;
  reasons: readonly string[];
  winnerIdealFor: readonly string[];
  alternativeIdealFor: readonly string[];
};

export type ProductComparisonError = {
  ok: false;
  error: {
    code: "PRODUCT_NOT_FOUND";
    missingSlugs: readonly string[];
  };
};

export type CompareProductsResult =
  | ProductComparison
  | ProductComparisonError;

function toReference(product: Product): ComparisonProductReference {
  return {
    slug: product.slug,
    name: product.name,
  };
}

function toComparisonProduct(product: Product): ComparisonProduct {
  const reviews = getProductReviews(product);
  const ratingBreakdown = {
    3: reviews.filter((review) => review.rating === 3).length,
    4: reviews.filter((review) => review.rating === 4).length,
    5: reviews.filter((review) => review.rating === 5).length,
  };

  return {
    identity: {
      id: product.id,
      slug: product.slug,
      name: product.name,
    },
    brand: product.brand ?? null,
    price: {
      amount: product.price,
      currency: "BDT",
    },
    gender: product.gender ?? null,
    category: product.category ?? null,
    material: product.material ?? null,
    color: product.color ?? null,
    sizes: [...(product.sizes ?? [])],
    productCode: product.productCode ?? null,
    description: product.description ?? null,
    primaryImage: product.images[0] ?? null,
    reviews: {
      averageRating: getAverageRating(reviews),
      reviewCount: getReviewCount(reviews),
      ratingBreakdown,
      sample: reviews.slice(0, 3).map((review) => ({
        rating: review.rating,
        text: review.text,
      })),
      source: "synthetic_demo",
    },
    demoSpecifications: product.demoSpecifications,
  };
}

function getCheaperProduct(
  productA: Product,
  productB: Product,
): ComparisonProductReference | null {
  if (productA.price === productB.price) {
    return null;
  }

  return toReference(productA.price < productB.price ? productA : productB);
}

function getHigherRatedProduct(
  productA: Product,
  ratingA: number,
  productB: Product,
  ratingB: number,
): ComparisonProductReference | null {
  if (ratingA === ratingB) {
    return null;
  }

  return toReference(ratingA > ratingB ? productA : productB);
}

function uniqueSortedSizes(sizes?: readonly number[]) {
  return [...new Set(sizes ?? [])].sort((first, second) => first - second);
}

const SCORE_FIELDS = [
  ["comfortScore", "comfort"],
  ["durabilityScore", "durability"],
  ["gripScore", "grip"],
  ["breathabilityScore", "breathability"],
  ["flexibilityScore", "flexibility"],
  ["stabilityScore", "stability"],
  ["organizationScore", "organization"],
  ["portabilityScore", "portability"],
] as const satisfies readonly (readonly [keyof DemoSpecifications, string])[];

function qualityAverage(product: ComparisonProduct) {
  const scores = SCORE_FIELDS.flatMap(([field]) => {
    const value = product.demoSpecifications[field];
    return typeof value === "number" ? [value] : [];
  });

  return scores.length
    ? scores.reduce((total, value) => total + value, 0) / scores.length
    : 5;
}

function recommendationScore(product: ComparisonProduct, lowerPrice: number) {
  const valueBonus = lowerPrice > 0
    ? Math.min(8, (lowerPrice / product.price.amount) * 8)
    : 0;

  return qualityAverage(product) * 6 + product.reviews.averageRating * 8 + valueBonus;
}

export function recommendProduct(comparison: ProductComparison): ProductRecommendation {
  const { a, b } = comparison.products;
  const lowerPrice = Math.min(a.price.amount, b.price.amount);
  const winner = recommendationScore(a, lowerPrice) >= recommendationScore(b, lowerPrice)
    ? a
    : b;
  const alternative = winner.identity.slug === a.identity.slug ? b : a;
  const reasons = SCORE_FIELDS.flatMap(([field, label]) => {
    const winnerValue = winner.demoSpecifications[field];
    const alternativeValue = alternative.demoSpecifications[field];

    return typeof winnerValue === "number" &&
      typeof alternativeValue === "number" &&
      winnerValue > alternativeValue
      ? [`better ${label} (${winnerValue}/10 vs ${alternativeValue}/10)`]
      : [];
  });

  if (winner.reviews.averageRating > alternative.reviews.averageRating) {
    reasons.push(
      `higher demo rating (${winner.reviews.averageRating.toFixed(1)} vs ${alternative.reviews.averageRating.toFixed(1)})`,
    );
  }

  if (winner.price.amount < alternative.price.amount) {
    reasons.push(`lower price by ${alternative.price.amount - winner.price.amount} taka`);
  }

  return {
    winner: winner.identity,
    alternative: alternative.identity,
    reasons: reasons.slice(0, 3).length
      ? reasons.slice(0, 3)
      : ["the strongest overall balance of specifications, rating and price"],
    winnerIdealFor: winner.demoSpecifications.idealFor ?? ["Everyday use"],
    alternativeIdealFor: alternative.demoSpecifications.idealFor ?? ["Everyday use"],
  };
}

export function compareProducts(
  slugA: string,
  slugB: string,
): CompareProductsResult {
  const productA = getProduct(slugA);
  const productB = getProduct(slugB);

  if (!productA || !productB) {
    const missingSlugs = [
      ...new Set([
        ...(!productA ? [slugA] : []),
        ...(!productB ? [slugB] : []),
      ]),
    ];

    return {
      ok: false,
      error: {
        code: "PRODUCT_NOT_FOUND",
        missingSlugs,
      },
    };
  }

  const comparisonA = toComparisonProduct(productA);
  const comparisonB = toComparisonProduct(productB);
  const sizesA = uniqueSortedSizes(productA.sizes);
  const sizesB = uniqueSortedSizes(productB.sizes);
  const sizesASet = new Set(sizesA);
  const sizesBSet = new Set(sizesB);

  return {
    ok: true,
    products: {
      a: comparisonA,
      b: comparisonB,
    },
    derived: {
      price: {
        difference: Math.abs(productA.price - productB.price),
        currency: "BDT",
        cheaperProduct: getCheaperProduct(productA, productB),
      },
      sizes: {
        shared: sizesA.filter((size) => sizesBSet.has(size)),
        uniqueToA: sizesA.filter((size) => !sizesBSet.has(size)),
        uniqueToB: sizesB.filter((size) => !sizesASet.has(size)),
      },
      rating: {
        difference:
          Math.round(
            Math.abs(
              comparisonA.reviews.averageRating -
                comparisonB.reviews.averageRating,
            ) * 10,
          ) / 10,
        higherRatedProduct: getHigherRatedProduct(
          productA,
          comparisonA.reviews.averageRating,
          productB,
          comparisonB.reviews.averageRating,
        ),
        source: "synthetic_demo",
      },
    },
  };
}
