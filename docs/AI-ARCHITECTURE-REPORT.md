# How the AI in ConstructIQ Works — Full Report

*Generated 2026-07-09 from the current code on `main`. Every claim below was
verified against the source files referenced.*

---

## 1. Executive summary

ConstructIQ has one AI provider (OpenAI, default model `gpt-4o-mini`) and four
shipped AI capabilities, all built on the same pattern: **a small, focused
"agent" class per job**, coordinated by an **orchestrator** that decides which
agent should handle each user message.

| Capability | What the user sees | Where it lives |
|---|---|---|
| AI Assistant (chat) | A chat drawer; type "take me to reports" and the app navigates there | `backend/src/modules/ai/` + `frontend/src/features/ai/` |
| Report summaries | One-click AI summary of a daily site report, saved on the report | `agents/report-summary.agent.ts` |
| Bid analysis | Upload a subcontractor bid PDF → structured price/terms/red-flags extraction | `agents/bid-extractor.agent.ts`, called from the bids module |
| AI plans (monetization) | Orgs subscribe to an AI plan; each plan unlocks specific AI features | `ai-plans` module + `AiFeatureGuard` |

The design philosophy: the LLM is **never trusted blindly**. It is used for
understanding language (intent, summarization, extraction), while all real
decisions — which route exists, which report the caller may read, what a valid
price basis is — are enforced by deterministic TypeScript code around it.

---

## 2. The big picture

```
User types a message in the chat drawer
        │
        ▼
Frontend  useAiChat() ──POST /api/v1/ai/chat──►  AiController
                                                     │  3 guards: JWT auth →
                                                     │  permission ai.use →
                                                     │  org's AI plan has 'ai_assistant'
                                                     ▼
                                             OrchestratorService.route()
                                                     │
                                       1. load/create ChatSession, save user msg
                                       2. load last 10 messages (memory)
                                       3. ask OpenAI: "which agent is this for?"
                                          → {"agent": "navigation", "payload": {}}
                                                     │
                          ┌──────────────────────────┼──────────────────────────┐
                          ▼                          ▼                          ▼
                  NavigationAgent            ReportSummaryAgent            "unknown"
                  (OpenAI tool-calling       (fetch report from DB,        (polite fallback
                   → app route)               summarize, persist)           message)
                          │                          │                          │
                          └──────────────────────────┴──────────────────────────┘
                                                     │
                                       4. save assistant reply to ChatMessage
                                       5. return { reply, action?, sessionId }
        │
        ▼
Frontend shows the reply; if action.type === 'navigate',
Next.js router.push(action.route) and the drawer closes.
```

---

## 3. Access control — three locks before any AI runs

