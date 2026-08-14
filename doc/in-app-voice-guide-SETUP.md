# In-App Voice Guide — what was implemented & how to finish wiring it

This is the implementation of `in-app-voice-guide-brief.pdf` (the authoritative
design: `thunderemotionlite` variant + backend proxy into our Agni voice backend,
context **pushed** to our backend keyed by session id, actions **queued** back to
a bridge). It supersedes the DOM-scraping `customwidget` approach sketched in
`in-app-voice-guide.md`.

## What changed in code (nothing committed)

### `agni-frontend`
- `src/lib/guide/types.ts` — registry types.
- `src/lib/guide/registry/*.ts` — the docs registry (agents, campaigns/new,
  knowledge-base, tools, dashboard) + `index.ts` matcher and the
  `### AGNI GUIDE CONTEXT ###` text serializer.
- `src/lib/guide/session.ts` — `snowie_session_id` helper (same format the widget/
  tracker use).
- `src/app/api/guide/context/route.ts` — POST (frontend pushes page context) / GET
  (`sid=` — the guide agent's `get_page_context` tool pulls it).
- `src/app/api/guide/actions/route.ts` — POST (agent queues highlight/navigate) /
  GET (`sid=` — the bridge drains the queue).
- `src/app/api/guide/_store.ts` — process-local store (swap for Redis in a
  multi-instance deploy; the contract is stable).
- `src/components/guide/` — `GuideEmbed` (loads the hosted widget once),
  `GuideContext` (pushes context on route change), `GuideBridge` (polls + performs
  highlight/navigate), `GuideRoot` (single mount), `config.ts`, JSX typing.
- Mounted once in `src/app/(app)/layout.tsx` (never per-page, never re-keyed).
- `data-guide-id` on the prompt / voice / tools / knowledge-base controls on
  `/agents/[id]`.
- New env vars in `.env.example` (`NEXT_PUBLIC_GUIDE_*`).

### `snowie/Dental_Backend` — the one surgical change
- `public_apps/user/views2.py`, `CreateLiveKitRoomAPIView` (`thunderemotionlite`
  branch): read `session_id` from the incoming widget request and forward it into
  the Agni call — both in `metadata` and as `prompt_dynamic_variables.snowie_session_id`.
  Previously it was discarded and an empty dynamic-variable set was passed.

### `sidewidget` — no change required
The widget already sends `session_id` on every create-room request
(`AgniCompanyWidget.tsx` / `GrokWidget.tsx`, read from `snowie_session_id`). The
guide loop only needs that id forwarded, which is the backend change above.

## What must still be configured outside code (Snowie dashboard / Agni backend)

1. **Guide agent** ("Agni Product Guide") on **our own org + schema** (so it never
   spends a user's credits — brief §4). Set `NEXT_PUBLIC_GUIDE_AGENT_ID` and
   `NEXT_PUBLIC_GUIDE_SCHEMA` to its agent_code and schema. Until both are set the
   embed renders nothing.

2. **System prompt** — must reference the forwarded id and pull context, e.g.:
   > Your session id is `{{snowie_session_id}}`. Before explaining the current
   > screen, call `get_page_context` with that id; it returns a block delimited by
   > `### AGNI GUIDE CONTEXT ###` — treat it as authoritative for the screen the
   > user is on right now. Re-fetch when the topic changes or the user says they
   > moved screens. Never invent a field that isn't in that block.

   The agent's prompt must be authoritative in the Snowie-side record — the Agni
   adapter rewrites the prompt on every sync (brief §3).

3. **Server tools** on the guide agent, pointing at this app's public origin:
   - `get_page_context` → `GET  {APP}/api/guide/context?sid={{snowie_session_id}}`
   - `highlight_element` → `POST {APP}/api/guide/actions`
     body `{ "session_id": "{{snowie_session_id}}", "type": "highlight_element", "guide_id": "…" }`
   - `navigate_to` → `POST {APP}/api/guide/actions`
     body `{ "session_id": "{{snowie_session_id}}", "type": "navigate_to", "route": "…" }`
   - (`open_tab` / `expand_section` / `start_tour` / `set_step` use the same POST shape.)

   Confirm the tool-management routine won't delete these custom tools on sync
   (brief §3).

4. **Long-form how-to prose** (writing prompts, campaign best practices) → the
   agent's knowledge base, not the registry.

## Verify (brief §0 core assumption)
- Set the env vars, load any `/agents/[id]` page → `POST /api/guide/context` fires
  with the rendered block; `GET /api/guide/context?sid=…` returns it.
- `POST /api/guide/actions` with `type:"highlight_element", guide_id:"agent.prompt"`
  → the prompt card spotlights within ~1.5s (bridge poll).
- Dev console warns if any documented `guideId` has no `data-guide-id` in the DOM.
