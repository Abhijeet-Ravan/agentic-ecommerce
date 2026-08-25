"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { agniConfig } from "@/components/agni/config";
import { useCart } from "@/context/CartContext";
import {
  comparisonRoute,
  productRoute,
  safeInternalRoute,
  sameRoute,
  searchRoute,
} from "@/lib/agni/routes";
import { getSessionId } from "@/lib/agni/session";
import type { ActionResult, QueuedAction } from "@/lib/agni/types";

/** How a single attempt at an action ended. */
type Attempt = "done" | "retry" | { failed: string };

type ColorResolution = {
  kind: "product" | "already" | "search";
  product?: { slug: string; name: string; color?: string };
  route?: string;
};

type Pending = {
  action: QueuedAction;
  cancelled?: string;
  attempts: number;
  step: number;
  pushes: number;
  resolvedColor?: ColorResolution;
  resolvedProductId?: number;
  attemptsBefore?: number;
  note?: string;
};

const STEP_MS = 300;
const MAX_ATTEMPTS = 34; // ~10s, enough for a cold route to render
const HIGHLIGHT_MS = 2500;

function currentUrl() {
  return `${window.location.pathname}${window.location.search}`;
}

function pageMarker() {
  return document.querySelector("[data-agni-page]")?.getAttribute("data-agni-page") ?? null;
}

function element(selector: string) {
  return document.querySelector<HTMLElement>(selector);
}

/**
 * Performs the actions the agent queues: navigating, picking a size, clicking
 * ADD TO CART, clicking checkout. Mounted once, inside the cart provider.
 */
