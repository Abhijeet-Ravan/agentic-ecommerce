#!/usr/bin/env node
/**
 * Builds — and registers — the custom tools for the Stride shopping agent.
 *
 *   npm run agni:functions -- --print      # inspect the payload
 *   npm run agni:functions -- --register   # create the tools, attach them
 *   npm run agni:functions -- --verify     # read back what's attached
 *
 * Registration is two calls, not one:
 *
 *   POST  {base}/tools/            → { data: { id } }   trailing slash required
 *   PATCH {base}/agents/{agentId}  → { selectedTools: [id, …] }
 *
 * The `functions` array you see on a GET of an agent is derived on read and is
 * never accepted on write. `selectedTools` is an array of id *strings*, and it
 * is a full replace — anything left out is silently detached, which is why
 * --register reads the current list before sending a new one.
 *
 * The schema details that fail silently are handled here: `parametersSchemaText`
 * is stringified JSON Schema, `headers` is an array of {key,value}, and every
 * tool sets its own timeout instead of inheriting the two-minute default.
 */

const API_BASE = (process.env.AGNI_API_BASE ?? "https://api.ravan.ai/api/v1").replace(/\/$/, "");
const API_KEY = process.env.AGNI_API_KEY;
const AGENT_ID = process.env.AGNI_AGENT_ID;
const PUBLIC_URL = (process.env.AGNI_PUBLIC_URL ?? "").replace(/\/$/, "");
const ACTION_SECRET = process.env.AGNI_ACTION_SECRET ?? "";

/**
 * Every tool takes the session id as an argument. Dynamic variables are
 * substituted into the prompt only — never into a tool's url or query
 * parameters — so the model reading `{{session_id}}` out of its prompt and
 * passing it here is the mechanism, not a fallback.
 */
const SESSION_PROPERTY = {
  session_id: {
    type: "string",
    description:
      "The shopper's session id, given to you in your system prompt. Required on every call.",
  },
};

function customTool({
  name,
  path,
  description,
  properties = {},
  required = [],
  timeoutMs = 6000,
  executionMsg = "",
  speakAfterExecution = true,
}) {
  return {
    type: "custom",
    name,
    description,
    custom: {
      method: "POST",
      url: `${PUBLIC_URL}/api/agni/functions/${path}`,
      timeoutMs,
      headers: ACTION_SECRET ? [{ key: "X-Agni-Action-Secret", value: ACTION_SECRET }] : [],
      queryParameters: [],
      payloadArgsOnly: true,
      preCallWebhook: false,
      parametersSchemaText: JSON.stringify({
        type: "object",
        properties: { ...SESSION_PROPERTY, ...properties },
        required: ["session_id", ...required],
      }),
      storeFieldsAsVariables: [],
      speakDuringExecution: Boolean(executionMsg),
      speakAfterExecution,
      executionMsg,
    },
  };
}

const PRODUCT_FILTERS = {
  query: { type: "string", description: "Free text, in the shopper's own words" },
  brand: {
    type: "string",
    description:
      "Exact brand: Bata, North Star, Power, Hush Puppies, Weinbrenner, Comfit, Floatz, Bubblegummers, Light & Easy",
  },
  gender: { type: "string", enum: ["men", "women", "kids"] },
  category: { type: "string", description: "e.g. Sneaker, Sandal, Loafer, Formal shoe" },
  color: { type: "string", description: "e.g. Black, Blue, Brown, White, Pink" },
  material: { type: "string" },
  size: { type: "number", description: "UK size, e.g. 8" },
  min_price: { type: "number", description: "Taka" },
  max_price: { type: "number", description: "Taka" },
};

