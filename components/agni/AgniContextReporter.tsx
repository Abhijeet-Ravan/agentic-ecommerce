"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useSessionId } from "@/lib/agni/session";

const HEARTBEAT_MS = 20_000;

/** The size chip the shopper (or the agent) has pressed on a product page. */
function selectedSize() {
  const pressed = document.querySelector<HTMLElement>(
    '[data-agni-size][aria-pressed="true"]',
  );
  const value = Number(pressed?.dataset.agniSize);

  return Number.isFinite(value) ? value : undefined;
}

/**
 * Pushes what the shopper is looking at to `/api/agni/context` on every route,
 * filter and cart change. The agent's `get_page_context` tool reads it back.
 */
export default function AgniContextReporter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { cartItems } = useCart();
  const sessionId = useSessionId();

  useEffect(() => {
    if (!sessionId) return;

    const controller = new AbortController();

    function push() {
      void fetch("/api/agni/context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          session_id: sessionId,
          path: pathname,
          search: window.location.search,
          cart: cartItems,
          selectedSize: selectedSize(),
        }),
      }).catch(() => {
        /* the shopper's page must not break because the guide is offline */
      });
    }

    // Let the new page paint before reading size chips out of the DOM.
    const initial = window.setTimeout(push, 150);
    const heartbeat = window.setInterval(push, HEARTBEAT_MS);

    window.addEventListener("agni:refresh-context", push);

    return () => {
      controller.abort();
      window.clearTimeout(initial);
      window.clearInterval(heartbeat);
      window.removeEventListener("agni:refresh-context", push);
    };
  }, [sessionId, pathname, searchParams, cartItems]);

  return null;
}
