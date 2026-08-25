import type { ProductSearchFilters, ProductSort } from "@/lib/commerce/types";

/**
 * Actions the Agni shopping agent can queue for the browser to perform.
 * The agent never touches the DOM — it POSTs one of these, and the in-page
 * bridge performs it (navigating, clicking, adding to cart).
 */
export type AgniAction =
  | ({ type: "search_products" } & ProductSearchFilters)
  | { type: "show_comparison"; slugA: string; slugB: string; returnToCart?: boolean }
  | { type: "close_comparison" }
  | { type: "scroll_view"; direction: "up" | "down" | "top" | "bottom"; amount: "little" | "page" }
  | { type: "open_product"; slug: string }
  | { type: "select_color"; color: string }
  | { type: "select_size"; size: number }
  | { type: "add_to_cart"; slug?: string; size?: number; quantity: number }
  | { type: "open_cart" }
  | { type: "checkout" }
  | { type: "remove_from_cart"; slug: string; size?: number }
  | { type: "set_quantity"; slug: string; quantity: number; size?: number }
  | { type: "clear_cart" }
  | { type: "navigate_to"; route: string }
  | { type: "highlight_element"; agniId: string };

export type AgniActionType = AgniAction["type"];

export type QueuedAction = AgniAction & {
  id: string;
  queuedAt: number;
};

export type ActionResult = {
  id: string;
  type: AgniActionType;
  status: "ok" | "failed";
  detail?: string;
  at: number;
};

export type CartLine = {
  productId: number;
  size?: number;
  quantity: number;
};

export type PageReport = {
  sessionId: string;
  path: string;
  search: string;
  cart: CartLine[];
  selectedSize?: number;
};

const ACTION_TYPES = [
  "search_products",
  "show_comparison",
  "close_comparison",
  "scroll_view",
  "open_product",
  "select_color",
  "select_size",
  "add_to_cart",
  "open_cart",
  "checkout",
  "remove_from_cart",
  "set_quantity",
  "clear_cart",
  "navigate_to",
  "highlight_element",
] as const satisfies readonly AgniActionType[];

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function textList(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const cleaned = values.flatMap((entry) => {
    const value = text(entry);
    return value ? [value] : [];
  });

  return cleaned.length ? cleaned : undefined;
}

/** Voice agents routinely send numbers as strings ("size": "8"). */
function number(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function sort(value: unknown): ProductSort | undefined {
  const raw = text(value);
  return raw === "price-asc" || raw === "price-desc" || raw === "relevance"
    ? raw
    : undefined;
}

function defined<T extends object>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

export type ParsedAction =
  | { ok: true; action: AgniAction }
  | { ok: false; error: string };

/**
 * Validates an untrusted action payload (agent tool call or debug console).
 * Unknown keys are dropped rather than trusted.
 */
export function parseAction(input: unknown): ParsedAction {
  const body = record(input);

  if (!body) return { ok: false, error: "Body must be a JSON object." };

  const type = text(body.type);

  if (!type || !ACTION_TYPES.includes(type as AgniActionType)) {
    return {
      ok: false,
      error: `Unknown action type. Expected one of: ${ACTION_TYPES.join(", ")}.`,
    };
  }

  switch (type as AgniActionType) {
    case "search_products":
      return {
        ok: true,
        action: defined({
          type: "search_products",
          slugs: textList(body.slugs),
          query: text(body.query ?? body.q),
          brand: text(body.brand),
          gender: text(body.gender),
          category: text(body.category),
          material: text(body.material),
          color: text(body.color),
          size: number(body.size),
          minPrice: number(body.minPrice),
          maxPrice: number(body.maxPrice),
          sort: sort(body.sort),
        }),
      };

    case "open_product": {
      const slug = text(body.slug);
      return slug
        ? { ok: true, action: { type: "open_product", slug } }
        : { ok: false, error: "open_product requires a slug." };
    }

    case "show_comparison": {
      const slugA = text(body.slugA ?? body.slug_a);
      const slugB = text(body.slugB ?? body.slug_b);

      return slugA && slugB
        ? {
            ok: true,
            action: defined({
              type: "show_comparison",
              slugA,
              slugB,
              returnToCart: body.returnToCart === true ? true : undefined,
            }),
          }
        : { ok: false, error: "show_comparison requires slug_a and slug_b." };
    }

    case "close_comparison":
      return { ok: true, action: { type: "close_comparison" } };

    case "scroll_view": {
      const direction = text(body.direction);
      const amount = text(body.amount);

      if (!direction || !["up", "down", "top", "bottom"].includes(direction)) {
        return { ok: false, error: "scroll_view requires up, down, top, or bottom." };
      }

      return {
        ok: true,
        action: {
          type: "scroll_view",
          direction: direction as "up" | "down" | "top" | "bottom",
          amount: amount === "page" ? "page" : "little",
        },
      };
    }

    case "select_color": {
      const color = text(body.color);
      return color
        ? { ok: true, action: { type: "select_color", color } }
        : { ok: false, error: "select_color requires a color." };
    }

    case "select_size": {
      const size = number(body.size);
      return size !== undefined
        ? { ok: true, action: { type: "select_size", size } }
        : { ok: false, error: "select_size requires a numeric size." };
    }

    case "add_to_cart":
      return {
        ok: true,
        action: defined({
          type: "add_to_cart",
          slug: text(body.slug),
          size: number(body.size),
          quantity: Math.max(1, Math.min(20, Math.round(number(body.quantity) ?? 1))),
        }),
      };

    case "remove_from_cart": {
      const slug = text(body.slug);
      return slug
        ? {
            ok: true,
            action: defined({
              type: "remove_from_cart",
              slug,
              size: number(body.size),
            }),
          }
        : { ok: false, error: "remove_from_cart requires a slug." };
    }

    case "set_quantity": {
      const slug = text(body.slug);
      const quantity = number(body.quantity);

      if (!slug) return { ok: false, error: "set_quantity requires a slug." };
      if (quantity === undefined || quantity < 0) {
        return { ok: false, error: "set_quantity requires a quantity of 0 or more." };
      }

      return {
        ok: true,
        action: defined({
          type: "set_quantity",
          slug,
          quantity: Math.round(quantity),
          size: number(body.size),
        }),
      };
    }

    case "navigate_to": {
      const route = text(body.route);
      return route
        ? { ok: true, action: { type: "navigate_to", route } }
        : { ok: false, error: "navigate_to requires a route." };
    }

    case "highlight_element": {
      const agniId = text(body.agniId ?? body.agni_id ?? body.guide_id);
      return agniId
        ? { ok: true, action: { type: "highlight_element", agniId } }
        : { ok: false, error: "highlight_element requires an agni_id." };
    }

    default:
      return { ok: true, action: { type: type as "open_cart" | "checkout" | "clear_cart" } };
  }
}
