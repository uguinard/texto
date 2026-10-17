# AI Coding Rules

These rules apply to any AI assistant helping develop this project.

## General Rules

### Do

- Keep the app simple.
- Keep the app local-first.
- Keep the app developable without local LLMs.
- Prefer incremental changes.
- Prefer explicit types.
- Prefer small functions and clear module boundaries.
- Preserve user data.
- Validate all external data.
- Validate all LLM output.
- Use mock data for development and tests.
- Explain tradeoffs when suggesting a new dependency.

### Do Not

- Do not overengineer.
- Do not create microservices.
- Do not add background queues unless explicitly requested.
- Do not add Docker unless explicitly requested.
- Do not add authentication unless explicitly requested.
- Do not add telemetry, analytics, or tracking.
- Do not send user data to external services by default.
- Do not require cloud AI.
- Do not require local LLMs during development.
- Do not rewrite the app without explicit approval.

## Frontend Rules

### Do

- Use SolidJS.
- Use TypeScript.
- Use Vite.
- Use SolidJS signals and stores.
- Use `createResource` for API fetching.
- Use `For` and `Show` for list/conditional rendering.
- Keep API calls in a small API client layer.
- Keep components focused.

### Do Not

- Do not use React patterns.
- Do not use `useState`, `useEffect`, `useContext`, or other React hooks.
- Do not install React libraries.
- Do not add Redux, Zustand, MobX, Recoil, or other state libraries unless explicitly requested.
- Do not create large global re-renders for small state changes.
- Do not block the reader UI while waiting for slow AI operations.

## Backend Rules

### Do

- Use FastAPI.
- Use routers for endpoints.
- Use services for business logic.
- Use Pydantic schemas for request/response validation.
- Use SQLModel or SQLAlchemy models for database entities.
- Use SQLite for the MVP.
- Use environment variables for configuration.
- Use timeouts for LLM calls.
- Use mock LLM mode during development.
- Return clear JSON errors.

### Do Not

- Do not put all logic in `main.py`.
- Do not hardcode prompts inside route handlers.
- Do not trust LLM output.
- Do not save unvalidated LLM output as authoritative data.
- Do not make Ollama required for basic app usage.
- Do not call cloud LLMs unless explicitly enabled by configuration.
- Do not log full user texts unnecessarily.

## Database Rules

### Do

- Preserve user data.
- Prefer additive schema changes.
- Use clear table names.
- Use foreign keys where appropriate.
- Distinguish tokens, wordforms, lexemes, and annotations.
- Track exposure counts and review logs.
- Make schema changes explicit and reviewable.

### Do Not

- Do not delete user data without explicit confirmation.
- Do not rename critical columns without a migration plan.
- Do not store secrets in the database.
- Do not use raw file copying as the primary backup method for SQLite.
- Do not conflate token count with lexeme knowledge.

## LLM Rules

### Do

- Treat LLM output as unreliable candidate data.
- Validate LLM JSON with Pydantic.
- Use prompt files.
- Use deterministic mock LLM responses during development.
- Use dictionary/cache before LLM where possible.
- Use NLP tools for stable linguistic facts where possible.
- Return uncertainty fields when appropriate.
- Degrade gracefully when the LLM is unavailable.

### Do Not

- Do not require a local LLM for development.
- Do not require a cloud LLM at any point.
- Do not send user texts to cloud services by default.
- Do not present LLM output as certified linguistic truth.
- Do not present CEFR estimates as official judgments.
- Do not allow the LLM to modify core app configuration directly.
- Do not allow the LLM to delete user data.

## Pedagogy Rules

### Do

- Prioritize meaningful learning.
- Support low-stakes practice.
- Support scaffolded learning.
- Distinguish lexical learning from grammatical learning.
- Track exposure, not only mastery.
- Respect learner errors as useful data.
- Support learner autonomy.

### Do Not

- Do not create shame-based correction.
- Do not create guilt-based streak mechanics.
- Do not present one dialect as universal.
- Do not use cultural stereotypes.
- Do not reduce grammar to flashcards only.
- Do not overclaim CEFR levels.
- Do not over-gamify the experience.
```

---