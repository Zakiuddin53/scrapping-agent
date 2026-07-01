# Build Prompts — AI Payment Posting Assistant (Prototype)

Use these in order. Review and commit after each phase before moving to the next —
don't chain them into one mega-prompt, the point is to catch drift early.

Assumes the single-Next.js-app architecture (Route Handlers instead of a separate
NestJS service). If you decide to keep NestJS for consultancy-skill reuse, say so
explicitly to the agent in Phase 0 and it'll change Phase 2–3 accordingly.

---

## Phase 0 — Scaffold + architecture decision record

```
Set up a new Next.js 14+ App Router project in TypeScript for a prototype called
"AI Payment Posting Assistant". Use Mantine UI for components and Mantine Form for
the payment posting form. Do not add TanStack Query, Redux, or any state library —
a single upload-then-review flow doesn't need it; use useState/useReducer.

Create a `.agent/` directory with:
- `.agent/PRD.md` (I'll paste in my PRD)
- `.agent/architecture.md` — record the decision to use a single Next.js app with
  Route Handlers instead of a separate backend, and why (prototype scope, no auth/DB,
  avoid CORS/deploy overhead for a demo).

Set up the folder structure:
- app/api/payments/extract/route.ts   (empty stub for now)
- app/page.tsx                        (upload screen)
- components/                         (UploadZone, PaymentForm, etc. — empty stubs)
- lib/                                (schema.ts, pdf.ts, llm.ts — empty stubs)

Don't implement logic yet — just scaffold and confirm the structure with me.
```

---

## Phase 1 — PDF upload UI (Screen 1)

```
Implement the upload screen (app/page.tsx + components/UploadZone.tsx):
- Drag-and-drop PDF upload + a "Browse File" fallback button
- Accept only .pdf, reject anything else with a friendly inline error
- Enforce a 10MB max size, friendly error if exceeded
- On valid file selection, store the file in local state and show a "Ready to
  process" state with a Process/Upload button — don't auto-submit yet, I want to
  see the intermediate state
- Use Mantine components (Dropzone, Button, Alert) for this

Keep it to three UI states for now: Idle, FileSelected, Error. We'll wire in
Processing/Success in Phase 4.
```

---

## Phase 2 — PDF text extraction (backend)

```
Implement app/api/payments/extract/route.ts, step 1 only:
- Accept a multipart/form-data POST with a `pdf` file field
- Parse the PDF and extract raw text using [pdf-parse] (or recommend a better
  actively-maintained alternative if pdf-parse has issues — check first)
- For now, just return { success: true, rawText: string } so I can verify
  extraction quality on a real EOB/ERA PDF before we add the LLM step
- Handle: non-PDF upload, corrupt/unreadable PDF, oversized file — return
  { success: false, message } with clear, non-technical messages per the PRD's
  error handling section

Don't call any LLM yet. I want to check raw text extraction quality first.
```

_(Test this yourself with a real or sample EOB PDF before moving on — if the text
extraction is garbled, that's worth catching before you build the LLM prompt around it.)_

---

## Phase 3 — LLM structured extraction

```
Extend app/api/payments/extract/route.ts to add the LLM step:

1. Define a Zod schema in lib/schema.ts matching this shape exactly:
   [paste the Example JSON Response from PRD section 13]

2. In lib/llm.ts, write a function that sends the extracted PDF text to
   [OpenAI GPT-4o / Gemini — pick one, note the model in architecture.md] with a
   system prompt instructing it to return ONLY valid JSON matching the schema,
   no markdown fences, no commentary. Include the CPT code / payment field
   definitions from the PRD in the prompt so the model knows what to extract.

3. Validate the LLM's JSON response against the Zod schema. If validation fails,
   retry once with an error-correction prompt (tell the model what validation
   error occurred). If it fails twice, return
   { success: false, message: "Unable to extract payment information. Please
   try another document." }

4. On success, return { success: true, data: <validated object> }

Missing fields in the LLM response should become null/empty rather than causing
validation failure — the PRD says missing data should stay empty and editable,
not block the whole extraction.
```

---

## Phase 4 — Payment posting form (Screen 3) + wiring

```
Implement components/PaymentForm.tsx using Mantine Form, with sections matching
PRD section 11: Patient Information, Claim Information, Payment Items (repeatable
rows — use Mantine Form's array field support), Payment Summary.

Every field must be editable regardless of whether the AI populated it.

Wire app/page.tsx into the full flow:
- Idle → FileSelected → Processing (call the /api/payments/extract endpoint,
  show the staged messages from PRD Screen 2: "Uploading document...",
  "Extracting text...", "Understanding payment information...",
  "Building structured data...")
- On success, populate PaymentForm with the returned data and show it
- On failure, show the error message and let the user try another file

Add a Save button on the form that just shows a success toast/message
("Payment successfully posted.") — no persistence needed.
```

---

## Phase 5 — Error handling pass + polish

```
Do a pass over the whole flow against PRD section 17 (Error Handling) and section 9
(Non-Functional Requirements):
- Confirm every error path (invalid file type, oversized file, AI failure,
  network failure) shows a friendly message, never a raw stack trace or JSON
- Confirm the whole upload→extract→populate flow completes in under ~10s for a
  typical single-page EOB, and add a loading timeout/fallback message if it runs
  long
- Basic keyboard navigation: tab order through the upload zone and form fields,
  Save button reachable and triggerable via keyboard

Don't add anything not already in the PRD — this is a polish pass, not a
feature pass.
```

---

## Notes for you as reviewer

- After Phase 2, actually inspect the raw extracted text — EOB/ERA PDFs are often
  table-heavy and pdf-parse can mangle column alignment. If it's bad, that's a
  Phase 2 problem, not something to patch with a cleverer LLM prompt in Phase 3.
- After Phase 3, sanity-check the LLM's JSON against 2-3 different real (or
  realistic sample) EOB PDFs, not just the one in the PRD example — CPT
  formatting and layout vary a lot between insurers.
- Phase 4 is the one most likely to balloon in scope (Mantine Form array fields
  for repeatable payment items can get fiddly) — if the agent's first pass is
  overcomplicated, that's a good spot to intervene rather than let it compound.
