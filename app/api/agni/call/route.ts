import type { NextRequest } from "next/server";

const AGNI_API_URL = process.env.AGNI_API_URL ?? "https://api.ravan.ai/api/v1";

/**
 * Server-side proxy for `POST /calling/create-call`, so the API key never
 * reaches the browser. The response carries LiveKit credentials — the actual
 * conversation happens over WebRTC, outside this API.
 */
function configured() {
  return Boolean(process.env.AGNI_API_KEY && process.env.AGNI_AGENT_ID);
}

/** Field spellings vary by gateway version; cover all of them. */
function extractCredentials(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const body = payload as Record<string, unknown>;
  const data =
    body.data && typeof body.data === "object"
      ? (body.data as Record<string, unknown>)
      : body;

  const pick = (...names: string[]) => {
    for (const name of names) {
      const value = data[name] ?? body[name];
      if (typeof value === "string" && value) return value;
    }
    return "";
  };

  const livekitUrl = pick("url", "livekit_url", "livekitUrl");
  const accessToken = pick("access_token", "accessToken", "token");

  if (!livekitUrl || !accessToken) return null;

  return {
    livekitUrl,
    accessToken,
    callSessionId: pick("call_session_id", "callSessionId", "session_id"),
  };
}

/** Lets the widget decide whether to render without exposing any secret. */
export async function GET() {
  return Response.json({ enabled: configured() });
}

export async function POST(request: NextRequest) {
  if (!configured()) {
    return Response.json(
      { error: "Set AGNI_API_KEY and AGNI_AGENT_ID to enable the voice assistant." },
      { status: 503 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const raw =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).session_id === "string"
      ? ((body as Record<string, unknown>).session_id as string)
      : "";
  // The only value the browser gets to influence here, and it lands in the
  // agent's prompt — trim it and cap the length before forwarding.
  const sessionId = raw.trim().slice(0, 128);
  const rawCallSessionId =
    body &&
    typeof body === "object" &&
    typeof (body as Record<string, unknown>).call_session_id === "string"
      ? ((body as Record<string, unknown>).call_session_id as string)
      : "";
  const callSessionId = rawCallSessionId.trim().slice(0, 128);
  const metadata =
    body &&
    typeof body === "object" &&
    (body as Record<string, unknown>).metadata &&
    typeof (body as Record<string, unknown>).metadata === "object"
      ? ((body as Record<string, unknown>).metadata as Record<string, unknown>)
      : null;
  const enableBrowserNavigation = metadata?.enable_browser_navigation === true;

  if (!sessionId) {
    return Response.json({ error: "session_id is required." }, { status: 400 });
  }

  let upstream: Response;

  try {
    upstream = await fetch(`${AGNI_API_URL}/calling/create-call`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.AGNI_API_KEY as string,
      },
      body: JSON.stringify({
        type: "web_call",
        agent_id: process.env.AGNI_AGENT_ID,
        ...(callSessionId ? { call_session_id: callSessionId } : {}),
        metadata: {
          source: "stride-storefront",
          session_id: sessionId,
          enable_browser_navigation: enableBrowserNavigation,
        },
        // The whole link between the voice session and this browser tab. The key
        // here IS the prompt placeholder: `{{session_id}}`. If the two ever drift
        // apart the substitution silently yields an empty string, and every
        // function reports "lost track of which tab" for the wrong reason.
        // (`snowie_session_id` is the localStorage key, not this variable name.)
        prompt_dynamic_variables: {
          session_id: sessionId,
          store_name: "Stride",
        },
      }),
      cache: "no-store",
    });
  } catch {
    return Response.json({ error: "Could not reach the Agni backend." }, { status: 502 });
  }

  const payload: unknown = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as Record<string, unknown>).message)
        : `Agni backend returned ${upstream.status}.`;

    return Response.json({ error: message }, { status: 502 });
  }

  const credentials = extractCredentials(payload);

  if (!credentials) {
    return Response.json(
      { error: "Failed to get LiveKit credentials from the create-call response." },
      { status: 502 },
    );
  }

  return Response.json(credentials);
}
