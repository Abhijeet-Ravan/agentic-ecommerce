import type { NextRequest } from "next/server";
import { summarize } from "@/lib/agni/catalog";
import { fail, list, money, ok, openFunctionCall, queue, str } from "@/lib/agni/functionKit";
import { getProduct } from "@/lib/commerce/getProduct";
import { searchProducts } from "@/lib/commerce/searchProducts";

/**
 * `open_product` — open one product's page. Accepts a slug from
 * `search_catalog`, or a spoken name, which we resolve against the catalogue.
 */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const slug = str(call.args, "slug");
  const name = str(call.args, "name", "product", "query");
  const product =
    (slug ? getProduct(slug) : undefined) ??
    (name ? searchProducts({ query: name })[0] : undefined);

  if (!product) {
    const alternatives = searchProducts({ query: name }).slice(0, 3).map(summarize);

    return alternatives.length
      ? ok(
          `I couldn't find that exact one. We do have ${list(alternatives.map((item) => item.name))}. Ask which they'd like.`,
          { products: alternatives },
        )
      : fail("We don't carry anything like that. Ask them to describe it differently.");
  }

  const sizes = product.sizes ?? [];

  return queue(
    call.sessionId,
    { type: "open_product", slug: product.slug },
    `Opening the ${product.name}, ${product.color ?? "unlisted colour"}, ${money(product.price)}.${sizes.length ? ` Available in sizes ${list(sizes)}.` : ""}`,
    );
}
