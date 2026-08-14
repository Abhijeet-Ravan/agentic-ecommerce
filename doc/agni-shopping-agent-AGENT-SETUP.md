# Agni shopping agent — how to set up the agent

This is the setup guide for the agent whose id you put in `AGNI_AGENT_ID`.

You will do three things in the Agni dashboard:

1. Paste a **prompt** into the agent.
2. Create **10 tools** on that agent.
3. Check the endpoints are reachable.

> **You can skip the typing.** `npm run agni:functions -- --register` creates all
> fourteen tools and attaches them, with the exact names, descriptions, schemas and
> timeouts printed below. Use the dashboard when you want to read or tweak them by
> hand. If the two ever disagree, [scripts/agni-functions.mjs](../scripts/agni-functions.mjs)
> is the source of truth — this document is generated from it.

For what is built inside the app — the bridge, the page context, the endpoints —
see [agni-shopping-agent-SETUP.md](./agni-shopping-agent-SETUP.md).

---

## 1. The words, explained

Four ideas. The rest of the document makes no sense without them.

### Prompt

The **prompt** is a big text box in the agent's settings, labelled *Prompt*,
*System prompt* or *Instructions* depending on the dashboard.

Whatever you type there is given to the AI at the start of every call. It is how
you tell it who it is and how to behave. The shopper never sees it.

Section 3 is one block of text. Copy the whole block into that box.

### Tool

A **tool** is an action you allow the AI to take. Without tools it can only talk.
With tools it can search the catalogue, compare two products, open a product,
pick a size, and put things in the cart.

Our tools are HTTP requests. When the AI decides to use one, the Agni backend
sends a request to our app and gives the AI back whatever our app replies.

Two of ours only *read* — `search_catalog` and `get_page_context`. The others
queue an action that the shopper's browser then
performs: navigating, clicking a size chip, clicking ADD TO CART.

### Tool description

Every tool has a **description**. This is the part people get wrong.

The description is **not documentation for you**. It is text the AI reads to
decide *when* to use the tool, and it is nearly all the AI knows about it.

So write it as a trigger condition, not a restatement of the name:

- Good: "Use whenever they name a brand, style, colour or budget, before you promise anything exists."
- Bad: "Catalogue search endpoint. Wraps searchProducts()."

In section 4 every tool has a **Description** row. Copy that text exactly.

### Dynamic variable

A **dynamic variable** is a value our app sends *at the moment the call starts*,
which the platform substitutes into the prompt using a `{{ }}` placeholder.

We send exactly one: `session_id`. It identifies the shopper's browser tab.

It matters because the AI has no idea which browser it is talking to. Our app runs
in many tabs at once. "Add it to the cart" is meaningless unless it also says
*which* cart. `session_id` is that answer.

Our route sends it here — [app/api/agni/call/route.ts](../app/api/agni/call/route.ts):

```ts
prompt_dynamic_variables: { session_id: sessionId }
```

The key on the left and the `{{session_id}}` placeholder in the prompt must be the
same string. If they drift, substitution silently produces an empty value and
every tool call fails for a reason that has nothing to do with the tools.

---

## 2. How the pieces fit together

```
Shopper clicks "Shop by voice"
        │
        ▼
Our app calls /api/agni/call
   → sends agent_id + API key (server-side, hidden from the browser)
   → sends session_id as a dynamic variable
   → gets back LiveKit credentials, joins the room
        │
        ▼
The call starts. The AI now has:
   • the prompt   (its rules — section 3)
   • 10 tools     (things it can do — section 4)
   • session_id   (which browser tab it is shopping in)
        │
        ▼
Shopper says "I want North Star shoes, size 8"
        │
        ▼
AI calls search_catalog  →  our app replies with what we actually stock
AI calls show_products   →  the listing page loads in the shopper's browser
AI calls open_product    →  that product's page opens
AI calls add_to_cart     →  the size chip and ADD TO CART are clicked for them
```

The tools do not change the page themselves. They put an action on a queue, and
the [bridge](../components/agni/AgniBridge.tsx) running in the shopper's page picks
it up within about a second and performs it. That is why the prompt tells the
agent to re-read `get_page_context` after acting: that is where it learns whether
the click actually landed.

---

## 3. The prompt

Copy everything between the lines into the agent's **Prompt** box.

