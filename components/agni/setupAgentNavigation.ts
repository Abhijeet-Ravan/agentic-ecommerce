"use client";

import type { Room, RpcInvocationData } from "livekit-client";
import { safeInternalRoute } from "@/lib/agni/routes";

type NavigationRouter = {
  push(path: string): void;
};

const RPC_METHODS = ["navigate_page", "scroll_page", "highlight_element"] as const;
const HIGHLIGHT_MS = 4_000;

function response(result: Record<string, unknown>) {
  return JSON.stringify(result);
}

function payloadValue(data: RpcInvocationData, key: "path" | "selector") {
  try {
    const payload: unknown = JSON.parse(data.payload);

    if (!payload || typeof payload !== "object") return null;

    const value = (payload as Record<string, unknown>)[key];
    return typeof value === "string" ? value.trim() : null;
  } catch {
    return null;
  }
}

function findElement(selector: string) {
  if (!selector) return null;

  try {
    return document.querySelector<HTMLElement>(selector);
  } catch {
    return null;
  }
}

/** Register the browser-side RPC methods exposed to the voice agent. */
export function setupAgentNavigation(room: Room, router: NavigationRouter) {
  room.registerRpcMethod("navigate_page", async (data) => {
    const requestedPath = payloadValue(data, "path");
    const path = requestedPath ? safeInternalRoute(requestedPath) : null;

    if (!path) {
      return response({ success: false, error: "Invalid or unsupported internal path" });
    }

    router.push(path);
    return response({ success: true, path });
  });

  room.registerRpcMethod("scroll_page", async (data) => {
    const selector = payloadValue(data, "selector");
    const target = selector ? findElement(selector) : null;

    if (!target) {
      return response({ success: false, error: "Element not found" });
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    return response({ success: true, selector });
  });

  room.registerRpcMethod("highlight_element", async (data) => {
    const selector = payloadValue(data, "selector");
    const target = selector ? findElement(selector) : null;

    if (!target) {
      return response({ success: false, error: "Element not found" });
    }

    target.classList.add("agni-agent-highlight");
    window.setTimeout(
      () => target.classList.remove("agni-agent-highlight"),
      HIGHLIGHT_MS,
    );

    return response({ success: true, selector });
  });

  return () => {
    for (const method of RPC_METHODS) room.unregisterRpcMethod(method);
  };
}
