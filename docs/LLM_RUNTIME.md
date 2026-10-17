
# LLM Runtime Policy

This document defines how LLMs are used at runtime.

The most important rule is:

> Local LLMs are a runtime feature, not a development requirement.

## LLM Modes

The app supports the following LLM modes:

### `disabled`

No LLM features are used.

The app should remain usable for:

- reading,
- tokenization,
- dictionary lookup if available,
- saving vocabulary,
- basic practice.

### `mock`

Used during development.

Returns deterministic fake responses.

This mode must not require Ollama or any local model.

### `local`

Uses a local LLM on the user side.

Recommended providers:

- Ollama
- llama.cpp server
- LM Studio local server
- OpenAI-compatible local endpoint

### `cloud`

Optional cloud fallback.

Disabled by default.

Must require explicit user opt-in.

## Default Priority

For language tasks, use this priority:

```text
1. Dictionary/cache
2. NLP pipeline, such as spaCy or Stanza
3. Local LLM
4. Optional cloud fallback if explicitly enabled
```

## What Local LLMs May Be Used For

Local LLMs may be used for:

- contextual word lookup,
- translations,
- target-language definitions,
- example sentence generation,
- grammar explanations,
- pragmatics notes,
- register variation,
- contrastive notes,
- CEFR difficulty estimation,
- concept map extraction,
- mediation feedback,
- metaphor explanation,
- meaningful drill generation.

## What Local LLMs Must Not Be Used For

Local LLMs must not be used for:

- deleting user data,
- changing core app configuration,
- making irreversible decisions,
- sending user data to external services,
- certified assessment,
- authoritative cultural judgments,
- bypassing validation rules.

## Validation Rules

All LLM output must be validated.

For JSON responses:

- parse with a strict schema,
- reject missing required fields,
- coerce safely where appropriate,
- fallback gracefully when invalid.

For linguistic output:

- mark uncertainty when confidence is low,
- do not store as authoritative without validation,
- allow user correction,
- prefer dictionary/NLP data for stable facts.

## Fallback Behavior

If the local LLM is unavailable:

- return a degraded but useful response,
- mark the result as uncertain,
- do not crash the reader,
- do not block the UI indefinitely,
- allow the user to continue reading.

Example fallback:

```json
{
  "surface": "gato",
  "lemma": null,
  "translation": null,
  "confidence": "low",
  "uncertain": true,
  "error": "local_llm_unavailable"
}
```

## Privacy Rules

- User texts remain local by default.
- Do not send user texts to cloud services unless explicitly enabled.
- Do not log full user texts unless necessary for debugging.
- Do not include personal data in prompts unless required by the task.
- Do not use telemetry.

## Model Routing

The app should support task-based model routing.

Example:

```text
fast       → simple lookup, short answers
standard   → normal explanations
deep       → grammar, pragmatics, CEFR, concept maps
embedding  → semantic fields, similarity, clustering
```

Example mapping:

```python
TASK_MODEL = {
    "lookup": "fast",
    "translation": "standard",
    "grammar_note": "deep",
    "pragmatics_note": "deep",
    "register_slider": "deep",
    "concept_map": "deep",
    "cefr_estimation": "deep",
    "embedding": "embedding",
}
```

## Prompt Organization

Prompt templates must be stored as files.

Recommended location:

```text
backend/app/prompts/
├── runtime_policy.md
├── lookup.md
├── grammar.md
├── pragmatics.md
├── register_slider.md
├── concept_map.md
├── cefr_estimation.md
└── example_generation.md
```

Do not scatter large prompt strings across backend code.

## Temperature Guidance

Use conservative temperatures for structured tasks.

| Task | Suggested temperature |
|---|---:|
| Word lookup | 0.0–0.2 |
| JSON extraction | 0.0–0.2 |
| Grammar explanation | 0.2–0.4 |
| Example generation | 0.4–0.7 |
| Register slider | 0.3–0.6 |
| Concept map | 0.0–0.3 |
| CEFR estimation | 0.0–0.2 |
| Role-play | 0.6–0.9 |

## Evaluation

LLM behavior should be evaluated with a small golden test set.

Suggested metrics:

- valid JSON rate,
- lemma accuracy,
- translation plausibility,
- grammar note quality,
- pragmatics quality,
- latency,
- fallback rate.

Unit tests should use mock LLM responses.

Integration tests against a live local LLM should be optional and clearly marked.
```

---
