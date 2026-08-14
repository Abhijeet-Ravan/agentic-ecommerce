import type { NextRequest } from "next/server";
import {
  compareProducts,
  recommendProduct,
} from "@/lib/commerce/compareProducts";
import { getProducts } from "@/lib/commerce/getProduct";
import { fail, list, money, openFunctionCall, queue, str } from "@/lib/agni/functionKit";
import { getPage } from "@/lib/agni/store";
import type { Product } from "@/types/product";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function resolveProduct(value: string) {
  const wanted = normalize(value);

  if (!wanted) return null;

  const products = getProducts();

  return (
    products.find((product) => normalize(product.slug) === wanted) ??
    products.find((product) => normalize(product.name) === wanted) ??
    products.find((product) => normalize(product.name).includes(wanted)) ??
    products.find((product) => wanted.includes(normalize(product.name))) ??
    null
  );
}

function reference(product: Product) {
  return {
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    color: product.color,
  };
}

function productLabel(product: {
  identity: { name: string };
  color: string | null;
  category: string | null;
}) {
  return `${product.identity.name}${product.color ? ` in ${product.color}` : ""}${
    product.category ? ` (${product.category})` : ""
  }`;
}

function describeUseCases(product: { demoSpecifications: { idealFor?: readonly string[] } }) {
  return product.demoSpecifications.idealFor?.slice(0, 3).join(", ") || "everyday use";
}

/**
 * `compare_products` gives the agent grounded comparison data and queues the
 * matching visual modal in the shopper's browser.
 */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const { args } = call;
  const rawA = str(args, "slug_a", "slugA", "product_a", "productA", "first_product");
  const rawB = str(args, "slug_b", "slugB", "product_b", "productB", "second_product");
  const productA = resolveProduct(rawA);
  const productB = resolveProduct(rawB);

  if (!productA || !productB) {
    return fail(
      "I couldn't confidently identify both products to compare. Use the exact slugs from search_catalog, or ask the shopper which two products they mean.",
      {
        missing: {
          first: productA ? null : rawA || "missing",
          second: productB ? null : rawB || "missing",
        },
        resolved: {
          first: productA ? reference(productA) : null,
          second: productB ? reference(productB) : null,
        },
      },
    );
  }

  if (productA.slug === productB.slug) {
    return fail(
      `Both choices resolve to ${productA.name}. Ask the shopper for the other product they want to compare.`,
      { product: reference(productA) },
    );
  }

  const comparison = compareProducts(productA.slug, productB.slug);

  if (!comparison.ok) {
    return fail("One of those products is no longer in the catalogue.", comparison.error);
  }

  const { a, b } = comparison.products;
  const returnToCart = getPage(call.sessionId)?.path === "/cart";
  const recommendation = recommendProduct(comparison);
  const winner = recommendation.winner.slug === a.identity.slug ? a : b;
  const other = winner.identity.slug === a.identity.slug ? b : a;
  const cheaper = comparison.derived.price.cheaperProduct;
  const higherRated = comparison.derived.rating.higherRatedProduct;
  const sharedSizes = comparison.derived.sizes.shared;
  const sizeSentence = sharedSizes.length
    ? `They overlap in sizes ${sharedSizes.join(", ")}.`
    : "Their stocked sizes do not overlap.";
  const priceSentence =
    comparison.derived.price.difference === 0
      ? "They are the same price."
      : `${cheaper?.name} is cheaper by ${money(comparison.derived.price.difference)}.`;
  const ratingSentence =
    comparison.derived.rating.difference === 0
      ? `Both average ${a.reviews.averageRating.toFixed(1)} from ${a.reviews.reviewCount} demo reviews.`
      : `${higherRated?.name} rates higher by ${comparison.derived.rating.difference.toFixed(
          1,
        )} stars in the demo reviews.`;

  return queue(
    call.sessionId,
    {
      type: "show_comparison",
      slugA: a.identity.slug,
      slugB: b.identity.slug,
      ...(returnToCart ? { returnToCart: true } : {}),
    },
    `${productLabel(a)} versus ${productLabel(b)}. ${priceSentence} ${ratingSentence} ${sizeSentence} ${a.identity.name} is strongest for ${describeUseCases(
      a,
    )}; ${b.identity.name} is strongest for ${describeUseCases(
      b,
    )}. Clean take: ${winner.identity.name} is the stronger overall choice because it has ${list(
      [...recommendation.reasons],
    )}. It is best suited to ${list([...recommendation.winnerIdealFor])}. Choose ${other.identity.name} when its style, construction or fit better matches your preference. The reviews and performance scores are demo data.`,
    {
      comparison,
      recommendation,
    },
  );
}
