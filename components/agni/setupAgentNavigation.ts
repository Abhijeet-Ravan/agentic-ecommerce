"use client";

import type { Room, RpcInvocationData } from "livekit-client";
import {
  comparisonRoute,
  productRoute,
  safeInternalRoute,
  searchRoute,
} from "@/lib/agni/routes";
import type { ProductSearchFilters } from "@/lib/commerce/types";

type NavigationRouter = {
  push(path: string): void;
  replace(path: string): void;
};

type CartItem = { productId: number; size?: number; quantity: number };

type CartController = {
  cartItems: CartItem[];
  addToCart(productId: number, size?: number): void;
  removeFromCart(productId: number, size?: number): void;
  updateQuantity(productId: number, quantity: number, size?: number): void;
  clearCart(): void;
};

type CatalogProduct = {
  id: number;
  slug: string;
  name: string;
  color?: string;
  price: number;
  sizes: number[];
};

type CatalogResponse = {
  count?: number;
  route?: string;
  product?: CatalogProduct;
  products?: CatalogProduct[];
  error?: string;
  kind?: "already" | "product" | "search";
};

const RPC_METHODS = [
  "navigate_page",
  "scroll_page",
  "highlight_element",
  "get_page_context",
  "search_catalog",
  "show_products",
  "open_product",
  "compare_products",
  "choose_compared_product",
  "close_comparison",
  "scroll_view",
  "choose_color",
  "choose_size",
  "add_to_cart",
  "open_cart",
  "update_cart",
  "checkout",
] as const;

const HIGHLIGHT_MS = 4_000;

function response(result: Record<string, unknown>) {
  return JSON.stringify(result);
}