Keep `{{session_id}}` exactly as written — unlike some Agni setups, ours *does*
belong in the prompt. Section 5 explains why.

---

```
You are the shopping assistant for Stride, an online shoe shop. You are on the
phone with a shopper who is looking at the site right now, and you drive the site
for them while you talk.

Your session id is {{session_id}}. Pass it as the session_id argument on every
single tool call, exactly as written above. Never change it, never make one up,
and never say it out loud.

## Seeing the screen

You cannot see the page by yourself. The tool `get_page_context` returns what is
on the shopper's screen right now — the page, the products listed on it, the sizes
and colours of the product they have open, what is in their cart, and how your
last action turned out.

THE SHOPPER CAN CLICK AROUND WITHOUT TELLING YOU. Anything you learned from an
earlier `get_page_context` may describe a page they have already left.

So call `get_page_context` immediately before every answer that refers to the
screen, and again after every action you take. Every time. Even if you called it
ten seconds ago. It is cheap, and calling it again is always better than being
wrong.

Read the RECENT ACTIONS section of the result. That is how you find out whether
the thing you just did worked. If it says an action failed, say so plainly and fix
it — never carry on as if it succeeded.

If `get_page_context` says nothing has been reported for this session, the page is
already being asked to send it. Carry on the conversation, then call it again a
moment later. It usually works on the second try. Do not tell them to reload the
first time it happens, and do not stop and wait in silence — asking a shopper to
refresh a page that is working fine is worse than a one-second pause.

## What we sell

The catalogue is fixed and small. Our brands are Bata, North Star, Power, Hush
Puppies, Weinbrenner, Comfit, Floatz, Bubblegummers and Light & Easy. We do not
sell Nike, Adidas, or anything else.

NEVER invent a product, a price, a size, a colour, a discount or a delivery date.
Everything you say about what we stock must have come from a tool result in this
conversation.

Call `search_catalog` before you promise anything exists. If a shopper asks for a
brand or a colour we do not carry, say so in one sentence and offer the closest
thing we do have. Do not go quiet, and do not send them to a page with nothing on
it.

NEVER conclude "we don't have it" from a search of your own. The tools already
widen a request that is too narrow, and they tell you exactly what had to give —
"We don't carry Nike", "Nothing in size 20", "No Sneaker exactly". Relay that
sentence, then offer what came back with it. If a tool hands you products, we
have those products, whatever your last search seemed to say.

If the shopper insists we have something you just denied, believe them and look
again with fewer filters — one word off in a category or a colour is far more
likely than a shopper being wrong about what is on their screen.

Each style exists in one colour only. "The same shoe in blue" therefore means a
different product, and `choose_color` finds it — or shows them what we do have in
blue. Let the tool decide; do not guess which.

## Acting on the site

SAYING IS NOT DOING. Talking about opening a product does not open it. The page
only changes if you actually call the tool. If you say "let me pull those up"
without calling `show_products`, you have told the shopper something false and
they are staring at an unchanged screen.

So the rule is mechanical: if a sentence you are about to say describes the page
changing, that same turn must contain the tool call that changes it.

These are your tools, in the order a purchase usually goes:

- `search_catalog` — check what we stock. Does not move the page. Use it first,
  whenever they mention a brand, a style, a colour or a budget.
- `show_products` — put products on their screen. For "show me both", pass the
  two exact slugs so only those product cards appear.
- `open_product` — open one product. Use the slug from search_catalog when you
  have it.
- `compare_products` — read and compare two real catalogue products only when
  they explicitly ask to compare, ask which is better, or ask for differences. It
  opens a visual comparison modal. Use exact slugs from search_catalog or page
  context. Base your answer on the returned descriptions, specs, size overlap,
  price and demo reviews; give a clean perspective, not a vague tie. Do not call
  `show_products` afterward because the comparison already changes the screen.
- `choose_compared_product` — when the comparison is open and they choose the
  first/second/left/right product or the better/recommended one. It automatically
  closes the modal, opens that product, and leaves the cart unchanged. Never ask
  the shopper to close the modal separately.
- `close_comparison` — close the comparison without selecting anything or changing
  the cart. Use when they ask to close/dismiss it or say the modal is still open.
- `scroll_view` — scroll the comparison modal when it is open, otherwise scroll
  the page. "A bit" means down a little unless they say another direction. After
  success, do not reload or call `compare_products` again; let them react.

"Show me both", "let me see those two", and similar requests mean display, not
comparison. Call `show_products` with `slug_a` and `slug_b`. Never claim products
are visible unless you called a tool that queues a browser action.

Preference is not a cart command. "I like the first one", "I prefer the second"
or "I'll go with the left one" must call `choose_compared_product`, never
`update_cart`. Only mutate the cart when the shopper explicitly says cart,
remove, delete, quantity, empty, or directly answers a cart-specific question.
Never say the comparison closed unless `choose_compared_product`,
`close_comparison`, or navigation to another page actually closed it.
- `choose_color` — "have you got it in blue?"
- `choose_size` — as soon as they tell you their size.
- `add_to_cart` — only once you know the size. It also opens the cart for you, so
  do NOT call `open_cart` afterwards; that would just make them wait twice.
- `open_cart` — only when they ask about their cart out of the blue.
- `update_cart` — only for an explicit cart request: remove a line, keep only one,
  change a quantity, or empty it. Set `explicit_cart_request` to true.
- `checkout` — only when they say they want to buy.

Say what you are doing as you do it — "opening that one now", "putting size eight
in your cart" — then stop and let them react.

## Buying

Never add anything to the cart until you know the size. Ask for it. Offer only the
sizes the tool tells you are stocked, and if they ask for one we do not have, say
which sizes we do have instead of apologising vaguely.

Ask about colour the same way, before you add, not after.

## The cart

Always say the total out loud when the cart changes. "That's three thousand four
hundred and ninety-seven taka altogether." They cannot add it up while listening
to you, and they will not buy a number they have not heard.

If there is already something else in the cart when you add a pair, say what else
is in there and ask whether they want it all or only the new pair. Offer to drop
the rest — do not assume either way.

  "That's the Power Speedcell in, and you've still got the North Star Canvas Shoe
   and the Bata Driver in there. Three thousand four hundred and ninety-seven
   altogether. Want all three, or shall I take the other two out?"

If they say just the new one, call `update_cart` with operation `keep_only` and
that product's slug — one call, not one per item. Then tell them the new total.

Once something is in the cart, ask whether they want to buy now or keep looking.
If they want another pair, start again from `search_catalog`.

When they say buy, call `checkout` once. That takes them to the checkout page and
your job ends there: tell them to fill in delivery and payment themselves. You
cannot pay for anything, and you must NEVER say an order has been placed or
confirmed. It has not been.

## How to speak

This is a voice conversation. One or two sentences per turn. No lists, no
markdown, no urls, no reading ids or slugs out loud — "north-star-canvas-shoe" is
an internal handle; the shopper sees "North Star Canvas Shoe". Say prices as
"eight hundred and ninety-nine taka".

Vary how you speak. The same opener and the same closer every turn makes you sound
like a recording. Cut filler — "right", "perfect", "got it", "absolutely" — it
adds nothing. If they interrupt you, stop talking and follow them.

Ask one question at a time and wait for the answer. Do not ask for brand, colour
and size in a single breath.

## Boundaries

Never ask for a card number, a CVV, an address or a password, and stop them if
they start reading one out. Payment happens on the checkout page, not with you.

Do not repeat back personal data you see in the page context.

If a tool tells you something is unavailable, relay that and offer the
alternative it gives you. If you cannot help after two attempts, say so plainly
rather than looping.

If you don't know, say so. A confident wrong answer about stock or price is worse
than "let me check that".
```

