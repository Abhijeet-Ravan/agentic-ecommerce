"use client";

import { useMemo } from "react";
import ProductSection from "@/components/home/ProductSection";
import { useCart } from "@/context/CartContext";
import { products } from "@/data/products";
import type { Product } from "@/types/product";

const RECOMMENDATION_COUNT = 8;

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function categoryWords(category?: string) {
  return new Set(
    normalize(category)
      .split(/[\s-]+/)
      .filter(Boolean),
  );
}

function categorySimilarity(a?: string, b?: string) {
  if (!a || !b) return 0;

  const normalizedA = normalize(a);
  const normalizedB = normalize(b);

  if (normalizedA === normalizedB) return 1;

  const wordsA = categoryWords(a);
  const wordsB = categoryWords(b);

  for (const word of wordsA) {
    if (wordsB.has(word)) return 0.6;
  }

  return 0;
}

function scoreRecommendation(
  candidate: Product,
  referenceProducts: Product[],
) {
  let bestScore = 0;

  for (const reference of referenceProducts) {
    let score = 0;

    // Strongest signals
    if (
      candidate.gender &&
      reference.gender &&
      candidate.gender === reference.gender
    ) {
      score += 5;
    }

    score += categorySimilarity(candidate.category, reference.category) * 6;

    // Secondary signals
    if (
      candidate.brand &&
      reference.brand &&
      normalize(candidate.brand) === normalize(reference.brand)
    ) {
      score += 2;
    }

    if (
      candidate.material &&
      reference.material &&
      normalize(candidate.material) === normalize(reference.material)
    ) {
      score += 1.5;
    }

    if (
      candidate.color &&
      reference.color &&
      normalize(candidate.color) === normalize(reference.color)
    ) {
      score += 0.75;
    }

    // Prefer roughly similar price bands.
    const largerPrice = Math.max(candidate.price, reference.price);

    if (largerPrice > 0) {
      const priceDifference =
        Math.abs(candidate.price - reference.price) / largerPrice;

      if (priceDifference <= 0.2) {
        score += 2;
      } else if (priceDifference <= 0.4) {
        score += 1;
      }
    }

    bestScore = Math.max(bestScore, score);
  }

  return bestScore;
}

function getFallbackRecommendations() {
  /*
   * Spread the fallback across the catalog rather than simply returning
   * products[0..7], which would make the section look like Best Sellers again.
   */
  const preferredIds = [2, 16, 21, 26, 37, 46, 50, 55];

  return preferredIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product))
    .slice(0, RECOMMENDATION_COUNT);
}

export default function RecommendationSection() {
  const { cartItems } = useCart();

  const recommendations = useMemo(() => {
    if (!cartItems.length) {
      return getFallbackRecommendations();
    }

    const cartProductIds = new Set(
      cartItems.map((item) => item.productId),
    );

    const referenceProducts = products.filter((product) =>
      cartProductIds.has(product.id),
    );

    if (!referenceProducts.length) {
      return getFallbackRecommendations();
    }

    return products
      .filter((product) => !cartProductIds.has(product.id))
      .map((product) => ({
        product,
        score: scoreRecommendation(product, referenceProducts),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        // Stable deterministic tie breaker.
        return a.product.id - b.product.id;
      })
      .slice(0, RECOMMENDATION_COUNT)
      .map(({ product }) => product);
  }, [cartItems]);

  return (
    <ProductSection
      title="Recommended For You"
      eyebrow="You may also like"
      products={recommendations}
      viewAllHref="/products"
    />
  );
}
