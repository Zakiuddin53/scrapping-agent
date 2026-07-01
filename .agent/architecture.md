# Architecture Decision Record

## Decision: Single Next.js Application Architecture

### Context
The "AI Payment Posting Assistant" is currently being built as a prototype (Phase 1). The goal is to demonstrate that AI can extract structured payment information from insurance payment PDFs and automatically populate a payment posting form.

### Decision
We have decided to build the prototype using a single Next.js application (App Router) instead of adopting a separate backend service (e.g., NestJS). The Next.js Route Handlers will be used for the server-side PDF processing and AI extraction API.

### Rationale
1. **Scope and Timeline**: This is a prototype designed to validate the core AI extraction flow. A single application repository minimizes setup overhead and accelerates iteration.
2. **Simplified Architecture**: By keeping the backend logic (Route Handlers) within the same Next.js app, we avoid CORS issues, separate deployment pipelines, and complex local development setups.
3. **Absence of Complex Backend Requirements**: The application currently intentionally excludes user authentication, user management, database persistence, and complex integrations. A lightweight API route is sufficient for receiving the PDF upload and calling the LLM.
4. **LLM Provider**: The current target for the LLM extraction is OpenAI GPT-4o or Gemini.

### Consequences
- Development is simpler and faster.
- If the application scales significantly in the future or requires complex long-running background jobs, message queues, and a heavy database layer, we might need to decouple the backend into a dedicated service.