---

## 4. The 10 tools

Create these on the same agent. All are `POST`, all take JSON, and all need the
shared secret header.

Two placeholders appear below:

| Placeholder | Replace with |
|---|---|
| `{{APP_URL}}` | your app's public address, e.g. `https://shop.example.com`. Type the real value — the dashboard does not know this one. |
| `<AGNI_ACTION_SECRET>` | the secret from your `.env`. Type the real value. |

Note what is **not** here: no `{{session_id}}` in any URL, and no query parameters.
Placeholders are only substituted in the prompt, so a templated URL would arrive
with the literal text `{{session_id}}` in it. Section 5.


### `get_page_context`

| Field | Value |
|---|---|
| **Name** | `get_page_context` |
| **Description** | `Read what the shopper is looking at right now — the page, the products on screen, their cart, and how your last action turned out. Call before describing anything, and again after every action you take.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/get-page-context` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `5000` ms |
| **Speak while running** | no |
| **Speak the result** | no |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    }
  },
  "required": [
    "session_id"
  ]
}
```

### `search_catalog`

| Field | Value |
|---|---|
| **Name** | `search_catalog` |
| **Description** | `Check what the store actually stocks, without moving the shopper. Use whenever they name a brand, style, colour or budget, before you promise anything exists.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/search-catalog` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `5000` ms |
| **Speak while running** | no |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    },
    "query": {
      "type": "string",
      "description": "Free text, in the shopper's own words"
    },
    "brand": {
      "type": "string",
      "description": "Exact brand: Bata, North Star, Power, Hush Puppies, Weinbrenner, Comfit, Floatz, Bubblegummers, Light & Easy"
    },
    "gender": {
      "type": "string",
      "enum": [
        "men",
        "women",
        "kids"
      ]
    },
    "category": {
      "type": "string",
      "description": "e.g. Sneaker, Sandal, Loafer, Formal shoe"
    },
    "color": {
      "type": "string",
      "description": "e.g. Black, Blue, Brown, White, Pink"
    },
    "material": {
      "type": "string"
    },
    "size": {
      "type": "number",
      "description": "UK size, e.g. 8"
    },
    "min_price": {
      "type": "number",
      "description": "Taka"
    },
    "max_price": {
      "type": "number",
      "description": "Taka"
    },
    "limit": {
      "type": "number"
    }
  },
  "required": [
    "session_id"
  ]
}
```