function payload(data: RpcInvocationData) {
  try {
    const value: unknown = JSON.parse(data.payload);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function stringValue(input: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function numberValue(input: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = input[key];
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function findElement(selector: string) {
  if (!selector) return null;
  try {
    return document.querySelector<HTMLElement>(selector);
  } catch {
    return null;
  }
}

function currentProductSlug() {
  return document.querySelector<HTMLElement>('[data-agni-page="product"]')?.dataset
    .agniSlug;
}

function selectedSize() {
  const selected = document.querySelector<HTMLElement>(
    '[data-agni-size][aria-pressed="true"]',
  );
  const size = Number(selected?.dataset.agniSize);
  return Number.isFinite(size) ? size : undefined;
}

function filtersFrom(input: Record<string, unknown>): ProductSearchFilters {
  const slugs = [
    stringValue(input, "slug_a", "slugA"),
    stringValue(input, "slug_b", "slugB"),
  ].filter((value): value is string => Boolean(value));

  return {
    slugs: slugs.length ? slugs : undefined,
    query: stringValue(input, "query", "q"),
    brand: stringValue(input, "brand"),
    gender: stringValue(input, "gender"),
    category: stringValue(input, "category"),
    material: stringValue(input, "material"),
    color: stringValue(input, "color"),
    size: numberValue(input, "size"),
    minPrice: numberValue(input, "min_price", "minPrice"),
    maxPrice: numberValue(input, "max_price", "maxPrice"),
  };
}

function catalogQuery(input: Record<string, unknown>) {
  const filters = filtersFrom(input);
  const params = new URLSearchParams();

  if (filters.query) params.set("query", filters.query);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.gender) params.set("gender", filters.gender);
  if (filters.category) params.set("category", filters.category);
  if (filters.material) params.set("material", filters.material);
  if (filters.color) params.set("color", filters.color);
  if (filters.size !== undefined) params.set("size", String(filters.size));
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  if (filters.slugs?.length) params.set("slugs", filters.slugs.join(","));

  return params;
}

async function catalogProduct(slug: string) {
  const request = await fetch(`/api/agni/catalog?slug=${encodeURIComponent(slug)}`);
  const result = (await request.json()) as CatalogResponse;
  return request.ok ? result.product : undefined;
}

/** Register every browser capability exposed to the voice agent through LiveKit RPC. */
export function setupAgentNavigation(
  room: Room,
  router: NavigationRouter,
  getCart: () => CartController,
) {
  room.registerRpcMethod("navigate_page", async (data) => {
    const requestedPath = stringValue(payload(data), "path");
    const path = requestedPath ? safeInternalRoute(requestedPath) : null;
    if (!path) return response({ success: false, error: "Invalid internal path" });
    router.push(path);
    return response({ success: true, path });
  });

  room.registerRpcMethod("scroll_page", async (data) => {
    const selector = stringValue(payload(data), "selector");
    const target = selector ? findElement(selector) : null;
    if (!target) return response({ success: false, error: "Element not found" });
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    return response({ success: true, selector });
  });

  room.registerRpcMethod("highlight_element", async (data) => {
    const input = payload(data);
    const selector = stringValue(input, "selector");
    const agniId = stringValue(input, "agni_id", "agniId", "guide_id");
    const target = selector
      ? findElement(selector)
      : agniId
        ? findElement(`[data-agni-id="${CSS.escape(agniId)}"]`)
        : null;
    if (!target) return response({ success: false, error: "Element not found" });
    target.classList.add("agni-agent-highlight");
    window.setTimeout(() => target.classList.remove("agni-agent-highlight"), HIGHLIGHT_MS);
    return response({ success: true, selector: selector ?? `[data-agni-id=${agniId}]` });
  });

  room.registerRpcMethod("get_page_context", async () => {
    const visibleSlugs = [
      ...document.querySelectorAll<HTMLAnchorElement>('a[href^="/products/"]'),
    ]
      .map((link) => link.getAttribute("href")?.slice("/products/".length))
      .filter((slug): slug is string => Boolean(slug));
    return response({
      success: true,
      path: window.location.pathname,
      search: window.location.search,
      page: document.querySelector<HTMLElement>("[data-agni-page]")?.dataset.agniPage,
      product_slug: currentProductSlug(),
      selected_size: selectedSize(),
      visible_product_slugs: [...new Set(visibleSlugs)].slice(0, 12),
      cart: getCart().cartItems,
    });
  });

  room.registerRpcMethod("search_catalog", async (data) => {
    const request = await fetch(`/api/agni/catalog?${catalogQuery(payload(data))}`);
    const result = (await request.json()) as CatalogResponse;
    return response({ success: request.ok, ...result });
  });

  room.registerRpcMethod("show_products", async (data) => {
    const route = searchRoute(filtersFrom(payload(data)));
    router.push(route);
    return response({ success: true, route });
  });

  room.registerRpcMethod("open_product", async (data) => {
    const slug = stringValue(payload(data), "slug");
    if (!slug || !(await catalogProduct(slug))) {
      return response({ success: false, error: "Product not found" });
    }
    const route = productRoute(slug);
    router.push(route);
    return response({ success: true, slug, route });
  });

  room.registerRpcMethod("compare_products", async (data) => {
    const input = payload(data);
    const slugA = stringValue(input, "slug_a", "slugA");
    const slugB = stringValue(input, "slug_b", "slugB");
    if (!slugA || !slugB) {
      return response({ success: false, error: "Two product slugs are required" });
    }
    const route = comparisonRoute(slugA, slugB);
    router.push(route);
    return response({ success: true, route, slug_a: slugA, slug_b: slugB });
  });

  room.registerRpcMethod("choose_compared_product", async (data) => {
    const input = payload(data);
    const compared = new URLSearchParams(window.location.search)
      .get("compare")
      ?.split(",")
      .filter(Boolean);
    const choice = stringValue(input, "choice");
    const slug = stringValue(input, "slug") ??
      (choice === "second" ? compared?.[1] : compared?.[0]);
    if (!slug) return response({ success: false, error: "No compared product selected" });
    const route = productRoute(slug);
    router.push(route);
    return response({ success: true, slug, route });
  });

  room.registerRpcMethod("close_comparison", async () => {
    const params = new URLSearchParams(window.location.search);
    const route = params.get("returnTo") === "cart"
      ? "/cart"
      : (() => {
          params.delete("compare");
          params.delete("returnTo");
          return `/products${params.size ? `?${params}` : ""}`;
        })();
    router.replace(route);
    return response({ success: true, route });
  });

  room.registerRpcMethod("scroll_view", async (data) => {
    const input = payload(data);
    const direction = stringValue(input, "direction") ?? "down";
    const amount = stringValue(input, "amount") === "page" ? 0.82 : 0.38;
    const modal = findElement("[data-agni-comparison-scroll]");
    const distance = (modal?.clientHeight ?? window.innerHeight) * amount;
    if (modal) {
      const top = direction === "top" ? 0 : direction === "bottom"
        ? modal.scrollHeight
        : modal.scrollTop + (direction === "up" ? -distance : distance);
      modal.scrollTo({ top, behavior: "smooth" });
    } else {
      const top = direction === "top" ? 0 : direction === "bottom"
        ? document.documentElement.scrollHeight
        : window.scrollY + (direction === "up" ? -distance : distance);
      window.scrollTo({ top, behavior: "smooth" });
    }
    return response({ success: true, direction });
  });

  room.registerRpcMethod("choose_color", async (data) => {
    const color = stringValue(payload(data), "color");
    if (!color) return response({ success: false, error: "Color is required" });
    const slug = currentProductSlug();
    if (!slug) {
      const route = searchRoute({ color });
      router.push(route);
      return response({ success: true, route });
    }
    const request = await fetch(
      `/api/agni/catalog?siblingOf=${encodeURIComponent(slug)}&color=${encodeURIComponent(color)}`,
    );
    const result = (await request.json()) as CatalogResponse;
    const route = result.kind === "product" && result.product
      ? productRoute(result.product.slug)
      : result.route ?? searchRoute({ color });
    router.push(route);
    return response({ success: true, route, ...result });
  });

  room.registerRpcMethod("choose_size", async (data) => {
    const size = numberValue(payload(data), "size");
    const chip = size === undefined
      ? null
      : findElement(`[data-agni-size="${CSS.escape(String(size))}"]`);
    if (!chip) return response({ success: false, error: "Size is not available" });
    chip.click();
    return response({ success: true, size });
  });

  room.registerRpcMethod("add_to_cart", async (data) => {
    const input = payload(data);
    const slug = stringValue(input, "slug") ?? currentProductSlug();
    const size = numberValue(input, "size") ?? selectedSize();
    const quantity = Math.round(numberValue(input, "quantity") ?? 1);
    if (!slug) return response({ success: false, error: "Product slug is required" });
    if (size === undefined) return response({ success: false, error: "Size is required" });
    if (quantity < 1 || quantity > 20) {
      return response({ success: false, error: "Quantity must be from 1 to 20" });
    }
    const product = await catalogProduct(slug);
    if (!product) return response({ success: false, error: "Product not found" });
    if (product.sizes.length && !product.sizes.includes(size)) {
      return response({ success: false, error: "Size is not available", sizes: product.sizes });
    }
    for (let count = 0; count < quantity; count += 1) {
      getCart().addToCart(product.id, size);
    }
    router.push("/cart");
    return response({
      success: true,
      slug,
      size,
      quantity,
      added_total: product.price * quantity,
      route: "/cart",
    });
  });

  room.registerRpcMethod("open_cart", async () => {
    router.push("/cart");
    return response({ success: true, route: "/cart", cart: getCart().cartItems });
  });

  room.registerRpcMethod("update_cart", async (data) => {
    const input = payload(data);
    const operation = stringValue(input, "operation");
    const slug = stringValue(input, "slug");
    const size = numberValue(input, "size");
    const quantity = Math.round(numberValue(input, "quantity") ?? 0);
    const cart = getCart();
    if (operation === "clear") {
      cart.clearCart();
      return response({ success: true, operation });
    }
    if (!slug) return response({ success: false, error: "Product slug is required" });
    const product = await catalogProduct(slug);
    if (!product) return response({ success: false, error: "Product not found" });
    if (operation === "remove") cart.removeFromCart(product.id, size);
    else if (operation === "set_quantity") cart.updateQuantity(product.id, quantity, size);
    else if (operation === "keep_only") {
      for (const item of cart.cartItems) {
        if (item.productId !== product.id) cart.removeFromCart(item.productId, item.size);
      }
    } else return response({ success: false, error: "Invalid cart operation" });
    return response({ success: true, operation, slug, size, quantity });
  });

  room.registerRpcMethod("checkout", async () => {
    if (!getCart().cartItems.length) {
      return response({ success: false, error: "The cart is empty" });
    }
    router.push("/checkout");
    return response({ success: true, route: "/checkout" });
  });

  return () => {
    for (const method of RPC_METHODS) room.unregisterRpcMethod(method);
  };
}
