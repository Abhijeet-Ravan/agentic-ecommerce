import type { NextRequest } from "next/server";
import { fail, openFunctionCall, queue, str } from "@/lib/agni/functionKit";
import { getPage } from "@/lib/agni/store";
import { compareProducts, recommendProduct } from "@/lib/commerce/compareProducts";
import { getProduct } from "@/lib/commerce/getProduct";

function comparisonSlugs(search: string) {
  return new URLSearchParams(search)
    .get("compare")
    ?.split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

function choiceIndex(value: string) {
  const normalized = value.trim().toLowerCase();

  if (["first", "1", "one", "a", "left"].includes(normalized)) return 0;
  if (["second", "2", "two", "b", "right"].includes(normalized)) return 1;

  return null;
}

function recommendedSlug(slugs: readonly string[]) {
  const comparison = compareProducts(slugs[0], slugs[1]);

  return comparison.ok ? recommendProduct(comparison).winner.slug : "";
}

/** Opens the chosen comparison item without adding, removing, or changing cart lines. */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const page = getPage(call.sessionId);
  const slugs = page?.path === "/products" ? comparisonSlugs(page.search) : undefined;

  if (slugs?.length !== 2) {
    return fail(
      "There is no two-product comparison open. Read the page context before resolving first or second.",
    );
  }

  const explicitSlug = str(call.args, "slug");
  const rawChoice = str(call.args, "choice", "position", "selection");
  const index = choiceIndex(rawChoice);
  const slug = explicitSlug && slugs.includes(explicitSlug)
    ? explicitSlug
    : ["better", "best", "recommended", "recommendation"].includes(
          rawChoice.toLowerCase(),
        )
      ? recommendedSlug(slugs)
    : index === null
      ? ""
      : slugs[index];

  if (!slug) {
    return fail("Say whether the shopper chose the first or second compared product.");
  }

  const product = getProduct(slug);

  if (!product) return fail("That compared product is no longer in the catalogue.");

  return queue(
    call.sessionId,
    { type: "open_product", slug: product.slug },
    `Opening ${product.name} and closing the comparison. The cart is unchanged. Ask for their size before adding it.`,
  );
}
