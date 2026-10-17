You are a principal software architect, AI systems designer, and language-learning product designer. You also understand second language acquisition, psycholinguistics, contrastive grammar, CEFR, ZPD, scaffolding, and meaningful learning design.

Your task is to plan the full architecture for a personal, local-first language-learning reader application.

Do not write the entire implementation yet. First produce a clear, practical, comprehensive architecture plan.

The plan must be suitable for one amateur developer building the project incrementally.

==================================================
1. PROJECT CONTEXT
==================================================

I want to build a personal language-learning reader app.

The app is inspired by readers such as LingQ, Clozemaster, and open-source language-learning readers, but it should be more pedagogically meaningful.

The main idea is:

- I import or paste a text.
- I read it.
- I click words or highlight multi-word chunks.
- I get meaning, grammar, pragmatics, contrastive notes, or cultural notes.
- I save items to my lexicon or annotation system.
- I practice meaningful activities and some spaced-repetition drills.
- The app tracks lexicon, syntax, pragmatics, exposure, and learning states.
- The app supports meaningful learning, not only rote memorization.

This is a personal project. It is not a startup product. It should remain simple, maintainable, and local-first.

==================================================
2. TARGET STACK
==================================================

Use this stack:

Frontend:
- SolidJS
- TypeScript
- Vite
- Simple CSS or Tailwind if appropriate

Backend:
- Python
- FastAPI
- SQLite
- SQLModel or SQLAlchemy

Runtime AI:
- Local LLM on the user side
- Optional providers: Ollama, llama.cpp server, LM Studio, or OpenAI-compatible local endpoint
- Local LLM is not required for development

NLP:
- spaCy or Stanza for tokenization, lemmatization, POS, morphology
- Dictionary/cache before LLM when possible

Development AI:
- I may use a cloud coding assistant, but local LLMs are not required for development
- The app must run in mock LLM mode during development

==================================================
3. CORE CONSTRAINTS
==================================================

The architecture must respect these constraints:

1. Personal MVP
- One user.
- No authentication required initially.
- No multi-tenant SaaS architecture.
- No complex permissions system.

2. Simplicity
- Do not design microservices.
- Do not add Redis, Celery, Kafka, RabbitMQ, or message queues unless absolutely necessary.
- Do not add Docker unless useful for optional later deployment.
- Prefer one FastAPI backend and one SolidJS frontend.
- Prefer SQLite over PostgreSQL for the MVP.

3. Local-first and private
- User texts and learning data should remain local by default.
- Do not send user texts to cloud services by default.
- Cloud LLM usage must be optional and explicitly disabled by default.

4. Development without local LLM
- The backend must support a mock LLM mode.
- The app must be developable and testable without Ollama or any local model.
- Unit tests should not require a live local LLM.

5. Runtime local LLM is optional but valuable
- The final user-side app may use local LLMs for language tasks.
- LLM output must be validated and treated as unreliable candidate data.
- Dictionary, cache, and NLP pipeline should be used before LLM when possible.

6. Frontend rules
- Use SolidJS patterns, not React patterns.
- Do not use React hooks or React libraries.
- Use SolidJS signals, stores, resources, and components.

7. Backend rules
- Use FastAPI routers.
- Use Pydantic/SQLModel for validation.
- Keep business logic in services.
- Use prompt files for LLM prompts.
- Do not hardcode large prompt strings inside route handlers if avoidable.

==================================================
4. PRODUCT VISION
==================================================

The app should support a rich language-learning workflow:

1. Reading
- Import or paste text.
- Split into sentences and tokens.
- Render clickable words.
- Support multi-word highlighting.
- Show word states: new, learning, known.
- Show annotations: lexical, syntactic, pragmatic, metaphor, discourse.

2. Understanding
- Click a word to get:
  - lemma
  - translation
  - target-language definition
  - example sentence
  - grammar note
  - pragmatics note
  - contrastive note with learner L1
  - register information
  - false-friend warning
  - confidence level

3. Saving
- Save words as lexemes.
- Save multi-word chunks.
- Save grammar observations.
- Save pragmatic notes.
- Save metaphor or cultural notes.

4. Practice
- Cloze deletion.
- Meaning recall.
- Form recall.
- Chunk reconstruction.
- Register transformation.
- Sentence reordering.
- Mediation tasks.
- Retelling from concept maps.
- Optional SRS scheduling.

5. Tracking
- Vocabulary states.
- Lexeme exposure count.
- Grammar exposure count.
- Scaffold level.
- ZPD zone.
- CEFR estimate.
- Error typology.
- L1 interference patterns.
- Reading volume.

