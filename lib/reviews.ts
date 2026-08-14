import {
  mockReviewerNames,
  reviewTextPools,
} from "@/data/review-pools";
import type { Product } from "@/types/product";

export type ReviewRating = 3 | 4 | 5;

export type ProductReview = {
  id: string;
  reviewerName: string;
  rating: ReviewRating;
  text: string;
  date: string;
};

type RatingProfile = "mixed" | "strong" | "excellent";

const REVIEW_COUNT = 10;
const PROFILE_SALT = ":profile-v1-13";
const LATEST_DEMO_DATE = Date.UTC(2026, 5, 30);

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRandom(seed: number) {
  let state = seed;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(values: readonly T[], seed: number) {
  const shuffled = [...values];
  const random = createRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function getRatingProfile(slug: string): RatingProfile {
  const bucket = hashString(`${slug}${PROFILE_SALT}`) % 100;

  if (bucket < 20) {
    return "mixed";
  }

  if (bucket < 70) {
    return "strong";
  }

  return "excellent";
}

function getTargetRatingTotal(slug: string, profile: RatingProfile) {
  const totals = {
    mixed: [33, 34, 35, 36, 37, 38, 39],
    strong: [40, 41, 42, 43, 44],
    excellent: [45, 46, 47, 48, 49],
  } as const;
  const profileTotals = totals[profile];

  return profileTotals[
    hashString(`${slug}:average-v1`) % profileTotals.length
  ];
}

function createRatings(slug: string): ReviewRating[] {
  const profile = getRatingProfile(slug);
  const targetTotal = getTargetRatingTotal(slug, profile);
  let threeStarCount = 0;
  let fiveStarCount = 0;

  if (profile === "mixed") {
    fiveStarCount = 1;
    threeStarCount = 41 - targetTotal;
  } else if (profile === "strong") {
    threeStarCount = 1;
    fiveStarCount = targetTotal - 39;
  } else {
    fiveStarCount = targetTotal - 40;
  }

  const fourStarCount = REVIEW_COUNT - threeStarCount - fiveStarCount;
  const ratings: ReviewRating[] = [
    ...Array<ReviewRating>(threeStarCount).fill(3),
    ...Array<ReviewRating>(fourStarCount).fill(4),
    ...Array<ReviewRating>(fiveStarCount).fill(5),
  ];

  return shuffle(ratings, hashString(`${slug}:rating-order-v1`));
}

function createReviewDates(slug: string) {
  const possibleDayOffsets = Array.from(
    { length: 900 },
    (_, index) => index + 7,
  );

  return shuffle(
    possibleDayOffsets,
    hashString(`${slug}:review-dates-v1`),
  )
    .slice(0, REVIEW_COUNT)
    .sort((first, second) => first - second)
    .map((dayOffset) =>
      new Date(LATEST_DEMO_DATE - dayOffset * 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
}

export function getProductReviews(
  product: Pick<Product, "slug">,
): ProductReview[] {
  const { slug } = product;
  const ratings = createRatings(slug);
  const reviewerNames = shuffle(
    mockReviewerNames,
    hashString(`${slug}:reviewer-names-v1`),
  ).slice(0, REVIEW_COUNT);
  const dates = createReviewDates(slug);
  const textIndexes: Record<ReviewRating, number> = { 3: 0, 4: 0, 5: 0 };
  const textOrders = {
    3: shuffle(reviewTextPools[3], hashString(`${slug}:texts-3-v1`)),
    4: shuffle(reviewTextPools[4], hashString(`${slug}:texts-4-v1`)),
    5: shuffle(reviewTextPools[5], hashString(`${slug}:texts-5-v1`)),
  };

  return ratings.map((rating, index) => {
    const textIndex = textIndexes[rating];
    textIndexes[rating] += 1;

    return {
      id: `${slug}-review-${index + 1}`,
      reviewerName: reviewerNames[index],
      rating,
      text: textOrders[rating][textIndex],
      date: dates[index],
    };
  });
}

export function getAverageRating(reviews: readonly ProductReview[]) {
  if (reviews.length === 0) {
    return 0;
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / reviews.length;
}

export function getReviewCount(reviews: readonly ProductReview[]) {
  return reviews.length;
}
