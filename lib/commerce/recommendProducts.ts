import { getProducts } from "@/lib/commerce/getProduct";
import type { Product } from "@/types/product";

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function categorySimilarity(a?: string, b?: string) {
  if (!a || !b) return 0;

  const left = normalize(a);
  const right = normalize(b);

  if (left === right) return 1;

  const leftWords = new Set(left.split(/[\s-]+/).filter(Boolean));
  const rightWords = new Set(right.split(/[\s-]+/).filter(Boolean));

  for (const word of leftWords) {
    if (rightWords.has(word)) return 0.6;
  }

  return 0;
}

function score(candidate: Product, current: Product) {
  let total = 0;

  if (
    candidate.gender &&
    current.gender &&
    candidate.gender === current.gender
  ) {
    total += 5;
  }

  total += categorySimilarity(candidate.category, current.category) * 6;

  if (
    candidate.brand &&
    current.brand &&
    normalize(candidate.brand) === normalize(current.brand)
  ) {
    total += 2;
  }

  if (
    candidate.material &&
    current.material &&
    normalize(candidate.material) === normalize(current.material)
  ) {
    total += 1.5;
  }

  if (
    candidate.color &&
    current.color &&
    normalize(candidate.color) === normalize(current.color)
  ) {
    total += 0.75;
  }

  const largerPrice = Math.max(candidate.price, current.price);

  if (largerPrice > 0) {
    const difference =
      Math.abs(candidate.price - current.price) / largerPrice;

    if (difference <= 0.2) {
      total += 2;
    } else if (difference <= 0.4) {
      total += 1;
    }
  }

  return total;
}

export function recommendProductsForProduct(
  currentProduct: Product,
  limit = 8,
) {
  return getProducts()
    .filter((product) => product.id !== currentProduct.id)
    .map((product) => ({
      product,
      score: score(product, currentProduct),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.product.id - b.product.id;
    })
    .slice(0, limit)
    .map(({ product }) => product);
}