6. Meaningful learning
- Prioritize meaningful reading.
- Use comprehensible input ideas.
- Support ZPD-based scaffolding.
- Support fading support over time.
- Support low-stakes mode.
- Avoid overly gamified or pressure-based design.

==================================================
5. PEDAGOGICAL FRAMEWORKS TO SUPPORT
==================================================

The architecture should be able to support these theoretical layers over time:

1. Semantic Fields
- Group vocabulary by semantic domains.
- Show lexical gaps.
- Support semantic clustering, but be careful about interference during drilling.

2. 4E Cognition
- Support embodied, embedded, enacted, and extended cognition.
- Include grounding bundles: image, audio, gesture, sensory notes.
- Support a Metaphor Atlas.
- Support personal corpus as extended memory.

3. Conceptual Maps and Diagrams
- Auto-generate concept maps from texts.
- Support retelling from maps.
- Support personal lexicon graphs.
- Support contrastive concept maps.

4. Social-Bio Linguistic Situations
- Tag texts and utterances with situation metadata:
  - setting
  - participants
  - relationship
  - purpose
  - register
  - norms
  - taboos
  - affect
  - embodiment
- Support register sliders and situational judgment tasks.

5. CEFR Mapping
- Estimate text difficulty.
- Tag words or grammar points with CEFR levels when available.
- Treat CEFR as provisional, not certified.
- Support can-do statements and mediation tasks.

6. Psycholinguistics
- Track exposure counts.
- Use frequency, concreteness, imageability, and learnability scores.
- Support depth-of-processing prompts.
- Prefer retrieval practice and generation.
- Interleave drills while allowing semantic exploration.

7. L1 Interference and Reference
- Track learner L1.
- Support false-friend alerts.
- Support calque detection.
- Support personal error typology:
  - transfer
  - developmental
  - slip
  - pragmatic
- Support contrastive notes.

8. Lexemes and Morphemes
- Distinguish token, wordform, lexeme, and morpheme.
- Track knowledge at the lexeme level.
- Support inflectional paradigms.
- Support derivational families.
- Support morpheme decomposition later.

9. Contrastive Grammar
- Tag grammar points in real sentences.
- Support structured input tasks.
- Support input enhancement.
- Support minimal-pair sentence contrasts.
- Support personal grammar corpus.

10. ZPD and Scaffolding
- Classify content as independent, ZPD, or beyond.
- Implement scaffold levels with fading support.
- Support contingent hints.
- Support dynamic assessment later.

11. Cognitive Functions and L2 Acquisition
- Separate lexical track from grammatical track.
- Vocabulary can use SRS.
- Grammar should rely more on exposure, noticing, structured input, and proceduralization.
- Support automaticity drills later.

12. Neurobiological Bases
- Support spacing.
- Support low-stress design.
- Support affect tagging.
- Avoid neuromyths.
- Do not overclaim brain-based learning.

==================================================
6. REQUIRED ARCHITECTURE DELIVERABLES
==================================================

Produce a comprehensive architecture plan with the following sections:

1. Executive Summary
- Briefly summarize the recommended architecture.
- Explain why it fits a personal, local-first, SolidJS + Python project.

2. Assumptions
- State assumptions about user, hardware, language pair, and local LLM availability.
- If information is missing, make reasonable assumptions and label them.

3. High-Level Architecture
- Provide an ASCII or Mermaid diagram.
- Show frontend, backend, database, NLP pipeline, dictionary/cache, local LLM runner, and prompt system.
- Clearly separate development mode and user runtime mode.

4. Architecture Principles
- Explain the main principles:
  - local-first
  - mock-first development
  - LLM as helper, not truth
  - dictionary/cache before LLM
  - NLP tools for morphology/lemmas
  - meaningful learning over gamification
  - incremental MVP

5. System Modules
Describe the responsibilities of each module:

Frontend modules:
- Reader
- Word popup
- Annotation panel
- Lexicon
- Practice
- Stats
- Settings
- Concept map viewer
- AI panel

Backend modules:
- Text ingestion
- Sentence/token processing
- Lexicon management
- Annotation management
- Practice engine
- SRS engine
- Difficulty estimation
- Prompt management
- LLM client abstraction
- Dictionary/cache service
- Evaluation service

6. Recommended Folder Structure
Provide a practical repository structure for:

- frontend
- backend
- docs
- prompts
- tests
- scripts
- config
- data

Include files for AI restrictions and documentation:
- AGENTS.md
- docs/AI_RULES.md
- docs/DO_NOT_DO.md
- docs/LLM_RUNTIME.md
- docs/PROMPT_LIBRARY.md