### `show_products`

| Field | Value |
|---|---|
| **Name** | `show_products` |
| **Description** | `Put products on the shopper's screen. Use whenever they ask to show, see, display or pull up products. For two known products, including 'show me both', pass slug_a and slug_b. Showing products is not a comparison.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/show-products` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `6000` ms |
| **Speak while running** | yes — `Let me pull those up.` |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    },
    "query": {
      "type": "string",
      "description": "Free text, in the shopper's own words"
    },
    "brand": {
      "type": "string",
      "description": "Exact brand: Bata, North Star, Power, Hush Puppies, Weinbrenner, Comfit, Floatz, Bubblegummers, Light & Easy"
    },
    "gender": {
      "type": "string",
      "enum": [
        "men",
        "women",
        "kids"
      ]
    },
    "category": {
      "type": "string",
      "description": "e.g. Sneaker, Sandal, Loafer, Formal shoe"
    },
    "color": {
      "type": "string",
      "description": "e.g. Black, Blue, Brown, White, Pink"
    },
    "material": {
      "type": "string"
    },
    "size": {
      "type": "number",
      "description": "UK size, e.g. 8"
    },
    "min_price": {
      "type": "number",
      "description": "Taka"
    },
    "max_price": {
      "type": "number",
      "description": "Taka"
    },
    "slug_a": {
      "type": "string",
      "description": "Exact slug for the first product to show"
    },
    "slug_b": {
      "type": "string",
      "description": "Exact slug for the second product to show"
    }
  },
  "required": [
    "session_id"
  ]
}
```

### `open_product`

| Field | Value |
|---|---|
| **Name** | `open_product` |
| **Description** | `Open one product's page so the shopper can see it in detail. Use when they pick a specific item. Prefer the slug from search_catalog; a spoken name also works.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/open-product` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `6000` ms |
| **Speak while running** | yes — `Opening that one now.` |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    },
    "slug": {
      "type": "string",
      "description": "Exact slug from search_catalog"
    },
    "name": {
      "type": "string",
      "description": "The product name as the shopper said it"
    }
  },
  "required": [
    "session_id"
  ]
}
```

### `compare_products`

| Field | Value |
|---|---|
| **Name** | `compare_products` |
| **Description** | `Compare two catalogue products using descriptions, specs, sizes, prices and demo reviews, and open a visual side-by-side comparison. Use only when the shopper explicitly asks to compare, asks which is better, or asks for differences. Do not use for 'show me both' or other show/see requests.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/compare-products` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `6000` ms |
| **Speak while running** | yes — `Comparing those two.` |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    },
    "slug_a": {
      "type": "string",
      "description": "Exact slug for the first product"
    },
    "slug_b": {
      "type": "string",
      "description": "Exact slug for the second product"
    },
    "product_a": {
      "type": "string",
      "description": "Fallback: first product name if you do not have the slug"
    },
    "product_b": {
      "type": "string",
      "description": "Fallback: second product name if you do not have the slug"
    }
  },
  "required": [
    "session_id"
  ]
}
```

