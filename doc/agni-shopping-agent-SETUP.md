# Agni shopping agent — what was implemented & how to finish wiring it

The same loop as the in-app voice guide (`in-app-voice-guide-SETUP.md`): page
context **pushed** to our backend keyed by session id, actions **queued** back to
an in-page bridge. The difference is what the agent is allowed to do — here it
shops: it searches, opens a product, picks a colour and size, adds to the cart,
and clicks checkout. Payment is the shopper's.

## The conversation this supports

| Shopper says | Agent does |
| --- | --- |
| "I want North Star shoes" | `search_catalog` → `show_products {brand}` → the listing page loads |
| "show me both" | `show_products {slug_a, slug_b}` → exactly those two product cards load |
| "the canvas one" | `search_catalog` → `open_product {slug}` → product page |
| "compare these two" | `compare_products {slug_a, slug_b}` → visual modal plus grounded perspective |
| "I like the first one" | `choose_compared_product {choice: "first"}` → closes modal and opens it; cart unchanged |
| "scroll down a bit" | `scroll_view {direction: "down", amount: "little"}` → scrolls modal or page |
| — | asks colour (context lists the other colourways of that style) |
| "in blue" | `choose_color {color}` → exact colourway if it exists, otherwise a filtered listing |
| — | asks size (context lists the sizes this product actually has) |
| "size 8" | `choose_size` then `add_to_cart` → picks the chip, clicks ADD TO CART |
| — | `open_cart` → cart page, then asks "buy this, or add another pair?" |
| "another one, in blue" | back to `search_catalog` / `show_products {color}` and repeat |
| "buy it" | `checkout` → clicks *Proceed to Checkout* and stops. The shopper pays. |

**The catalogue is Bata Bangladesh, not Nike.** Brands are Bata, North Star,
Power, Hush Puppies, Weinbrenner, Comfit, Floatz, Bubblegummers, Light & Easy.
That is exactly why the agent must call `search_catalog` before promising
anything: asked for Nike it will find nothing and should offer the closest real
brand rather than navigating to an empty page.

## How the call is wired

We do not embed a hosted widget. Per the Agni web-call flow, a call needs only an
**agent id** and an **API key**, so the UI is ours:

```
Browser ──POST /api/agni/call──► our proxy ──POST {AGNI_API_URL}/calling/create-call──► Agni
        ◄── livekitUrl, accessToken ──────────────────────────────────────────────────┘
        └──── WebRTC ────► LiveKit room ◄──── agent worker
```

Two consequences worth stating plainly:

- **No backend change is needed.** We own the `create-call` request, so we pass
  `prompt_dynamic_variables.session_id` ourselves. That id is the only link
  between the voice session and this browser tab — the agent's tools use it to read
  the page context and to queue actions back.
- **The API key never reaches the browser.** `AGNI_API_KEY` and `AGNI_AGENT_ID` are
  server-only; the widget asks `GET /api/agni/call` whether an agent is configured
  and stays hidden if not.

## What changed in code

### New — the call
- `app/api/agni/call/route.ts` — POST proxies `create-call` (adds `X-Api-Key`,
  normalises the `url`/`livekit_url`, `access_token`/`accessToken` spellings the
  gateway alternates between); GET reports whether an agent is configured.
- `components/agni/AgniVoiceWidget.tsx` — our own widget: start/end call, mute,
  live transcript, speaking indicator. Every `RoomEvent` handler is registered
  **before** `connect()`, otherwise the agent's greeting fires with nothing
  listening. Remote audio tracks are attached into a hidden container; the room is
  disconnected on unmount.
- Depends on `livekit-client` (added to `package.json`).

### New — the agent's custom tools
- `app/api/agni/functions/*/route.ts` — fourteen endpoints, one per function. Each
  validates against the catalogue and the shopper's current page before queuing
  anything, and answers 200 with a speakable `summary`.
- `app/api/agni/functions/compare-products/route.ts` — compares two catalogue
  products using description, synthetic demo reviews, size overlap, price, and
  generated specs. It does not move the page; it gives the agent a grounded
  perspective to say out loud.
