"use client";

import { useEffect, useState } from "react";

/**
 * Everything that identifies the agent (API key, agent id) stays server-side —
 * the browser only ever calls our own `/api/agni/*` routes. What's left here is
 * page-level behaviour.
 *
 * `NEXT_PUBLIC_*` names must be referenced statically for Next.js to inline them.
 */
export const agniConfig = {
  // Every action waits up to one poll before the page reacts, and the shopper
  // hears that gap as the agent going quiet — keep it short.
  pollMs: Number(process.env.NEXT_PUBLIC_AGNI_POLL_MS ?? "700"),
  debug: process.env.NEXT_PUBLIC_AGNI_DEBUG === "1",
};

/**
 * Whether the server has an Agni agent configured. Asked once per mount rather
 * than mirrored into a public env var that could drift from the real config.
 */
export function useAgniEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/agni/call", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { enabled?: boolean }) => setEnabled(Boolean(data.enabled)))
      .catch(() => {
        /* leave the assistant hidden if we can't tell */
      });

    return () => controller.abort();
  }, []);

  return enabled;
}