export default function AgniBridge() {
  const router = useRouter();
  const cart = useCart();
  const sessionRef = useRef("");
  const queueRef = useRef<Pending[]>([]);
  const seenRef = useRef(new Set<string>());
  const resultsRef = useRef<ActionResult[]>([]);
  const runningRef = useRef(false);
  const latest = useRef({ router, cart });

  useEffect(() => {
    latest.current = { router, cart };
  });

  useEffect(() => {
    sessionRef.current = getSessionId();

    if (!sessionRef.current) return;

    let disposed = false;

    function log(...args: unknown[]) {
      if (agniConfig.debug) console.log("[agni-bridge]", ...args);
    }

    function flushResults() {
      const results = resultsRef.current;

      if (!results.length) return;

      resultsRef.current = [];
      void fetch("/api/agni/actions", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: sessionRef.current, results }),
      }).catch(() => {});
    }

    function finish(pending: Pending, status: "ok" | "failed", detail?: string) {
      log(pending.action.type, status, detail ?? "");
      resultsRef.current.push({
        id: pending.action.id,
        type: pending.action.type,
        status,
        detail,
        at: Date.now(),
      });
      window.dispatchEvent(new Event("agni:refresh-context"));
      flushResults();
      // The agent usually queues its next action the moment it sees this
      // result — don't make it wait for the next scheduled poll.
      void poll();
    }

    /** Navigate, then wait until the destination has actually rendered. */
    function goTo(pending: Pending, route: string, marker?: string, slug?: string): Attempt {
      const arrived =
        sameRoute(currentUrl(), route) &&
        (!marker || pageMarker() === marker) &&
        (!slug ||
          Boolean(element(`[data-agni-page="product"][data-agni-slug="${CSS.escape(slug)}"]`)));

      if (arrived) return "done";

      // Push once, then re-push only if the navigation seems to have been lost.
      if (pending.pushes === 0 || pending.attempts % 12 === 0) {
        pending.pushes += 1;
        latest.current.router.push(route);
      }

      return "retry";
    }

    /** Product pages use a traditional full-document navigation. */
    function openProductPage(pending: Pending, slug: string): Attempt {
      const route = productRoute(slug);
      const arrived =
        sameRoute(currentUrl(), route) &&
        Boolean(element(`[data-agni-page="product"][data-agni-slug="${CSS.escape(slug)}"]`));

      if (arrived) return "done";

      if (pending.pushes === 0) {
        pending.pushes += 1;
        window.location.assign(route);
      }

      return "retry";
    }

    function clickSize(size: number): Attempt {
      if (pageMarker() !== "product") return { failed: "Not on a product page." };

      const chip = element(`[data-agni-size="${CSS.escape(String(size))}"]`);

      if (!chip) {
        return { failed: `Size ${size} is not available for this product.` };
      }

      chip.click();

      return "done";
    }

    function closeComparison(pending: Pending): Attempt {
      const params = new URLSearchParams(window.location.search);

      if (!params.has("compare")) return "done";

      if (params.get("returnTo") === "cart") {
        return goTo(pending, "/cart", "cart");
      }

      params.delete("compare");
      params.delete("returnTo");
      const route = `${window.location.pathname}${params.size ? `?${params}` : ""}`;

      return goTo(pending, route, pageMarker() ?? undefined);
    }

    async function resolveProductId(slug: string) {
      const response = await fetch(`/api/agni/catalog?slug=${encodeURIComponent(slug)}`);

      if (!response.ok) return null;

      const data: { product?: { id: number } } = await response.json();

      return data.product?.id ?? null;
    }

    async function perform(pending: Pending): Promise<Attempt> {
      const { action } = pending;

      switch (action.type) {
        case "navigate_to": {
          const route = safeInternalRoute(action.route);

          return route
            ? goTo(pending, route)
            : { failed: `Refused to navigate to "${action.route}".` };
        }

        case "search_products":
          return goTo(pending, searchRoute(action), "products");

        case "show_comparison":
          return goTo(
            pending,
            comparisonRoute(action.slugA, action.slugB, action.returnToCart),
            "products",
          );

        case "close_comparison": {
          const closed = closeComparison(pending);

          if (closed === "done") pending.note = "Comparison closed.";

          return closed;
        }

        case "scroll_view": {
          const modal = element("[data-agni-comparison-scroll]");
          const target = modal ?? document.scrollingElement;

          if (!target) return { failed: "There is nothing available to scroll." };

          const viewport = modal ? modal.clientHeight : window.innerHeight;
          const distance = viewport * (action.amount === "page" ? 0.82 : 0.38);
          const before = modal ? modal.scrollTop : window.scrollY;
          const requestedTop = action.direction === "top"
            ? 0
            : action.direction === "bottom"
              ? target.scrollHeight
              : before + (action.direction === "up" ? -distance : distance);
          const top = Math.max(0, Math.min(requestedTop, target.scrollHeight - viewport));

          if (Math.abs(top - before) < 1) {
            pending.note = `The ${modal ? "comparison" : "page"} is already at the ${
              action.direction === "up" || action.direction === "top" ? "top" : "bottom"
            }.`;
            return "done";
          }

          if (modal) {
            modal.scrollTo({ top, behavior: "smooth" });
          } else {
            window.scrollTo({ top, behavior: "smooth" });
          }

          await new Promise((resolve) => window.setTimeout(resolve, 320));

          const after = modal ? modal.scrollTop : window.scrollY;

          // Some browsers ignore smooth scrolling while focus is in the voice UI.
          if (Math.abs(after - before) < 1) {
            if (modal) modal.scrollTo({ top, behavior: "auto" });
            else window.scrollTo({ top, behavior: "auto" });
          }

          pending.note = `Scrolled the ${modal ? "comparison" : "page"} ${action.direction}.`;

          return "done";
        }

        case "open_product":
          return openProductPage(pending, action.slug);

        case "open_cart":
          return goTo(pending, "/cart", "cart");

        case "select_size": {
          const result = clickSize(action.size);

          if (result === "done") pending.note = `Size ${action.size} selected.`;

          return result;
        }

        case "select_color": {
          // On a listing page "in blue" just tightens the filter.
          if (pageMarker() !== "product") {
            const params = new URLSearchParams(window.location.search);
            params.set("color", action.color);

            return goTo(pending, `/products?${params}`, "products");
          }

          const slug = element("[data-agni-page='product']")?.dataset.agniSlug ?? "";

          if (!pending.resolvedColor) {
            const response = await fetch(
              `/api/agni/catalog?siblingOf=${encodeURIComponent(slug)}&color=${encodeURIComponent(action.color)}`,
            );

            if (!response.ok) return { failed: "Could not look up that colour." };

            pending.resolvedColor = (await response.json()) as ColorResolution;
          }

          const resolved = pending.resolvedColor;

          if (resolved.kind === "already") {
            pending.note = `Already showing the ${action.color} colourway.`;
            return "done";
          }

          if (resolved.kind === "product" && resolved.product) {
            pending.note = `Switched to ${resolved.product.name}.`;
            return goTo(
              pending,
              productRoute(resolved.product.slug),
              "product",
              resolved.product.slug,
            );
          }

          pending.note = `No exact ${action.color} version of this style — showing ${action.color} alternatives.`;

          return goTo(pending, resolved.route ?? "/products", "products");
        }

        case "add_to_cart": {
          if (pending.step === 0) {
            if (action.slug) {
              const arrived = goTo(
                pending,
                productRoute(action.slug),
                "product",
                action.slug,
              );

              if (arrived !== "done") return arrived;
            } else if (pageMarker() !== "product") {
              return { failed: "No product open — open a product first." };
            }

            pending.step = 1;
            return "retry";
          }

          if (pending.step === 1) {
            if (action.size !== undefined) {
              const picked = clickSize(action.size);

              if (picked !== "done") return picked;
            }

            pending.step = 2;
            return "retry";
          }

          if (pending.step === 2) {
            const button = element('[data-agni-id="product.addToCart"]');

            if (!button) return "retry";

            pending.attemptsBefore = Number(button.dataset.agniAttempts ?? "0");
            for (let count = 0; count < action.quantity; count += 1) {
              button.click();
            }
            pending.step = 3;
            return "retry";
          }

          // Wait for this press to be reflected, not a message left by an earlier one.
          const pressed = Number(
            element('[data-agni-id="product.addToCart"]')?.dataset.agniAttempts ?? "0",
          );

          if (pressed < (pending.attemptsBefore ?? 0) + action.quantity) return "retry";

          const message = element('[data-agni-id="product.message"]')?.textContent?.trim();

          if (!message) return "retry";

          if (message.startsWith("Please")) return { failed: message };

          pending.note = `Added ${action.quantity} to the cart.`;
          return "done";
        }

        case "checkout": {
          const arrived = goTo(pending, "/cart", "cart");

          if (arrived !== "done") return arrived;

          const button = element('[data-agni-id="cart.checkout"]');

          if (!button) return { failed: "The cart is empty, so there is nothing to buy." };

          button.click();
          pending.note = "Checkout opened — payment is the shopper's to complete.";

          return "done";
        }

        case "remove_from_cart":
        case "set_quantity": {
          const comparisonClosed = closeComparison(pending);

          if (comparisonClosed !== "done") return comparisonClosed;

          if (pending.resolvedProductId === undefined) {
            const id = await resolveProductId(action.slug);

            if (id === null) return { failed: `No product "${action.slug}".` };

            pending.resolvedProductId = id;
          }

          if (action.type === "remove_from_cart") {
            latest.current.cart.removeFromCart(pending.resolvedProductId, action.size);
          } else {
            latest.current.cart.updateQuantity(
              pending.resolvedProductId,
              action.quantity,
              action.size,
            );
          }

          return "done";
        }

        case "clear_cart": {
          const comparisonClosed = closeComparison(pending);

          if (comparisonClosed !== "done") return comparisonClosed;

          latest.current.cart.clearCart();
          return "done";
        }

        case "highlight_element": {
          const target = element(`[data-agni-id="${CSS.escape(action.agniId)}"]`);

          if (!target) return "retry";

          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.classList.add("agni-highlight");
          window.setTimeout(() => target.classList.remove("agni-highlight"), HIGHLIGHT_MS);

          return "done";
        }

        default:
          return { failed: "Unsupported action." };
      }
    }

    async function tick() {
      if (runningRef.current || disposed) return;

      const pending = queueRef.current[0];

      if (!pending) return;

      if (pending.cancelled) {
        queueRef.current.shift();
        finish(pending, "failed", pending.cancelled);
        return;
      }

      runningRef.current = true;

      try {
        pending.attempts += 1;

        const outcome = await perform(pending);

        if (outcome === "done") {
          queueRef.current.shift();
          finish(pending, "ok", pending.note);
        } else if (typeof outcome === "object") {
          queueRef.current.shift();
          finish(pending, "failed", outcome.failed);
        } else if (pending.attempts >= MAX_ATTEMPTS) {
          queueRef.current.shift();
          finish(pending, "failed", "Timed out waiting for the page to respond.");
        }
      } catch (error) {
        queueRef.current.shift();
        finish(pending, "failed", error instanceof Error ? error.message : "Unknown error.");
      } finally {
        runningRef.current = false;
      }
    }

    async function poll() {
      if (document.hidden || disposed) return;

      try {
        const response = await fetch(
          `/api/agni/actions?sid=${encodeURIComponent(sessionRef.current)}`,
          { cache: "no-store" },
        );

        if (!response.ok) return;

        const data: { actions?: QueuedAction[]; needContext?: boolean } =
          await response.json();

        // The server forgot this session (restart, or a fresh instance). Re-push
        // rather than making the agent ask the shopper to reload.
        if (data.needContext) {
          log("server has no context — re-pushing");
          window.dispatchEvent(new Event("agni:refresh-context"));
        }

        for (const action of data.actions ?? []) {
          if (seenRef.current.has(action.id)) continue;

          seenRef.current.add(action.id);

          if (action.type === "show_comparison") {
            for (const pending of queueRef.current) {
              if (
                pending.action.type === "search_products" ||
                pending.action.type === "show_comparison"
              ) {
                pending.cancelled = "Superseded by the shopper's newer comparison request.";
              }
            }
          }

          if (
            action.type === "close_comparison" ||
            action.type === "open_product" ||
            action.type === "open_cart" ||
            action.type === "checkout" ||
            action.type === "add_to_cart" ||
            action.type === "remove_from_cart" ||
            action.type === "set_quantity" ||
            action.type === "clear_cart"
          ) {
            for (const pending of queueRef.current) {
              if (pending.action.type === "show_comparison") {
                pending.cancelled = "Superseded by the shopper's newer selection or cart request.";
              }
            }
          }

          queueRef.current.push({ action, attempts: 0, step: 0, pushes: 0 });
          log("queued", action);
        }
      } catch {
        /* offline or backend restarting — the next poll will catch up */
      }
    }

    const pollTimer = window.setInterval(poll, Math.max(400, agniConfig.pollMs));
    const stepTimer = window.setInterval(() => void tick(), STEP_MS);

    void poll();

    return () => {
      disposed = true;
      window.clearInterval(pollTimer);
      window.clearInterval(stepTimer);
    };
  }, []);

  return null;
}