- `lib/agni/auth.ts` — `requireAgniSecret`, failing closed in production.
- `lib/agni/functionKit.ts` — session-id resolution and sanitising,
  `ok`/`fail`/`queue` helpers, and string→number coercion for spoken arguments.
- `lib/agni/currentPage.ts` — the product the shopper has open and what's in
  their cart, from the last page report.
- `scripts/agni-functions.mjs` — generates the tool definitions, creates them via
  `POST /tools/` and attaches them with `selectedTools` (`npm run agni:functions`).

### New — the shopping loop
- `lib/agni/types.ts` — the action union and `parseAction`, which validates every
  untrusted payload (and coerces `"8"` → `8`, since voice models send strings).
- `lib/agni/routes.ts` — route building plus `safeInternalRoute`: the agent's
  routes are untrusted input and `router.push` will execute a `javascript:` URL.
- `lib/agni/store.ts` — process-local context + queue + results, 30-minute TTL.
  Swap for Redis in a multi-instance deploy; the exported functions are the whole
  contract.
- `lib/agni/catalog.ts` — catalogue facets, product summaries, and the colour
  resolver (exact colourway of the same style → else the tightest non-empty listing).
- `lib/agni/pageContext.ts` — renders the `### AGNI SHOP CONTEXT ###` block: the
  page, the products actually on screen, the cart, and recent action results.
- `lib/agni/session.ts` — the `snowie_session_id` localStorage key (the value it holds is sent as the `session_id` prompt variable).
- `app/api/agni/context/route.ts` — POST (page pushes) / GET `?sid=` (agent pulls).
- `app/api/agni/actions/route.ts` — POST (agent queues) / GET `?sid=` (bridge
  drains) / PUT (bridge reports outcomes).
- `app/api/agni/catalog/route.ts` — read-only catalogue lookup used by the bridge (colour resolution, slug → id) and handy for debugging.
- `components/agni/` — `AgniContextReporter` (pushes context on route/filter/cart
  change), `AgniBridge` (drains the queue and performs actions), `AgniRoot` (single
  mount), `AgniDebugPanel` (dev-only console), `config.ts`.
- Mounted once in `app/layout.tsx`, inside `CartProvider` — never per page, never
  re-keyed, so a call survives client-side navigation.

### Changed — anchors the bridge needs
- `app/page.tsx`, `app/products/page.tsx`, `app/products/[slug]/page.tsx`,
  `app/cart/page.tsx`, `app/checkout/page.tsx`: `data-agni-page` markers (and
  `data-agni-slug` on the product page). The bridge waits for these rather than
  guessing when a navigation has finished.
- `components/AddToCartButton.tsx`: `data-agni-size` on each chip,
  `data-agni-id="product.addToCart"`, `data-agni-id="product.message"`, and a
  `data-agni-attempts` counter so the bridge can tell a fresh result from a stale
  message.
- `app/cart/page.tsx`: the checkout button is now live
  (`data-agni-id="cart.checkout"`) and goes to a new `/checkout` page that stops at
  the payment step.
- `components/home/Header.tsx`: `data-agni-id="header.cart"`.
- Brand became a real filter (`lib/commerce/types.ts`, `searchProducts.ts`,
  `app/products/page.tsx`, `components/ProductFilters.tsx`) — "I want <brand>
  shoes" is the opening move of the flow and needed a URL to land on.

## Configure

### 1. This app

```bash
AGNI_API_KEY=<your_api_key>          # server-side only, never NEXT_PUBLIC_
AGNI_AGENT_ID=<agent id from POST /agents>
AGNI_API_URL=https://api.ravan.ai/api/v1
AGNI_PUBLIC_URL=<public origin of this app — a tunnel in dev>
AGNI_ACTION_SECRET=<random string>   # required in production
```

### 2. The agent

Create it once against the same API key — `single_prompt`, since this flow is
conversational rather than a fixed graph:

```bash
curl -sS -X POST "$AGNI_BASE/agents" \
  -H "X-Api-Key: $AGNI_KEY" -H "Content-Type: application/json" \
  -d '{
    "agentName": "Stride Shopping Assistant",
    "agentType": "single_prompt",
    "welcomeMessageMode": "ai_speaks_first",
    "welcomeMessage": "Hi! Tell me what you are shopping for.",
    "prompt": "<the prompt below>"
  }'
```

