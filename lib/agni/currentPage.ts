import { getPage } from "@/lib/agni/store";
import { getProduct, getProducts } from "@/lib/commerce/getProduct";

/** The product the shopper has open right now, if any. */
export function openProduct(sessionId: string) {
  const page = getPage(sessionId);

  if (!page?.path.startsWith("/products/")) return undefined;

  return getProduct(decodeURIComponent(page.path.slice("/products/".length)));
}

/** What is in the shopper's cart, as last reported by their browser. */
export function cartState(sessionId: string) {
  const lines = (getPage(sessionId)?.cart ?? []).flatMap((item) => {
    const product = getProducts().find((candidate) => candidate.id === item.productId);
    return product ? [{ item, product }] : [];
  });

  return {
    lines,
    count: lines.reduce((total, { item }) => total + item.quantity, 0),
    subtotal: lines.reduce(
      (total, { item, product }) => total + item.quantity * product.price,
      0,
    ),
  };
}
