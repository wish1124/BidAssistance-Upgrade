# AI API - production foundation

This is the canonical FastAPI entry point for the upgraded AI domain. The
legacy `BE_AI_server` and `chatbot` services remain untouched until consumers
migrate to the versioned endpoints here.

## What is implemented

- `lifespan`-managed model and retrieval initialization
- versioned prediction, retrieval, and analysis endpoints
- Pydantic v2 contracts with a safe, uniform error response
- `/health`, `/ready`, and Prometheus `/metrics`
- request IDs, JSON logs, allow-list CORS, and container build instructions
- BM25 + dense retrieval fused with Reciprocal Rank Fusion (RRF)
- labelled retrieval evaluation with MRR@k and Recall@k

The development backend is deterministic only to make local tests portable.
`AI_API_ENVIRONMENT=production` rejects it and requires the legacy TFT model
artifact plus a sentence-transformer embedding backend.

## Run locally

```bash
cd services/ai_api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 9999
```

Run checks:

```bash
pytest
python -m app.evaluation \
  --corpus data/demo_corpus.jsonl \
  --evaluation data/evaluation.example.jsonl
```

## Production contract

Set `AI_API_ENVIRONMENT=production`, mount model artifacts outside Git, and
inject configuration through the deployment secret store. The API will fail
startup when the model or retrieval corpus cannot load; `/ready` only returns
success after both dependencies are available.

Use an evaluation set made from approved, source-attributed tender documents.
The committed corpus and evaluation set are only executable examples and are
not production procurement advice.