**Prompt:**

> You are the shopping assistant for Stride, an online shoe store. Your session id
> is `{{session_id}}`; pass it as the `session_id` argument on every tool call.
>
> Before you claim anything exists, call `search_catalog`. The catalogue is fixed —
> if the shopper asks for a brand or colour we do not carry, say so and offer the
> closest real option. Never invent a product, price or size.
>
> Call `get_page_context` to see what the shopper is looking at. It returns a block
> delimited by `### AGNI SHOP CONTEXT ###` — treat it as the only truth about the
> current screen, the cart, and how your last action turned out. Re-read it after
> every action you queue.
>
> Move the shopper one function at a time, and say what you are doing:
> `show_products` to put a listing on screen, `open_product` to open one,
> `compare_products` when they explicitly request a comparison,
> `choose_compared_product` when they pick the first or second item,
> `close_comparison` when they ask to dismiss the modal, `scroll_view` when they
> ask to scroll, then `choose_color`, `choose_size`, `add_to_cart`, `open_cart`,
> `update_cart`, `checkout`.
>
> A request to show, see, display or pull up products is visual navigation, not a
> comparison. For "show me both", call `show_products` with `slug_a` and `slug_b`.
> Do not call `compare_products` unless they ask to compare, ask which is better,
> or ask about the differences.
>
> When the shopper asks to compare two choices, use `compare_products` with the
> exact slugs from `search_catalog` or page context. Base your answer on the
> returned descriptions, specs, price, size overlap and demo reviews. Give a clean
> perspective: who should pick the first one, who should pick the second one, and
> which one you would choose for their stated need. Mention that reviews are demo
> feedback when you use them. The function opens the visual comparison modal, so
> do not call `show_products` as a second step.
>
> While comparison is open, "I like the first one", "I prefer the second", "I'll
> go with the left one", "take the better one" and similar preference statements
> mean call `choose_compared_product`. This automatically closes the modal and
> opens that product. Never ask the shopper to close it separately. It does not
> change the cart. Never call `update_cart` for a product preference.
>
> If they ask to close, dismiss or hide the comparison, or say it is still open,
> call `close_comparison`. Never claim it closed without that tool call.
>
> When the shopper says "scroll a bit", "show me more", "go down/up", "top" or
> "bottom", call `scroll_view`. It scrolls the comparison modal when one is open,
> otherwise it scrolls the page. After a successful scroll, do not apologise,
> reload, or call `compare_products` again. Let the shopper react.
>
> Never add to the cart until you know the size — ask for it, and offer only the
> sizes the function tells you are stocked. Ask about colour the same way.
> Only call `update_cart` for an explicit cart change and set
> `explicit_cart_request` to true. A product preference is never a cart change.
>
> After adding something, call `open_cart` and ask whether they want to buy now or
> keep shopping. If they want another pair, start again from `search_catalog`. When
> they say buy, call `checkout` once and tell them payment is theirs to complete.
> Never claim an order was placed.
>
> If a function tells you something is unavailable, say so and offer the closest
> alternative it gives you. If you cannot help after two attempts, say so plainly
> and end the call.

### 3. Register the custom functions

The agent acts through **custom tools** — HTTP calls Agni makes to this app. One
endpoint per tool under `app/api/agni/functions/`, and the definitions are
generated rather than hand-written, because several details fail silently when
you get them wrong: `parametersSchemaText` is *stringified* JSON Schema,
`headers` is an array of `{key, value}`, and the default `timeoutMs` is 120000 —
two minutes of dead air.

```bash
npm run agni:functions -- --print      # inspect the payload
npm run agni:functions -- --register   # create the tools, then attach them
npm run agni:functions -- --verify     # read back what's attached
```

**Registration is two calls, not one.** A tool is a first-class resource:

```
POST  {base}/tools/            → { data: { id } }    trailing slash required (Caddy 404s without it)
PATCH {base}/agents/{agentId}  → { "selectedTools": ["tool-uuid-…", …] }
```