### `choose_compared_product`

| Field | Value |
|---|---|
| **Name** | `choose_compared_product` |
| **Description** | `Use when a comparison is open and the shopper chooses the first/second/left/right product or says to take the better/recommended one. Automatically closes the comparison and opens that product; never ask the shopper to close the modal. It never changes the cart.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/choose-compared-product` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `6000` ms |
| **Speak while running** | yes — `Opening your choice.` |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    },
    "choice": {
      "type": "string",
      "enum": ["first", "second", "recommended"],
      "description": "Which compared product the shopper chose"
    },
    "slug": {
      "type": "string",
      "description": "Optional exact compared-product slug when known"
    }
  },
  "required": ["session_id"]
}
```

### `close_comparison`

| Field | Value |
|---|---|
| **Name** | `close_comparison` |
| **Description** | `Close the comparison modal without selecting a product or changing the cart. Use when the shopper asks to close, dismiss or hide the comparison, or says the modal is still open.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/close-comparison` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `6000` ms |
| **Speak while running** | yes — `Closing the comparison.` |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    }
  },
  "required": ["session_id"]
}
```

### `scroll_view`

| Field | Value |
|---|---|
| **Name** | `scroll_view` |
| **Description** | `Scroll what the shopper is viewing. Use when they ask to scroll, move down/up, continue, see more, go to the top, or go to the bottom. Scrolls the comparison modal when open; otherwise scrolls the page. After success, do not reload or call compare_products again unless they request a new comparison.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/scroll-view` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `6000` ms |
| **Speak while running** | yes — `Scrolling now.` |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    },
    "direction": {
      "type": "string",
      "enum": ["up", "down", "top", "bottom"],
      "description": "Defaults to down"
    },
    "amount": {
      "type": "string",
      "enum": ["little", "page"],
      "description": "Use little for 'a bit'; page for a full screen"
    }
  },
  "required": ["session_id"]
}
```

### `choose_color`

| Field | Value |
|---|---|
| **Name** | `choose_color` |
| **Description** | `Use when the shopper asks for a different colour — 'do you have it in blue?'. Switches to that colourway if we stock it, otherwise shows the alternatives in that colour.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/choose-color` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `6000` ms |
| **Speak while running** | no |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    },
    "color": {
      "type": "string",
      "description": "e.g. Blue"
    }
  },
  "required": [
    "session_id",
    "color"
  ]
}
```

### `choose_size`

| Field | Value |
|---|---|
| **Name** | `choose_size` |
| **Description** | `Select a size on the product the shopper has open. Use as soon as they tell you their size. Tells you the stocked sizes if that one isn't available.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/choose-size` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `6000` ms |
| **Speak while running** | no |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    },
    "size": {
      "type": "number",
      "description": "UK size, e.g. 8"
    }
  },
  "required": [
    "session_id",
    "size"
  ]
}
```

### `add_to_cart`

| Field | Value |
|---|---|
| **Name** | `add_to_cart` |
| **Description** | `Add the product to the shopper's cart and open the cart page in one step — do NOT call open_cart afterwards. Only call once you know their size; it will refuse otherwise. The reply tells you the new total and what else is already in the cart, so you can ask whether they want all of it.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/add-to-cart` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `6000` ms |
| **Speak while running** | yes — `Adding that to your cart.` |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    },
    "slug": {
      "type": "string",
      "description": "Defaults to the product currently open"
    },
    "size": {
      "type": "number",
      "description": "UK size, e.g. 8"
    }
  },
  "required": [
    "session_id"
  ]
}
```

### `open_cart`

| Field | Value |
|---|---|
| **Name** | `open_cart` |
| **Description** | `Show the shopper their cart and read back what is in it with the total. Use when they ask about their cart — not after add_to_cart, which already opens it.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/open-cart` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `6000` ms |
| **Speak while running** | no |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    }
  },
  "required": [
    "session_id"
  ]
}
```

### `update_cart`

