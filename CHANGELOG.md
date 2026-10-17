# Changelog

All notable changes to this project will be documented in this file.

The format is based on [keep-a-changelog](https://keepa-changelog.com/), and this project adheres to [semantic versioning](https://semver.org/).

## Unreleased

### 2026-10-15 17:15 - Skeleton verification

- Verified FastAPI backend starts and all endpoints respond correctly:
  - `GET /api/health` returns `{"status":"ok"}`
  - `POST /api/mock-lookup` returns deterministic mock word analysis with surface, lemma, pos, translation, definition, confidence, uncertain, and source fields
  - `POST /api/texts` returns text import confirmation with mock text ID
- Verified SolidJS frontend renders correctly via Vite dev server
- Verified Vite proxy forwards `/api/*` requests to backend at `localhost:8000`
- Confirmed project structure follows all hard constraints:
  - Personal MVP (no auth, single user, no SaaS)
  - Local-first (user texts remain local by default)
  - Development without local LLM (mock mode works without Ollama/llama.cpp)
  - Runtime local LLM optional (config supports mock/disabled/local/cloud modes)
  - Simplicity (one FastAPI backend, one SolidJS frontend, SQLite for data)
  - Frontend rules (SolidJS patterns only, no React hooks or React libraries)
  - Backend rules (FastAPI routers, Pydantic schemas, SQLModel, prompt files in prompts/)
  - Mock LLM mode (deterministic fake responses for development)