Two traps the script handles for you: `selectedTools` is an array of id
*strings*, and it is a **full replace** — anything left out is silently
detached, so `--register` reads the agent's current list first and keeps every
tool that isn't a previous version of ours. The `functions` array you see on a
`GET` of an agent looks like an input but is derived on read; it is never
accepted on write.

Needs `AGNI_PUBLIC_URL` — Agni calls these endpoints from its own servers, so
during development that must be a tunnel (ngrok/cloudflared). The script refuses
a `localhost` value rather than registering tools that can never fire.

`end_call` is an Agni built-in; attach it on the agent alongside these if you
want the agent to be able to hang up. There is nothing to implement for it.

| Function | Endpoint | Triggers |
| --- | --- | --- |
| `get_page_context` | `get-page-context` | Before describing anything; after every action |
| `search_catalog` | `search-catalog` | Any brand/style/colour/budget mentioned — grounding, doesn't move the page |
| `show_products` | `show-products` | "Show me…" — displays filtered products or two exact slugs |
| `open_product` | `open-product` | They pick one (slug, or the name as spoken) |
| `compare_products` | `compare-products` | They explicitly ask which is better, for differences, or to compare |
| `choose_compared_product` | `choose-compared-product` | They prefer or choose the first/second compared product |
| `close_comparison` | `close-comparison` | They ask to close/dismiss it or say the modal is still open |
| `scroll_view` | `scroll-view` | They ask to scroll, continue, see more, or move up/down |
| `choose_color` | `choose-color` | "Have you got it in blue?" |
| `choose_size` | `choose-size` | They give a size |
| `add_to_cart` | `add-to-cart` | Product and size both settled |
| `open_cart` | `open-cart` | After adding — then ask buy-now or keep-shopping |
| `update_cart` | `update-cart` | Explicit cart request to remove a line, change quantity, or empty it |
| `checkout` | `checkout` | "Buy it" — clicks the button, then stops |
| `end_call` | *(built-in)* | Conversation over — no endpoint |

Two conventions run through every endpoint, and both matter more than they look:

- **They always return HTTP 200**, with `{ ok, summary, … }`. A 4xx reads to the
  agent as a tool fault and it apologises vaguely instead of relaying what we
  said. `summary` is written to be spoken, since `speakAfterExecution` is on.
- **They refuse rather than queue a doomed action.** Ask for size 13 on a shoe
  stocked 5–10 and the answer is `"We don't have size 13 in the North Star Canvas
  Shoe. It comes in 5, 6, 7, 8, 9 and 10."` — the agent can say something true
  immediately instead of narrating a click that was never going to work.

`get_page_context` is registered with `speakAfterExecution: false`; the context
block is for reading, not reciting.

#### The session id

Every tool needs to know which browser tab it is acting on, and there is exactly
one mechanism for that:

1. `POST /calling/create-call` sends `prompt_dynamic_variables: { session_id }`
   ([app/api/agni/call/route.ts](../app/api/agni/call/route.ts)).
2. That is substituted into the **prompt**, where the agent reads it as
   `{{session_id}}`.
3. The agent passes it as the required `session_id` argument on every tool call.

Dynamic variables are *not* substituted inside tool config — not in `url`, not in
`queryParameters` — so templating a `?sid={{session_id}}` there would arrive
literally. The tools are registered with no query parameters at all, and
[cleanSessionId](../lib/agni/functionKit.ts) discards any value still containing
`{{`, so a mistake surfaces as the honest "lost track of which tab" message
rather than a session keyed on a placeholder. The `?sid=` and
`x-agni-session-id` forms still work — the bridge uses the former — they just
aren't how the agent gets it.

**The key in `prompt_dynamic_variables` and the placeholder in the prompt must be
the same string.** They are both `session_id` here. If they drift, substitution
silently yields an empty value and every tool fails for a reason that has nothing
to do with transport. Note `snowie_session_id` is the localStorage key, not the
variable name.

It is trimmed and capped at 128 characters in the proxy before being forwarded:
it is the only value the browser influences on that request, and it lands in an
LLM prompt.

#### Auth

