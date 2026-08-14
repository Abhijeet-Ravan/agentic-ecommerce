import { colorSiblings, summarize } from "@/lib/agni/catalog";
import type { ActionResult, CartLine, PageReport } from "@/lib/agni/types";
import { getProduct, getProducts } from "@/lib/commerce/getProduct";
import { searchProducts } from "@/lib/commerce/searchProducts";
import type { ProductSearchFilters, ProductSort } from "@/lib/commerce/types";
import type { Product } from "@/types/product";

const MAX_LISTED = 12;

function money(amount: number) {
  return `Tk ${amount.toLocaleString("en-US")}`;
}

function productLine(product: Product) {
  const summary = summarize(product);

  return [
    `- slug=${summary.slug}`,
    summary.name,
    summary.brand ?? "unbranded",
    summary.color ?? "no colour listed",
    summary.category ?? "uncategorised",
    money(summary.price),
    summary.sizes.length ? `sizes: ${summary.sizes.join(", ")}` : "one size",
  ].join(" | ");
}

function readFilters(search: string) {
  const params = new URLSearchParams(search);
  const number = (name: string) => {
    const raw = params.get(name);
    const parsed = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const sortValue = params.get("sort");
  const sort: ProductSort =
    sortValue === "price-asc" || sortValue === "price-desc" ? sortValue : "relevance";

  const filters: ProductSearchFilters = {
    slugs: params.get("slugs")?.split(",").map((slug) => slug.trim()).filter(Boolean),
    query: params.get("q") ?? undefined,
    brand: params.get("brand") ?? undefined,
    gender: params.get("gender") ?? undefined,
    category: params.get("category") ?? undefined,
    material: params.get("material") ?? undefined,
    color: params.get("color") ?? undefined,
    size: number("size"),
    minPrice: number("minPrice"),
    maxPrice: number("maxPrice"),
    sort,
  };

  return filters;
}

function describeFilters(filters: ProductSearchFilters) {
  const parts = Object.entries(filters)
    .filter(([name, value]) => value !== undefined && !(name === "sort" && value === "relevance"))
    .map(([name, value]) => `${name}=${JSON.stringify(value)}`);

  return parts.length ? parts.join("; ") : "none (showing everything)";
}

function cartSection(cart: CartLine[]) {
  const lines = cart.flatMap((item) => {
    const product = getProducts().find((candidate) => candidate.id === item.productId);
    return product ? [{ item, product }] : [];
  });

  if (!lines.length) return ["CART: empty"];

  const subtotal = lines.reduce(
    (total, { item, product }) => total + item.quantity * product.price,
    0,
  );
  const count = lines.reduce((total, { item }) => total + item.quantity, 0);

  return [
    `CART: ${count} item(s), subtotal ${money(subtotal)}`,
    ...lines.map(
      ({ item, product }) =>
        `- slug=${product.slug} | ${product.name} | size ${item.size ?? "n/a"} | qty ${item.quantity} | ${money(product.price * item.quantity)}`,
    ),
  ];
}

function resultsSection(results: ActionResult[]) {
  if (!results.length) return [];

  return [
    "RECENT ACTIONS (most recent last):",
    ...results.map(
      (result) =>
        `- ${result.type}: ${result.status}${result.detail ? ` — ${result.detail}` : ""}`,
    ),
  ];
}

function pageSection(report: PageReport) {
  const url = `${report.path}${report.search}`;

  if (report.path === "/") {
    return [
      `PAGE: home — ${url}`,
      "The shopper is on the landing page. Use search_products or open_product to move them.",
    ];
  }

  if (report.path === "/cart") {
    return [
      `PAGE: shopping cart — ${url}`,
      "The checkout button on this page is what the `checkout` action clicks.",
    ];
  }

  if (report.path === "/checkout") {
    return [
      `PAGE: checkout — ${url}`,
      "Payment is handled by the shopper from here. Do not queue further actions unless asked.",
    ];
  }

  if (report.path.startsWith("/products/")) {
    const slug = decodeURIComponent(report.path.slice("/products/".length));
    const product = getProduct(slug);

    if (!product) return [`PAGE: unknown product page — ${url}`];

    const siblings = colorSiblings(product);

    return [
      `PAGE: product detail — ${url}`,
      productLine(product),
      `SELECTED SIZE: ${report.selectedSize ?? "none yet — ask the shopper before adding to cart"}`,
      siblings.length
        ? `OTHER COLOURS OF THIS STYLE: ${siblings
            .map((sibling) => `${sibling.color ?? "?"} (slug=${sibling.slug})`)
            .join(", ")}`
        : "OTHER COLOURS OF THIS STYLE: none in the catalogue",
    ];
  }

  if (report.path === "/products") {
    const filters = readFilters(report.search);
    const results = searchProducts(filters);
    const shown = results.slice(0, MAX_LISTED);
    const comparisonOpen = new URLSearchParams(report.search).has("compare");

    return [
      `PAGE: product list — ${url}`,
      comparisonOpen
        ? "COMPARISON MODAL: open with the two listed products side by side"
        : "COMPARISON MODAL: closed",
      `FILTERS: ${describeFilters(filters)}`,
      results.length
        ? `RESULTS: ${results.length} match(es), first ${shown.length} listed:`
        : "RESULTS: 0 matches. Tell the shopper and offer a looser filter — do not invent products.",
      ...shown.map(productLine),
    ];
  }

  return [`PAGE: ${url}`];
}

/**
 * The single block the agent's `get_page_context` tool returns. Everything the
 * agent is allowed to say about what is on screen comes from here.
 */
export function buildPageContext(report: PageReport, results: ActionResult[]) {
  return [
    "### AGNI SHOP CONTEXT ###",
    `STORE: Stride (prices in BDT). Catalogue is fixed — only these products exist.`,
    ...pageSection(report),
    ...cartSection(report.cart),
    ...resultsSection(results),
    "### END AGNI SHOP CONTEXT ###",
  ].join("\n");
}