Every AI endpoint sits behind three guards, in order
([ai.controller.ts:27](backend/src/modules/ai/ai.controller.ts#L27)):

1. **`JwtAuthGuard`** — you must be logged in.
2. **`PermissionsGuard` + `@RequirePermissions(PERMISSIONS.AI.USE)`** — your
   role must include the `use:ai` permission. Every internal staff role with a
   UI of its own has it (PM, PROCUREMENT, SURVEYOR, SITE_ENG; ORG_ADMIN
   inherits it from `manage:company`). External roles — CLIENT, SUPPLIER,
   SUBCONTRACTOR — deliberately do not. PLANNING_ENG and FINANCE_VIEWER are
   withheld until those roles have sections to navigate to.
3. **`AiFeatureGuard` + `@RequireAiFeature(...)`** — your **organization's AI
   subscription** must include the specific feature key. Resolution chain:
   `user.organizationId → Organization.aiPlanId → AiPlan.features[]`. No AI
   plan → 403 "Your organization does not have an AI subscription."
   Super Admins bypass this gate.

A fourth lock lives *inside* the request rather than in front of it — see §3b.

This is what makes AI **sellable per plan**: the catalog in
[ai-features.ts](backend/src/common/constants/ai-features.ts) is auto-synced to
the `ai_features` collection on startup, and Super Admin assigns features to
plan tiers at `/super-admin/ai-plans`. Shipped keys: `ai_assistant`,
`ai_report_summary`, `ai_supplier_search`, `ai_bid_analysis`. Roadmap keys
(defined but inactive): `ai_doc_search`, `ai_risk_detection`, `ai_takeoff`.

---

## 3b. Per-user scoping — the assistant stays in your lane

The three guards above answer *"may this person use AI at all?"*. They say
nothing about *what* the assistant should do for them. That second question is
answered per-request, from the caller's own permissions — so a Site Engineer's
assistant covers tasks, reports, issues, inspections, RFIs, deliveries and
documents, and simply does not deal in budget or user management; a Quantity
Surveyor's covers BOQ, variations, valuations and budget but not daily-report
authoring. None of this is hand-written per role: it falls out of the
permission keys the role already carries, so custom roles an org creates work
without any AI-side change.

**Two registries and one enforcement point:**

- **`capabilities/ai-capabilities.ts`** — which agents a caller may reach. Each
  entry declares `requires: string[]`; `report-summary` requires
  `read:reports`. `resolveCapabilities(permissions)` filters the list.
- **`tools/navigation-catalog.ts`** — which pages the assistant may offer. A
  destination is real for a caller only when their **primary role has a route
  for it** *and* their permissions satisfy `requires`. Routes are role-prefixed
  (`/pm/budget`, `/site-eng/reports`) because
  `frontend/src/app/(app)/layout.tsx` redirects anyone off another role's
  prefix — a bare `/budget` would be a dead link. This file is the
  permission-annotated backend mirror of `frontend/src/config/sidebar-nav.ts`
  and must be kept in lockstep with it.
- **`OrchestratorService.route()`** — builds the classifier system prompt *from
  the caller's capabilities*, so an agent they cannot use is never even
  described to the model; then **re-checks the returned `decision.agent`
  against that same list before dispatching**. The prompt is a hint; that check
  is the enforcement. `NavigationAgent` does the same one level down: the tool
  enum contains only the caller's destinations, and the tool call it gets back
  is re-validated against them before any route is emitted.

Both resolvers and `PermissionsGuard` share
`common/util/permission-check.util.ts` (`satisfiesPermission` / `satisfiesAll`),
which encodes the `manage:all` / `manage:company` wildcards and the
`manage:<resource> ⇒ read:<resource>` hierarchy. One implementation means the
assistant can never advertise something the API would then refuse.

`PermissionsGuard` populates `request.user.permissions` **and**
`request.user.roles` (neither is in the signed JWT); `AiController` forwards
both into `OrchestratorContext`.

**Adding an agent:** one entry in `AI_CAPABILITIES` naming the permissions it
reads behind the scenes, a provider in `ai.module.ts`, a `case` in the switch.
Per-user scoping then comes for free.

---

## 4. The orchestrator — one classifier, many agents

[orchestrator.service.ts](backend/src/modules/ai/orchestrator/orchestrator.service.ts)
is the brain of `POST /ai/chat`. Step by step:

1. **Session** — `ChatSessionService.getOrCreate()` reuses the caller's session
   only if both `userId` and `organizationId` match (a stolen sessionId from
   another user/org silently gets a fresh session instead — tenant isolation).
2. **Persist** the user message to the `chat_messages` collection.
3. **Classify** — one cheap OpenAI call with `response_format: json_object`
   and `max_tokens: 128`. The system prompt lists **the agents and sections
   this caller may use** (see §3b) and demands strict JSON:
   `{"agent": "<name>", "payload": {}}`. Conversation history is included so
   follow-ups resolve ("summarize report X" → "and now go to my tasks").
4. **Check, then dispatch.** Before the `switch`, the returned agent name is
   re-checked against the caller's allowed capabilities; anything else — an
   out-of-scope area, an invented agent name, a jailbroken classification —
   returns a refusal that names what the user *can* do, and never reaches an
   agent. Unparseable or unknown classifications fall through to a friendly
   "I'm not sure how to help with that yet" reply — the endpoint never crashes
   on a bad LLM answer.
5. **Persist** the assistant reply (with `{ agent, action }` metadata) and
   return `{ reply, action?, sessionId }`.

**Why this design:** intent classification is isolated from execution. Each
agent stays small and independently testable, and adding a capability means
adding one agent + one `case` — the chat UI never changes.

---

## 5. The agents

### 5.1 NavigationAgent — language → app route
[navigation.agent.ts](backend/src/modules/ai/agents/navigation.agent.ts)

Uses **OpenAI function/tool-calling** instead of free text. The tools are built
per caller by `buildNavigationTools()`
([navigation-catalog.ts](backend/src/modules/ai/tools/navigation-catalog.ts)):

- `navigate_to_section` — `section` constrained by an **enum built from that
  caller's own destinations**, so the model cannot invent a page *and* cannot
  pick one the user has no access to. A Site Engineer's enum simply has no
  `budget` in it.
- `navigate_to_project` — offered only when the caller can read projects.

The tool call is mapped to a route by `resolveNavigationRoute()`, which looks
the key up **in the caller's own destination list** and returns `null` for
anything else — so an out-of-scope or hallucinated pick becomes a polite
refusal, not a navigation. Routes are role-prefixed and the fallback is the
caller's `ROLE_HOME`. The LLM only ever *chooses from* routes we defined for
that specific user; it never *writes* a URL. The agent returns
`{ reply, action: { type: 'navigate', route } }` and the frontend performs the
actual navigation.

### 5.2 ReportSummaryAgent — summarize a daily site report
[report-summary.agent.ts](backend/src/modules/ai/agents/report-summary.agent.ts)

1. Fetches the `DailyReport` **with an org-scoped filter**
   (`{ _id, organizationId }`; Super Admins may cross orgs). The tenancy check
   happens *before* any AI call — the model never sees another org's data.
2. Builds a compact plain-text prompt from the structured fields: date,
   weather/temps, work completed, blockers, notes, manpower entries, material
   entries.
3. Asks the model for a summary "under 150 words" highlighting achievements,
   blockers, and safety concerns (`max_tokens: 512`).
4. **Persists** the result to `DailyReport.aiSummary` + `aiSummaryAt`, so the
   summary is computed once and then simply displayed.

Reachable two ways: through chat (orchestrator routes `report-summary` intents)
or directly via `POST /ai/summarize-report/:reportId`.

### 5.3 BidExtractorAgent — bid PDF → structured data
[bid-extractor.agent.ts](backend/src/modules/ai/agents/bid-extractor.agent.ts),
called from `BidsService` (upload flow: PDF → `pdf-parse` text → agent).

This is the most defensive agent, because its output feeds financial screens:

- Input text is truncated to **50,000 chars** (cost + context control).
- `response_format: json_object`, **`temperature: 0.1`** (extraction wants
  determinism, not creativity), `max_tokens: 1500`.
- The prompt pins an exact JSON schema: contractor, trade, total_price,
  currency (ISO 4217), price_basis (4 allowed values), inclusions/exclusions,
  payment terms, validity, warranty, red_flags, a 0–100
  `scope_completeness_score`, and a 1–2 sentence summary. It explicitly says
  "nullable when not stated — **do not invent values**".
- After parsing, a **`normalize()` pass re-validates every field in
  TypeScript**: numbers checked with `Number.isFinite`, arrays filtered to
  strings, `price_basis` checked against the schema enum (fallback
  `LUMP_SUM`), the score clamped to 0–100. Malformed AI output becomes a clean
  500, never corrupt data.
- Both the normalized data **and the raw model output** are returned, so the
  original extraction is auditable.

The endpoint is gated by `@RequireAiFeature(AI_FEATURES.AI_BID_ANALYSIS.key)`
in [bids.controller.ts:55](backend/src/modules/bids/bids.controller.ts#L55).
Downstream, the awarded bid's extracted total/currency seeds the draft
purchase order (bid-award → PO seam).

---

## 6. Chat memory — how follow-ups work

[chat-session.service.ts](backend/src/modules/ai/chat/chat-session.service.ts)
+ two collections:

- **`chat_sessions`** — `{ userId, organizationId }`; one conversation thread.
- **`chat_messages`** — `{ chatSessionId, role, content, userId, metadata }`;
  assistant rows carry `{ agent, action }` metadata for traceability.

`loadHistory()` returns the **last 10 messages** (sorted back into
chronological order). That window is prepended to both the classifier call and
the NavigationAgent call — which is exactly why "go to projects … and now the
users page" works. Ten messages is a deliberate cost cap: enough context for
follow-ups without unbounded token growth.

The frontend keeps `sessionId` in a Zustand store and echoes it with every
request, so one drawer session = one server-side thread.

---

## 7. The frontend side

`frontend/src/features/ai/`:

- **`AiChatFab.tsx` / `AiChatDrawer.tsx` / `AiMessageBubble.tsx`** — floating
  action button opens the chat drawer; messages render as bubbles.
- **`ai-chat.store.ts`** (Zustand) — client state: open/closed, message list,
  `sessionId`.
- **`useAiChat.ts`** (TanStack mutation) — posts `{ message, sessionId }` to
  `/ai/chat`. On success it appends the assistant bubble, stores the returned
  `sessionId`, and — the key trick — **executes the action**: if
  `action.type === 'navigate'`, it calls Next.js `router.push(action.route)`
  and closes the drawer.

So the backend *describes* what should happen and the frontend *does* it. New
action types (e.g. `open-modal`, `prefill-form`) only need a new `if` in this
hook.

---

## 8. Provider, configuration, and cost controls

- **SDK**: official `openai` npm package; each agent constructs its own client
  from `ConfigService`.
- **Env** (`backend/.env`): `OPENAI_API_KEY` (required for AI endpoints only —
  the rest of the app runs without it), `AI_MODEL` (default `gpt-4o-mini`).
  One env var swaps the model everywhere.
- **Cost levers baked in**: a cheap small model by default; `max_tokens`
  budgets per call (128 classify / 512 summary / 1500 extraction); 10-message
  history window; 50k-char PDF truncation; summaries persisted so they aren't
  regenerated; and the global throttler (100 req/min) applies to AI routes.

---

## 9. Safety and correctness principles (the "why" behind the code)

1. **Tenancy before AI** — data is fetched with org-scoped filters *before*
   any prompt is built; the model can only see what the caller could already
   see. Sessions are equally scoped.
1b. **Least privilege inside the tenant** — beyond the org boundary, the
   assistant's own capabilities and destinations are filtered by the caller's
   permissions, and the classification is re-checked against that filter before
   dispatch. The model is not the access-control layer; it is only ever handed
   a menu that is already safe.
2. **The LLM proposes, code disposes** — enum-constrained tools, route lookup
   tables, JSON-mode + schema prompts, and TypeScript normalization mean model
   output is always validated or clamped before it touches the DB or the UI.
3. **Graceful degradation** — bad classification JSON → logged warning +
   fallback reply; no tool call → the model's text is shown; unparseable
   extraction → clean 500 with a human message.
4. **Auditability** — every chat turn is persisted with agent metadata; bid
   extraction keeps the raw model payload; summaries are stamped with
   `aiSummaryAt`.
5. **Monetization enforced server-side** — feature access is a DB-backed
   guard on the API, not a hidden button in the UI.

---

## 10. How to add a new AI capability (checklist)

1. Create `backend/src/modules/ai/agents/<name>.agent.ts` — one `@Injectable()`
   class, own OpenAI client, one public method. Validate/normalize the model
   output before returning.
2. Register it in `ai.module.ts` providers.
3. Route to it: add an entry to `AI_CAPABILITIES`
   ([ai-capabilities.ts](backend/src/modules/ai/capabilities/ai-capabilities.ts)) with its
   `promptLine` and the permissions it reads behind the scenes, plus a `case`
   in the orchestrator's `switch` (chat entry), and/or expose a direct
   endpoint. The prompt line and the allow-check both derive from that one
   entry, so the new agent is permission-scoped from the first request.
4. If it's sellable: add a key to `AI_FEATURES` (auto-syncs on restart), gate
   the route with `@RequireAiFeature(...)`, assign it to plan tiers in
   `/super-admin/ai-plans`.
5. If it triggers UI behavior: return an `action` and handle the new
   `action.type` in `useAiChat.ts`.

---

## 11. Current limitations / honest gaps

- **No streaming** — replies arrive as one block (fine for short answers;
  would matter for long generations).
- **Two chat-reachable intents** — the classifier only knows `navigation` and
  `report-summary`; bid analysis is API-only, supplier search is
  catalog-defined but has no `@RequireAiFeature`-gated backend endpoint yet.
- **Fixed 10-message memory** — no long-term memory or cross-session recall;
  no summarization of older history.
- **Single provider** — OpenAI only; no fallback provider or retry/backoff
  policy around API outages beyond the error responses.
- **Navigation catalog is a hand-kept mirror** — `navigation-catalog.ts` must
  be updated whenever `frontend/src/config/sidebar-nav.ts` gains a page. A new
  sidebar entry the catalog doesn't know about is simply not offered by the
  assistant (fails closed, but silently).
- **Roles without a UI** — PLANNING_ENG and FINANCE_VIEWER have no route prefix
  of their own, so `roleFromUser()` returns null and `(app)/layout.tsx` logs
  them out. They are excluded from the `use:ai` grant until those sections
  ship; a `SIDEBAR_BY_ROLE` entry for them is the trigger to revisit.
- **Roadmap features** (`ai_doc_search`, `ai_risk_detection`, `ai_takeoff`)
  exist only as catalog entries — no implementation yet.