export const tools = [
  customTool({
    name: "get_page_context",
    path: "get-page-context",
    description:
      "Read what the shopper is looking at right now — the page, the products on screen, their cart, and how your last action turned out. Call before describing anything, and again after every action you take.",
    timeoutMs: 5000,
    speakAfterExecution: false,
  }),
  customTool({
    name: "search_catalog",
    path: "search-catalog",
    description:
      "Check what the store actually stocks, without moving the shopper. Use whenever they name a brand, style, colour or budget, before you promise anything exists.",
    properties: { ...PRODUCT_FILTERS, limit: { type: "number" } },
    timeoutMs: 5000,
  }),
  customTool({
    name: "show_products",
    path: "show-products",
    description:
      "Put products on the shopper's screen. Use whenever they ask to show, see, display or pull up products. For two known products, including 'show me both', pass slug_a and slug_b. Showing products is not a comparison.",
    properties: {
      ...PRODUCT_FILTERS,
      slug_a: { type: "string", description: "Exact slug for the first product to show" },
      slug_b: { type: "string", description: "Exact slug for the second product to show" },
    },
    executionMsg: "Let me pull those up.",
  }),
  customTool({
    name: "open_product",
    path: "open-product",
    description:
      "Open one product's page so the shopper can see it in detail. Use when they pick a specific item. Prefer the slug from search_catalog; a spoken name also works.",
    properties: {
      slug: { type: "string", description: "Exact slug from search_catalog" },
      name: { type: "string", description: "The product name as the shopper said it" },
    },
    executionMsg: "Opening that one now.",
  }),
  customTool({
    name: "compare_products",
    path: "compare-products",
    description:
      "Compare two catalogue products using descriptions, specs, sizes, prices and demo reviews, and open a visual side-by-side comparison. Use only when the shopper explicitly asks to compare, asks which is better, or asks for differences. Do not use for 'show me both' or other show/see requests.",
    properties: {
      slug_a: { type: "string", description: "Exact slug for the first product" },
      slug_b: { type: "string", description: "Exact slug for the second product" },
      product_a: {
        type: "string",
        description: "Fallback: first product name if you do not have the slug",
      },
      product_b: {
        type: "string",
        description: "Fallback: second product name if you do not have the slug",
      },
    },
    executionMsg: "Comparing those two.",
  }),
  customTool({
    name: "choose_compared_product",
    path: "choose-compared-product",
    description:
      "Use when a comparison is open and the shopper chooses the first/second/left/right product or says to take the better/recommended one. Automatically closes the comparison. It returns to the cart when comparison started there; otherwise it opens that product. Never ask the shopper to close the modal. It never changes the cart.",
    properties: {
      choice: {
        type: "string",
        enum: ["first", "second", "recommended"],
        description: "Which compared product the shopper chose",
      },
      slug: {
        type: "string",
        description: "Optional exact compared-product slug when known",
      },
    },
    executionMsg: "Opening your choice.",
  }),
  customTool({
    name: "close_comparison",
    path: "close-comparison",
    description:
      "Close the comparison modal without selecting a product or changing the cart. Use when the shopper asks to close, dismiss or hide the comparison, or says the modal is still open.",
    executionMsg: "Closing the comparison.",
  }),
  customTool({
    name: "scroll_view",
    path: "scroll-view",
    description:
      "Scroll what the shopper is viewing. Use when they ask to scroll, move down/up, continue, see more, go to the top, or go to the bottom. Scrolls the comparison modal when open; otherwise scrolls the page. After success, do not reload or call compare_products again unless they request a new comparison.",
    properties: {
      direction: {
        type: "string",
        enum: ["up", "down", "top", "bottom"],
        description: "Defaults to down",
      },
      amount: {
        type: "string",
        enum: ["little", "page"],
        description: "Use little for 'a bit'; page for a full screen",
      },
    },
    executionMsg: "Scrolling now.",
  }),
  customTool({
    name: "choose_color",
    path: "choose-color",
    description:
      "Use when the shopper asks for a different colour — 'do you have it in blue?'. Switches to that colourway if we stock it, otherwise shows the alternatives in that colour.",
    properties: { color: { type: "string", description: "e.g. Blue" } },
    required: ["color"],
  }),
  customTool({
    name: "choose_size",
    path: "choose-size",
    description:
      "Select a size on the product the shopper has open. Use as soon as they tell you their size. Tells you the stocked sizes if that one isn't available.",
    properties: { size: { type: "number", description: "UK size, e.g. 8" } },
    required: ["size"],
  }),
  customTool({
    name: "add_to_cart",
    path: "add-to-cart",
    description:
      "Add the product to the shopper's cart and open the cart page in one step — do NOT call open_cart afterwards. Only call once you know their size; it will refuse otherwise. The reply tells you the new total and what else is already in the cart, so you can ask whether they want all of it.",
    properties: {
      slug: { type: "string", description: "Defaults to the product currently open" },
      size: { type: "number", description: "UK size, e.g. 8" },
    },
    executionMsg: "Adding that to your cart.",
  }),
  customTool({
    name: "open_cart",
    path: "open-cart",
    description:
      "Show the shopper their cart and read back what is in it with the total. Use when they ask about their cart — not after add_to_cart, which already opens it.",
  }),
  customTool({
    name: "update_cart",
    path: "update-cart",
    description:
      "Change cart contents only when the shopper explicitly says cart, remove, delete, quantity, empty, or clearly answers a cart-specific question. Never use for 'I like/prefer/want the first one' during comparison; use choose_compared_product instead. Use keep_only when they explicitly want one cart item and the rest removed.",
    properties: {
      operation: { type: "string", enum: ["remove", "keep_only", "set_quantity", "clear"] },
      slug: { type: "string", description: "The item's slug, from the page context" },
      size: { type: "number" },
      quantity: { type: "number" },
      explicit_cart_request: {
        type: "boolean",
        description: "Set true only when the shopper explicitly requested a cart change",
      },
    },
    required: ["operation"],
  }),
  customTool({
    name: "checkout",
    path: "checkout",
    description:
      "Click Proceed to Checkout only when the shopper says they want to buy. Then call get_page_context and only claim checkout opened when it reports PAGE: checkout. Never say the order is placed.",
    executionMsg: "Taking you to checkout.",
  }),
];