| Field | Value |
|---|---|
| **Name** | `update_cart` |
| **Description** | `Change cart contents only when the shopper explicitly says cart, remove, delete, quantity, empty, or clearly answers a cart-specific question. Never use for 'I like/prefer/want the first one' during comparison; use choose_compared_product instead. Use keep_only when they explicitly want one cart item and the rest removed.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/update-cart` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `6000` ms |
| **Speak while running** | no |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    },
    "operation": {
      "type": "string",
      "enum": [
        "remove",
        "keep_only",
        "set_quantity",
        "clear"
      ]
    },
    "slug": {
      "type": "string",
      "description": "The item's slug, from the page context"
    },
    "size": {
      "type": "number"
    },
    "quantity": {
      "type": "number"
    },
    "explicit_cart_request": {
      "type": "boolean",
      "description": "Set true only when the shopper explicitly requested a cart change"
    }
  },
  "required": [
    "session_id",
    "operation"
  ]
}
```

### `checkout`

| Field | Value |
|---|---|
| **Name** | `checkout` |
| **Description** | `Click Proceed to Checkout only when the shopper says they want to buy. Then call get_page_context and only claim checkout opened when it reports PAGE: checkout. Never say the order is placed.` |
| **Method** | `POST` |
| **URL** | `{{APP_URL}}/api/agni/functions/checkout` |
| **Headers** | `X-Agni-Action-Secret: <AGNI_ACTION_SECRET>` |
| **Timeout** | `6000` ms |
| **Speak while running** | yes — `Taking you to checkout.` |
| **Speak the result** | yes |

**Parameters**

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "The shopper's session id, given to you in your system prompt. Required on every call."
    }
  },
  "required": [
    "session_id"
  ]
}
```
---

### What the tools reply

Every one of them answers HTTP 200 — even for "not found" or "not stocked" — with:

```json
{ "ok": true, "summary": "…" }
```

`summary` is written to be read aloud, so the agent can relay it directly. A 4xx
would read to the agent as a broken tool and it would apologise vaguely instead of
saying the useful thing.

They also refuse rather than queue an action that cannot work:

```
choose_size {size: 13}   → "We don't have size 13 in the North Star Canvas Shoe.
                            It comes in 5, 6, 7, 8, 9 and 10. Offer the nearest."
add_to_cart {}           → "Ask which size first … Don't add anything until they answer."
search_catalog {brand:"Nike"} → "Nothing matches that. We carry Bata, North Star, …"
```

That is deliberate: the agent gets something true to say immediately, instead of
narrating a click that was never going to land.

### Two that already exist and are not registered

The bridge also understands `navigate_to` (any internal route) and
`highlight_element` (ring a control by id). They are not registered as tools —
navigation is already covered by `show_products`, `open_product`, `open_cart` and
`checkout`, and a shop has nothing worth pointing at that opening the product
page doesn't already show. Add them if you find a use; the endpoints
([app/api/agni/actions](../app/api/agni/actions/route.ts)) already accept both.

`end_call` is an Agni built-in. Attach it if you want the agent to be able to hang
up — there is nothing to implement.

---

## 5. Why `{{session_id}}` **is** in our prompt

Some Agni setups put `{{session_id}}` into the tool's URL instead, and keep it away
from the AI entirely. That is the better pattern where it works. **It does not work
here**, and the reason is worth knowing before you try to "fix" it.

Dynamic variables are substituted into the **prompt** only — not into a tool's
`url`, not into its `queryParameters`. A tool configured with
`?sid={{session_id}}` receives the literal seven-character-plus-braces string, not
the id. The reference implementation that works in production today passes it the
other way: the model reads it from its prompt and sends it as an argument.

So for us:

| | What it is | Who reads it | Where `{{session_id}}` goes |
|---|---|---|---|
| **Prompt** | Instructions for the AI | The AI | ✅ here |
| **Tool config** | The URL, headers and body | The platform | ❌ not here |

The cost of this arrangement is real: the model has to repeat a random string
correctly on every call for the whole conversation, and models do drop and mangle
such strings. We handle that in two ways rather than hoping.

**The id is short and stable.** It is generated once per browser with
`crypto.randomUUID()` and kept in `localStorage`, so it does not change mid-call.

**A wrong id fails loudly.** [cleanSessionId](../lib/agni/functionKit.ts) throws
away any value containing `{{`, and a missing id returns:

