
# AGENTS.md

You are working on a personal language-learning reader application.

Before making changes, respect this file and the following documents:

- `docs/PEDAGOGY.md`
- `docs/AI_RULES.md`
- `docs/DO_NOT_DO.md`
- `docs/LLM_RUNTIME.md`

## Project Summary

This is a personal, local-first language-learning reader.

The learner can:

- import or paste texts,
- read them,
- click words or highlight multi-word chunks,
- receive contextual meaning, grammar, pragmatics, or contrastive notes,
- save vocabulary and annotations,
- practice meaningful activities,
- review items using spaced repetition where appropriate,
- track lexicon, grammar exposure, pragmatics, and learning progress.

This is not a startup product. It is a personal MVP built by one developer.

## Core Stack

Frontend:

- SolidJS
- TypeScript
- Vite

Backend:

- Python
- FastAPI
- SQLite
- SQLModel or SQLAlchemy

Runtime AI:

- Local LLM on the user side
- Optional provider: Ollama, llama.cpp server, LM Studio, or OpenAI-compatible local endpoint
- Local LLM is not required for development

NLP:

- spaCy or Stanza for tokenization, lemmatization, POS tagging, morphology
- Dictionary/cache before LLM where possible

## Primary Mission

Build a simple, maintainable, pedagogically meaningful language-learning reader.

The app must support this core loop:

```text
read text
→ notice words/chunks/structures
→ understand meaning in context
→ save items/annotations
→ practice meaningfully
→ review with fading support
→ return to meaningful reading
```

## Hard Constraints

### 1. Personal MVP

- One user.
- No authentication required unless explicitly requested.
- No multi-tenant SaaS architecture.
- No roles, permissions, organizations, or billing.
- Keep the system understandable by one developer.

### 2. Local-first

- User texts and learning data remain local by default.
- Do not send user texts to cloud services by default.
- Cloud AI is optional and disabled by default.
- No telemetry or analytics unless explicitly requested.

### 3. Development without local LLM

- The app must run in mock LLM mode during development.
- Do not require Ollama, llama.cpp, LM Studio, or any local model for normal development.
- Unit tests must not depend on a live local LLM.
- Use deterministic mock responses for UI and API development.

### 4. Runtime local LLM is optional

- The final app may use local LLMs for language tasks.
- LLM output must be validated.
- LLM output must be treated as candidate data, not truth.
- The app must remain usable if the local LLM is unavailable.

### 5. Simplicity

- Do not create microservices.
- Do not add Redis, Celery, Kafka, RabbitMQ, or message queues unless explicitly requested.
- Do not add Docker unless explicitly requested.
- Do not add PostgreSQL unless explicitly requested.
- Prefer one FastAPI backend and one SolidJS frontend.
- Prefer SQLite for the MVP.

### 6. Frontend rules

- Use SolidJS patterns only.
- Do not use React patterns.
- Do not use React hooks, React Context, or React libraries.
- Use `createSignal`, `createStore`, `createResource`, `createMemo`, `For`, and `Show`.
- Keep components small and readable.

### 7. Backend rules

- Use FastAPI routers.
- Keep business logic in services.
- Use Pydantic/SQLModel schemas for validation.
- Store prompt templates in files, not hardcoded in route handlers.
- Validate all LLM responses.
- Use timeouts for all external/local LLM calls.
- Provide graceful fallbacks when AI features fail.

## Behavior Expected from AI Assistants

When working on this repository:

- Prefer small, incremental changes.
- Prefer boring, maintainable code.
- Do not rewrite large parts of the app unless explicitly asked.
- Do not add dependencies without explaining why they are necessary.
- Do not introduce infrastructure complexity unless explicitly requested.
- Do not make assumptions about language correctness; mark uncertainty.
- Respect the pedagogical principles in `docs/PEDAGOGY.md`.

## Definition of Done

A change is done only if:

- it works in mock LLM mode,
- it does not require cloud services,
- it does not require a live local LLM during development,
- it preserves existing user data,
- it follows the SolidJS/FastAPI conventions above,
- it does not add unnecessary complexity,
- it respects the pedagogical and privacy rules of the project.
```

---