const OUR_NAMES = new Set(tools.map((tool) => tool.name));

function requireEnv() {
  const missing = ["AGNI_API_KEY", "AGNI_AGENT_ID", "AGNI_PUBLIC_URL"].filter(
    (name) => !process.env[name],
  );

  if (missing.length) {
    console.error(
      `Missing ${missing.join(", ")}.\nRun with: node --env-file=.env.local scripts/agni-functions.mjs --register`,
    );
    process.exit(1);
  }

  if (PUBLIC_URL.includes("localhost")) {
    console.error(
      "AGNI_PUBLIC_URL points at localhost. Agni calls these endpoints from its own servers — use a tunnel (ngrok/cloudflared).",
    );
    process.exit(1);
  }
}

async function send(method, path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "X-Api-Key": API_KEY,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status} ${text.slice(0, 400)}`);
  }

  return payload;
}

function idOf(payload) {
  const data = payload?.data ?? payload;

  return data?.id ?? data?.tool_id ?? data?.toolId ?? null;
}

/** The agent's currently attached tools, as [{id, name}]. */
async function readAttached() {
  const agent = (await send("GET", `/agents/${AGENT_ID}`))?.data ?? {};
  const derived = agent.functions ?? agent.tools ?? [];
  const selected = agent.selectedTools ?? agent.selected_tools ?? [];

  const known = derived.map((entry) => ({
    id: entry.id ?? entry.tool_id ?? entry.toolId ?? null,
    name: entry.name ?? null,
  }));

  return {
    selected: selected.map((entry) => (typeof entry === "string" ? entry : idOf(entry))).filter(Boolean),
    known,
  };
}

async function register() {
  requireEnv();

  const { selected, known } = await readAttached();
  const namedById = new Map(known.filter((entry) => entry.id).map((entry) => [entry.id, entry.name]));

  // selectedTools is a full replace: keep every id that isn't a previous
  // version of one of ours, or we silently detach the agent's other tools.
  const unidentified = selected.filter((id) => !namedById.has(id));
  const keep = selected.filter((id) => {
    const name = namedById.get(id);
    return name ? !OUR_NAMES.has(name) : true;
  });

  if (unidentified.length) {
    console.warn(
      `! ${unidentified.length} attached tool(s) could not be matched to a name; keeping them attached.`,
    );
  }

  const created = [];

  for (const tool of tools) {
    const id = idOf(await send("POST", "/tools/", tool)); // trailing slash: Caddy 404s without it

    if (!id) throw new Error(`No id came back for ${tool.name}.`);

    created.push(id);
    console.log(`+ ${tool.name} → ${id}`);
  }

  const selectedTools = [...keep, ...created];

  await send("PATCH", `/agents/${AGENT_ID}`, { selectedTools });

  console.log(
    `\nAttached ${created.length} tool(s); kept ${keep.length} existing. Detached ${selected.length - keep.length} superseded.`,
  );
  console.log("Superseded tools still exist as resources — delete them if they clutter the list.");
}

async function verify() {
  requireEnv();

  const { selected, known } = await readAttached();

  console.log(`selectedTools: ${selected.length} attached`);
  console.log(
    known.length
      ? known.map((entry) => `- ${entry.name ?? "(unnamed)"} ${entry.id ?? ""}`).join("\n")
      : "No tools reported on this agent.",
  );

  const missing = [...OUR_NAMES].filter(
    (name) => !known.some((entry) => entry.name === name),
  );

  if (missing.length) console.log(`\nNot attached: ${missing.join(", ")}`);
}

const mode = process.argv[2] ?? "--print";

try {
  if (mode === "--register") await register();
  else if (mode === "--verify") await verify();
  else console.log(JSON.stringify(tools, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
