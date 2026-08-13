import type { NextRequest } from "next/server";
import { buildPageContext } from "@/lib/agni/pageContext";
import { getContext, getResults, setContext, setPage } from "@/lib/agni/store";
import type { CartLine, PageReport } from "@/lib/agni/types";

function readCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];

    const line = entry as Partial<CartLine>;

    if (typeof line.productId !== "number" || typeof line.quantity !== "number") {
      return [];
    }

    return [
      {
        productId: line.productId,
        quantity: line.quantity,
        size: typeof line.size === "number" ? line.size : undefined,
      },
    ];
  });
}

/** The page pushes what the shopper is looking at; the agent pulls it back. */
export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const sessionId =
    typeof payload.session_id === "string" ? payload.session_id.trim() : "";

  if (!sessionId) {
    return Response.json({ error: "session_id is required." }, { status: 400 });
  }

  const report: PageReport = {
    sessionId,
    path: typeof payload.path === "string" ? payload.path : "/",
    search: typeof payload.search === "string" ? payload.search : "",
    cart: readCart(payload.cart),
    selectedSize:
      typeof payload.selectedSize === "number" ? payload.selectedSize : undefined,
  };

  setPage(sessionId, report);
  setContext(sessionId, buildPageContext(report, getResults(sessionId)));

  return Response.json({ ok: true });
}

/** The agent's `get_page_context` tool. Returns the raw context block. */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sid")?.trim();

  if (!sessionId) {
    return Response.json({ error: "sid is required." }, { status: 400 });
  }

  const stored = getContext(sessionId);

  if (!stored) {
    return new Response(
      "### AGNI SHOP CONTEXT ###\nNo page context yet for this session. The shopper's browser has not reported a page. Ask them to reload the store page.\n### END AGNI SHOP CONTEXT ###",
      { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  if (request.nextUrl.searchParams.get("format") === "json") {
    return Response.json(stored);
  }

  return new Response(stored.context, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