> "I've lost track of which browser tab you're shopping in. Ask the shopper to
> reload the store page."

That sentence is a diagnostic. If you hear the agent say it, the id is not
arriving — check that the key in `prompt_dynamic_variables` and the placeholder in
the prompt are both exactly `session_id`.

### The session id is not a password

It travels in prompts and query strings, it sits in `localStorage`, and it turns up
in access logs. Anyone holding one who can reach our endpoints could drive that
shopper's tab.

The `X-Agni-Action-Secret` header is the actual authentication, and it stays on
every tool even though `session_id` now arrives on every call. Do not let one
working identifier tempt you into dropping the other.

---

## 6. Before it will work

**The URL must be reachable from the internet.** Tools are called by the Agni
backend, not by the browser. `http://localhost:3000` will never work — the backend
cannot reach your laptop. For local testing run one of:

```
cloudflared tunnel --url http://localhost:3000
ngrok http 3000
```

and use the printed `https://…` address as `{{APP_URL}}` and as `AGNI_PUBLIC_URL`.
`npm run agni:functions -- --register` refuses a localhost value rather than
registering fourteen tools that can never fire.

**A dead tunnel looks like a broken agent.** Quick tunnels hand out a new hostname
every start and drop after idle. When that happens the tools return an error page
instead of JSON and the agent says something vague about a connection problem —
the symptom points at the agent, the cause is the tunnel. Confirm by opening
`{{APP_URL}}/api/agni/functions/search-catalog` in a browser: a 404 body of JSON
means you reached the app (GET isn't allowed, which is correct); an HTML error page
means restart the tunnel and re-register. A named tunnel keeps one stable hostname
and saves you re-registering every time.

**The secret is required in production.** With `NODE_ENV=production` and no
`AGNI_ACTION_SECRET` set, every function endpoint returns 404 — it fails closed
rather than serving anyone who finds it. In development, an unset secret leaves the
gate open for convenience.

**The store is in memory.** [lib/agni/store.ts](../lib/agni/store.ts) keeps page
context and the action queue in a `Map` inside one Node process, expiring after 30
minutes of silence. Deploy more than one instance and the browser's write and the
agent's read can land on different ones — the agent will intermittently see no
context. One instance is fine; more needs Redis behind the same functions.

**The catalogue is 48 products.** Real Bata Bangladesh data, one colourway per
style, sizes roughly 5–11. There is no stock level and no delivery estimate, so the
prompt forbids inventing either.

**Checkout is a placeholder.** `checkout` clicks the real button and lands the
shopper on `/checkout`, which stops at a payment step with no provider wired up.
The prompt tells the agent never to claim an order was placed — keep that line if
you edit the prompt.

---

## 7. Checking it works

**Before the first call**, prove one endpoint by hand — this is exactly what Agni
sends:

```bash
curl -sS -X POST "$APP_URL/api/agni/functions/search-catalog" \
  -H 'Content-Type: application/json' \
  -H "X-Agni-Action-Secret: $AGNI_ACTION_SECRET" \
  -d '{ "session_id": "probe", "brand": "North Star" }'
```

```json
{ "ok": true, "summary": "9 matches. Closest is the North Star Canvas Shoe, Blue, 899 taka, sizes 5 to 10.", … }
```

Then prove the gate — this must return 404, not 401, and not data:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
  "$APP_URL/api/agni/functions/search-catalog" \
  -H 'Content-Type: application/json' -d '{"session_id":"probe","brand":"Bata"}'
```

**On the first call**, ask "what am I looking at?" and then "show me North Star
shoes".

- It describes your actual page, and the listing loads → everything is wired.
- "I've lost track of which browser tab you're shopping in" → the id is not
  arriving. Check the `prompt_dynamic_variables` key and the prompt placeholder
  match.
- It talks but nothing on screen changes → it is narrating instead of calling the
  tools. Check the tools are actually attached (`npm run agni:functions -- --verify`)
  and that the descriptions were copied as trigger conditions.
- It invents a product → `search_catalog` is missing or its description was
  rewritten as documentation.

**Without the voice agent at all**, run with `NEXT_PUBLIC_AGNI_DEBUG=1` and use the
Agni console at the bottom left. Its buttons queue the same actions the tools
queue, so you can prove the browser half — navigate, size, add, cart, checkout —
before any of this is configured.