7. MVP Scope
Define the smallest useful MVP.

The MVP should include:
- paste/import text
- sentence splitting
- tokenization
- clickable reader
- word lookup
- save word to lexicon
- simple annotation
- simple cloze practice
- simple SRS or review scheduling
- mock LLM mode
- local LLM mode optional

Also define what is explicitly out of scope for MVP.

8. Data Model
Design a SQLite-friendly data model.

Include tables or models for:
- texts
- sentences
- tokens
- lexemes
- wordforms if separate
- vocab_items
- annotations
- grammar_points
- grammar_instances
- practice_cards
- review_logs
- exposure_logs
- error_instances
- situations
- pragmatic_notes
- conceptual_metaphors
- grounding_bundles
- semantic_fields
- field_memberships
- embeddings metadata
- lookup_cache
- settings

For each table:
- list fields
- list important relationships
- explain purpose
- mark MVP vs later

Pay special attention to:
- token vs lexeme
- single-word vs multi-word annotation
- lexical vs grammatical tracking
- scaffold_level
- zone
- exposure_count
- error_type
- L1 contrastive data

9. API Design
Design a simple REST API.

Include endpoints for:
- health
- texts
- text rendering
- lookup
- lexicon
- annotations
- grammar points
- practice sessions
- review logs
- stats
- settings
- AI tasks:
  - grammar explanation
  - pragmatics note
  - register slider
  - concept map
  - CEFR estimation

For each endpoint:
- method
- path
- request body example
- response example
- validation concerns
- fallback behavior if LLM is unavailable

10. Frontend Architecture
Explain how to structure the SolidJS app.

Include:
- pages/routes
- components
- state management approach
- API client
- loading/error states
- token rendering strategy
- highlight/selection strategy
- word popup behavior
- practice session UI
- settings UI

Use SolidJS-specific guidance:
- createSignal
- createStore
- createResource
- createMemo
- For
- Show

Do not use React patterns.

11. Text and NLP Pipeline
Design the text-processing pipeline.

Include:
- raw text normalization
- sentence segmentation
- tokenization
- lemmatization
- POS tagging
- morphological features
- lexeme creation
- exposure logging
- difficulty estimation
- language-specific considerations

Recommend whether to start with:
- simple regex tokenizer
- spaCy
- Stanza

Explain tradeoffs.

12. LLM Runtime Architecture
Design the runtime LLM system.

Important constraints:
- local LLM is for user-side runtime tasks
- development should use mock LLM
- cloud LLM is optional and disabled by default
- LLM output must be validated
- JSON output should be used where possible

Include:
- LLM modes:
  - disabled
  - mock
  - local
  - optional cloud fallback
- provider abstraction:
  - Ollama
  - OpenAI-compatible local endpoint
  - llama.cpp server
- model profiles:
  - fast
  - standard
  - deep
  - embedding
- task routing:
  - lookup
  - grammar
  - pragmatics
  - register slider
  - concept map
  - CEFR estimation
- timeout and retry behavior
- cache behavior
- fallback behavior
- confidence/uncertainty handling

13. Model Recommendation Plan
Recommend local model tiers for runtime.

Include:
- low-resource model
- balanced default model
- high-quality model
- embedding model

Discuss model families such as:
- Qwen
- Llama
- Mistral
- Gemma
- Phi
- DeepSeek

Do not assume the user has powerful hardware. Provide hardware-aware recommendations.

14. Prompt and Guardrail System
Design the prompt system.

Include:
- prompt file organization
- runtime policy
- task-specific prompts
- variable interpolation
- JSON schema validation
- fallback responses
- prompt versioning

Create a recommended prompt file structure:

backend/app/prompts/
- runtime_policy.md
- lookup.md
- grammar.md
- pragmatics.md
- register_slider.md
- concept_map.md
- cefr_estimation.md
- example_generation.md
- mediation_feedback.md

Also define rules for LLM behavior:
- do not invent translations
- do not claim certainty when unsure
- do not present one dialect as universal
- do not use cultural stereotypes
- do not shame the learner
- do not output non-JSON when JSON is requested
- do not ask for personal data
- do not treat CEFR estimates as certified judgments

15. Configuration System
Design configuration using environment variables or settings file.

Include settings for:
- app environment
- database path
- frontend API URL
- LLM mode
- local LLM provider
- Ollama base URL
- model names
- embedding model
- default target language
- learner L1
- learner CEFR self-estimate
- low-stakes mode
- cloud fallback enabled/disabled
- logging level