`AGNI_ACTION_SECRET` is sent back by Agni as `X-Agni-Action-Secret` on every
function call. [requireAgniSecret](../lib/agni/auth.ts) checks it and **fails
closed in production** — if the secret is unset there, the endpoints 404 rather
than serving anyone who finds them. It answers 404 rather than 401 so a prober
learns nothing. Unset in development, the gate is open for convenience.

That gate is the whole boundary, and it stays even though `session_id` now
arrives on every call. A session id is an identifier, not a credential: it lives
in `localStorage`, it travels as a query parameter (so it lands in access logs),
and anyone holding one who can reach `/api/agni/actions` can navigate that
shopper's tab and click checkout. Nothing about it authenticates anybody.

The browser-facing halves — the bridge's `GET` drain and `PUT` result report —
stay open, because they come from the shopper's own page.

Long-form prose (returns policy, sizing advice) belongs in the agent's knowledge
base, not in the page context.

## Verify without the voice agent

Run with `NEXT_PUBLIC_AGNI_DEBUG=1` and use the **Agni console** at the bottom
left. Its buttons POST to `/api/agni/actions` exactly as the agent's tool does,
so the whole loop is exercised: queue → bridge → navigation → click → result.

Walk the flow: *Brand: North Star* → *Open canvas shoe* → *Colour: blue* →
*Size 8* → *Add to cart* → *Open cart* → *Checkout*. Then press **Print context**
and check the console block matches what is on screen.

By hand:

```bash
S=dev-session
curl "localhost:3000/api/agni/catalog?facets=1"
curl -X POST localhost:3000/api/agni/actions -H 'content-type: application/json' \
  -d "{\"session_id\":\"$S\",\"type\":\"search_products\",\"brand\":\"North Star\"}"
curl "localhost:3000/api/agni/context?sid=$S"
```

The browser tab holding that session id navigates within ~1.5s (one poll).

Exactly what Agni sends to a function:

```bash
curl -sS -X POST "$APP/api/agni/functions/choose-size?sid=$S" \
  -H 'Content-Type: application/json' \
  -H "X-Agni-Action-Secret: $AGNI_ACTION_SECRET" \
  -d '{ "size": 13 }'
# {"ok":true,"summary":"We don't have size 13 in the North Star Canvas Shoe.
#   It comes in 5, 6, 7, 8, 9 and 10. Offer the nearest.","available_sizes":[…]}
```

Then prove the gate — this must be 404, not 401, and not data:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
  "$APP/api/agni/functions/search-catalog?sid=$S" \
  -H 'Content-Type: application/json' -d '{"brand":"Bata"}'
# expect: 404   (with AGNI_ACTION_SECRET set, or in production either way)
```

## Verify the call itself

With `AGNI_API_KEY` and `AGNI_AGENT_ID` set, the **Shop by voice** button appears
bottom right. Pressing it should: request mic permission, show "Listening", and —
with `welcomeMessageMode: "ai_speaks_first"` — greet you within a second or two.

If it connects but stays silent, the greeting almost certainly fired before a
handler was listening; that ordering is the one thing not to refactor in
`AgniVoiceWidget`. If the mic never opens, you are on a non-secure origin —
`localhost` is fine, a LAN IP is not.

Remember the agent's tools run from the Agni backend: on `localhost` the voice
side works but every tool call fails, so run a tunnel and point the tool URLs at
it before judging the flow.

## Known limits

- The store is in-process: one server instance, sessions expire after 30 minutes
  of silence.
- Noise cancellation is not wired up. Krisp is LiveKit-Cloud-only and needs
  `@livekit/krisp-noise-filter`; add it in `LocalTrackPublished` if the room URL
  is a `*.livekit.cloud` host.
- Each catalogue entry is a single colourway, so "the same shoe in blue" resolves
  to a sibling product (same brand, category and gender) when one exists and to a
  filtered listing when it does not.
- The bridge gives each action ~10 seconds before reporting a timeout; failures
  are reported back through `PUT /api/agni/actions` and surface in the context
  block under `RECENT ACTIONS`, so the agent can apologise accurately.
- `/checkout` stops at a placeholder. No payment provider is wired up.