Provide a sample `.env` file.

16. Development Workflow
Describe how to develop the project without local LLMs.

Include:
- backend setup
- frontend setup
- running in mock mode
- running in local LLM mode
- testing
- linting/formatting
- database migrations or schema initialization
- sample scripts

Example commands:
- install backend dependencies
- install frontend dependencies
- run backend
- run frontend
- run tests
- run LLM evaluation optionally

17. Testing and Evaluation Plan
Design a practical testing strategy.

Include:
- unit tests
- API tests with mock LLM
- optional integration tests for Ollama
- LLM evaluation golden set
- prompt regression tests
- schema validation tests
- frontend component testing if appropriate

Design a small LLM evaluation system:
- test cases in JSONL
- metrics:
  - valid JSON rate
  - lemma accuracy
  - translation plausibility
  - grammar note quality
  - pragmatics quality
  - latency
- manual review workflow

18. Phased Roadmap
Create a phased roadmap.

Phase 0:
- project skeleton
- config
- mock LLM
- health endpoint

Phase 1:
- text import
- tokenization
- reader rendering

Phase 2:
- word lookup
- dictionary/cache
- word popup

Phase 3:
- lexicon saving
- annotations
- multi-word highlights

Phase 4:
- simple practice
- review logs
- basic SRS

Phase 5:
- local LLM integration
- grammar/pragmatics prompts

Phase 6:
- richer pedagogical features:
  - semantic fields
  - concept maps
  - register slider
  - CEFR estimation
  - metaphor atlas
  - error typology

For each phase:
- goal
- main deliverables
- acceptance criteria
- risks

19. Risks and Mitigations
Identify major risks:

- LLM hallucination
- invalid JSON output
- slow local models
- weak multilingual support for some languages
- overengineering
- frontend performance with long texts
- schema instability
- prompt drift
- data loss
- inaccurate CEFR estimates
- dialect bias
- cultural stereotyping
- lack of motivation due to complexity

For each risk, propose mitigation.

20. Decision Log
Provide a decision log with recommendations:

- FastAPI vs alternatives
- SQLite vs PostgreSQL
- SQLModel vs SQLAlchemy
- SolidJS SPA vs SolidStart
- Ollama vs llama.cpp vs LM Studio
- mock LLM design
- dictionary-first strategy
- single-user local-first design
- whether to use Tailwind
- whether to use OpenAPI type generation
- whether to use migrations early

21. Open Questions
List important open questions I should answer before implementation.

Examples:
- target language
- learner L1
- expected hardware
- preferred local LLM provider
- whether EPUB/YouTube import is MVP
- whether audio/TTS is MVP
- whether Anki export is MVP
- whether concept maps are MVP
- whether cloud fallback is ever desired

==================================================
7. IMPORTANT DESIGN RULES
==================================================

Follow these design rules:

1. The app must be usable without AI.
2. The app must be developable without local LLM.
3. LLM features must degrade gracefully.
4. Dictionary/cache/NLP should handle stable facts when possible.
5. LLM should handle explanation, generation, pragmatics, and contextual interpretation.
6. All LLM output must be validated.
7. CEFR estimates must be marked as estimates.
8. Grammar should not be reduced to flashcards only.
9. Vocabulary and grammar should have different learning tracks.
10. The reader must remain pleasant and low-pressure.
11. The architecture must remain understandable for one person.
12. Prefer boring, maintainable technology.
13. Do not create unnecessary abstractions.
14. Do not design for scale unless it does not add complexity.
15. Preserve user privacy.

==================================================
8. OUTPUT FORMAT
==================================================

Return the architecture plan in Markdown.

Use:
- clear headings
- tables where useful
- ASCII diagrams or Mermaid diagrams
- short paragraphs
- practical recommendations
- explicit MVP vs later distinctions

Do not simply list generic advice. Make the plan specific to this project.

If you need to make assumptions, state them clearly.

If critical information is missing, you may ask up to five clarifying questions. Otherwise, proceed with reasonable assumptions.

==================================================
9. FINAL GOAL
==================================================

The final result should be a practical architecture plan that allows one developer to start building immediately, while preserving room for deeper pedagogical features later.

The plan should make it easy to build the first working version:

paste text
→ render clickable words
→ lookup meaning
→ save item
→ practice
→ review
→ return to meaningful reading

and later extend it into:

semantic fields
concept maps
CEFR mapping
ZPD scaffolding
contrastive grammar
L1 interference tracking
pragmatics
metaphor atlas
social-bio situations
psycholinguistic metrics
local AI-powered meaningful activities