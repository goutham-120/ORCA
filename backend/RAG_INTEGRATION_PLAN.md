# ORCA RAG Integration Plan

**Phase 1 — Architecture Audit & Foundation**
**Status:** Complete  
**Branch:** `rag-integration`

---

## A. Existing Architecture Summary

### Request Flow
```
POST /orca/query
  → OrcaOrchestrator.handle()
      → QueryParser.parse()           → ParsedQuery (frozen dataclass)
      → location resolver (geocoder)
      → QueryContext constructed
      → OrcaWorkflow.run(context)     → LangGraph ainvoke
          [context_preparation]       → _prepare()
          [query_understanding]       → _understand()  (no-op currently)
          [planning]                  → _plan()        → QueryPlan
          [agent_execution]           → _execute()     → WeatherAgent, OceanAgent, GISAgent
          [evidence_collection]       → _evidence()    → evidence[]
          [evidence_validation]       → _validate()    (no-op currently)
          [decision]                  → _decision()    → DecisionService
          [grounded_synthesis]        → _synthesize()  → LLM synthesize() or fallback
          [final_response]            → _final()       (no-op currently)
      → assess_results()
      → build_recommendations()
      → synthesize_answer() (deterministic fallback)
      → OrcaQueryResponse constructed
```

### OrcaState (TypedDict, total=False)
```python
class OrcaState(TypedDict, total=False):
    context: QueryContext
    plan: QueryPlan
    selected: list[str]
    agents_used: list[str]
    pending_domains: list[str]
    collected: dict[str, dict]
    analysis_results: dict[str, dict]
    evidence: list[dict]
    answer: str
    llm_mode: str
    decision: dict
    execution_steps: list[dict]
    spatial_data: dict
```

### QueryContext (dataclass)
```python
@dataclass
class QueryContext:
    parsed_query: ParsedQuery
    location: dict | None
    time_range: tuple | None
    metadata: dict
    agent_results: dict
```

### ParsedQuery (frozen dataclass)
```python
@dataclass(frozen=True)
class ParsedQuery:
    original: str
    normalized: str
    intent: str
    requested_domains: list[str]
    requested_location: str | None
    time_expression: str | None
    decision_type: str | None
    perturbations: dict | None
```

### OrcaQueryResponse (Pydantic)
Fields: `query_id`, `answer`, `intent`, `agents_used`, `assessment`,
`recommendations`, `evidence`, `created_at`, `conversation_id`, `language`,
`context`, `pending_domains`, `unavailable_domains`, `response_kind`,
`selected_agents`, `decision`, `execution_steps`, `trace`, `spatial_data`.

### LangGraph Nodes & Edges (current)
```
START -> context_preparation -> query_understanding -> planning
planning -[conditional]-> agent_execution -> evidence_collection
planning -[no_agents]-> evidence_collection
evidence_collection -> evidence_validation -> decision -> grounded_synthesis -> final_response -> END
```

### Evidence Storage
Built in `_evidence()` from `state["collected"]` + GIS results.
Flat `list[dict]` → `OrcaState["evidence"]` → `synthesize()` payload → `OrcaQueryResponse.evidence`.

### Synthesizer Payload
```python
payload = {
    "query": ctx.parsed_query.original,
    "context": ctx.as_dict(),
    "selected_agents": state["selected"],
    "analysis_results": state["analysis_results"],
    "evidence": state["evidence"],
    "decision": state["decision"],
    "unavailable_domains": unavailable,
}
```

### Database / Persistence
- **Primary:** SQLite `backend/orca.db` (custom DB-API class, no ORM)
- **Optional:** PostgreSQL via `psycopg` (`ORCA_DATABASE_URL`)
- **No PostGIS** at application layer (Shapely/GeoPandas handles spatial ops in Python)
- **No SQLAlchemy/Alembic**

### Dependency Management
`requirements.txt` with pinned packages. No pyproject.toml, no uv, no poetry.
Optional `requirements-postgres.txt` for Postgres driver.

### API Routes
| Method | Path | Handler |
|--------|------|---------|
| POST | `/orca/query` | `OrcaOrchestrator.handle()` |
| POST | `/orca/simulate` | `scenario_simulator.simulate()` |
| GET | `/orca/history` | in-memory list |
| POST/GET | `/auth/*` | JWT auth |
| GET/POST | `/map/*` | GIS / spatial features |
| GET | `/coastal/*` | Coastal data |
| GET | `/decisions/*` | Decision service |

---

## B. Files That Will Need Modification for RAG

| File | Change Required |
|------|----------------|
| `backend/app/workflows/orca_graph.py` | Add `rag_retrieval` node + `knowledge_context`/`rag_result` to OrcaState |
| `backend/app/llm/client.py` | Extend `synthesize()` to accept `knowledge_context: str | None` |
| `backend/app/schemas/orca.py` | Add optional `rag_result: dict | None` to `OrcaQueryResponse` |
| `backend/app/core/orchestrator.py` | Forward `rag_result` from workflow state to response |
| `backend/requirements.txt` | Add `chromadb`, `sentence-transformers`, `pypdf` (Phase 2 only) |

---

## C. Files That Should NOT Be Modified

| File | Reason |
|------|--------|
| `backend/app/agents/weather_agent.py` | Explicit constraint |
| `backend/app/agents/ocean_agent.py` | Explicit constraint |
| `backend/app/agents/gis_agent.py` | Explicit constraint |
| `backend/app/core/query_parser.py` | ParsedQuery frozen; no RAG fields needed |
| `backend/app/core/context.py` | QueryContext; RAG injects at workflow level |
| `backend/app/core/conversation.py` | Deterministic fallback; must stay unchanged |
| `backend/app/analysis/safety_index.py` | MSI calculation — explicit constraint |
| `backend/app/analysis/*.py` | All analysis modules — explicit constraint |
| `backend/app/services/data_coordinator.py` | Live data pipeline — explicit constraint |
| `backend/app/services/decision_service.py` | Decision service — explicit constraint |
| `backend/app/database/database.py` | RAG uses ChromaDB, not this DB layer |
| `frontend/**` | No frontend changes in Phase 1 |

---

## D. Proposed RAG Architecture

```
orca-knowledge/
  CMFRI/    INCOIS/    Guidelines/
      |
      | build_knowledge_index.py (offline)
      v
  DocumentLoader -> RawDocument[]
      |
      v
  Chunker -> DocumentChunk[] (512 chars, 64 overlap)
      |
      v
  SentenceTransformerEmbeddings (all-MiniLM-L6-v2) -> float[][]
      |
      v
  ChromaVectorStore.add_chunks()
      |
  backend/data/rag/chroma/  (persisted)
      |
      +------- query at runtime ----------+
                                          |
  OrcaState -> rag_retrieval node         |
    RAGRetrieverTool.run(state)           |
      RAGRetriever.retrieve(query) -------+
        ChromaVectorStore.query() -> top-K chunks
        filter by min_relevance_score
        -> RAGResult
    ContextFusion.fuse(rag_result, analysis_results, evidence)
        -> knowledge_context: str
    OrcaState["knowledge_context"] = knowledge_context
    OrcaState["rag_result"] = rag_result
      |
  grounded_synthesis node
    llm.synthesize(payload + knowledge_context) -> answer
      |
  OrcaQueryResponse + rag_result
```

---

## E. Proposed Data Flow

```
POST /orca/query
  -> OrcaOrchestrator.handle()
     -> QueryContext
     -> OrcaWorkflow.run(context)
         [context_preparation]  (unchanged)
         [query_understanding]  (unchanged)
         [planning]             (unchanged)
         [rag_retrieval]        <- NEW in Phase 2
             RAGRetrieverTool.run(state) -> RAGResult
             ContextFusion.fuse() -> knowledge_context
             state["knowledge_context"] = ...
             state["rag_result"] = ...
         [agent_execution]      (unchanged)
         [evidence_collection]  (unchanged)
         [evidence_validation]  (unchanged)
         [decision]             (unchanged)
         [grounded_synthesis]   (+ inject knowledge_context)
         [final_response]       (unchanged)
     -> OrcaQueryResponse (+ rag_result)
```

---

## F. Proposed State Changes

Two optional fields added to `OrcaState` (non-breaking, `total=False`):

```python
class OrcaState(TypedDict, total=False):
    # ... all existing fields unchanged ...
    knowledge_context: str        # fused RAG context string for Synthesizer
    rag_result: dict[str, Any]    # serialised RAGResult for response
```

---

## G. Proposed Response Schema Changes

One optional field added to `OrcaQueryResponse` (default `None`, non-breaking):

```python
class OrcaQueryResponse(BaseModel):
    # ... all existing fields unchanged ...
    rag_result: dict[str, Any] | None = None
    # Example when RAG disabled:
    # {"used": false, "retrieval_status": "disabled", "retrieved_chunks": []}
```

---

## H. Proposed Vector Database Approach

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Vector DB | ChromaDB (local persistent) | Zero-infra, pure Python, no Docker |
| Persist location | `backend/data/rag/chroma/` | Separate from app DB, gitignored |
| Embedding model | `all-MiniLM-L6-v2` | 384-dim, CPU-only, 80MB, multilingual |
| Chunking | Fixed-size 512 chars, 64 overlap | Simple, consistent, tunable |
| Retrieval | Dense cosine similarity | ChromaDB default |
| Collection | `orca_knowledge` (one collection) | Single collection for prototype |
| Indexing | Offline script only | Keeps API startup fast |
| Runtime | Lazy-load when RAG_ENABLED=true | Zero overhead when disabled |

---

## Files Inspected

`orca_graph.py`, `query_parser.py`, `orchestrator.py`, `conversation.py`,
`context.py`, `gis_agent.py`, `ocean_agent.py`, `weather_agent.py`,
`assess.py`, `safety_index.py`, `client.py` (LLM), `schemas/orca.py`,
`schemas/ai.py`, `models/spatial_feature.py`, `tools/ocean_tools.py`,
`tools/weather_tools.py`, `tools/gis_tools.py`, `database/database.py`,
`config.py`, `api/orca.py`, `requirements.txt`, `requirements-postgres.txt`

---

## Files Created (Phase 1)

| File | Type |
|------|------|
| `backend/app/models/rag.py` | Pydantic: RetrievedChunk, RAGResult |
| `backend/app/rag/__init__.py` | Package init |
| `backend/app/rag/config.py` | RAGSettings + get_rag_settings() |
| `backend/app/rag/document_loader.py` | Skeleton: DocumentLoader, RawDocument |
| `backend/app/rag/chunker.py` | Skeleton: Chunker, DocumentChunk |
| `backend/app/rag/embeddings.py` | Skeleton: EmbeddingProvider, SentenceTransformerEmbeddings |
| `backend/app/rag/vector_store.py` | Skeleton: ChromaVectorStore |
| `backend/app/rag/retriever.py` | RAGRetriever (safe no-op when disabled) |
| `backend/app/rag/context_fusion.py` | Skeleton: ContextFusion |
| `backend/app/tools/rag_retriever.py` | RAGRetrieverTool (LangGraph wrapper) |
| `backend/scripts/build_knowledge_index.py` | Offline index build entry-point |
| `backend/data/rag/chroma/README.md` | Directory placeholder |
| `backend/RAG_INTEGRATION_PLAN.md` | This document |

---

## Files Modified (Phase 1)

**None.** The existing codebase is entirely unmodified.

---

## Dependencies Added (Phase 1)

**None.**

## Dependencies NOT Added (Phase 1, deferred to Phase 2)

| Package | Purpose |
|---------|---------|
| `chromadb>=0.4,<1` | Vector store |
| `sentence-transformers>=2.2,<4` | Embeddings |
| `pypdf>=3.0,<5` | PDF extraction |

---

## Architecture Decisions

1. **RAG_ENABLED=false by default** — explicit opt-in only.
2. **Fail-safe retriever** — always returns valid RAGResult, never raises.
3. **No import-time side effects** — heavy packages lazy-loaded only when enabled.
4. **Separate ChromaDB** — does not touch `orca.db` or Postgres schema.
5. **Offline indexing** — `build_knowledge_index.py` runs once; API never indexes at startup.
6. **Node insertion point** — `rag_retrieval` after `planning`, before `agent_execution`.
7. **Non-breaking schema** — `rag_result: dict | None = None` in `OrcaQueryResponse`.
8. **Single collection** for prototype; domain sharding deferred to Phase 3.

---

## Risks Discovered

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `CMFRI Annual Report 2024.pdf` is 106MB — exceeds GitHub 100MB limit | **High** | Add `orca-knowledge/` large PDFs to `.gitignore`; use Git LFS or keep local-only |
| chromadb + sentence-transformers ~130MB | Medium | Gated behind RAG_ENABLED; not installed in Phase 1 |
| Scanned PDFs produce poor OCR text | Medium | Phase 2 quality filter for low-density chunks |
| Model weights (~80MB) download on first use | Low | Pre-download in build script; cached by HuggingFace |
| Multi-language queries vs English docs | Medium | Phase 2: query in English using normalized intent |
| `query_understanding` and `evidence_validation` nodes are no-ops | Low | RAG does not depend on them |

---

## Commands to Verify Phase 1

```powershell
# 1. Check all new files exist
Get-ChildItem backend\app\rag\
Get-ChildItem backend\app\models\rag.py
Get-ChildItem backend\app\tools\rag_retriever.py
Get-ChildItem backend\scripts\build_knowledge_index.py
Get-ChildItem backend\data\rag\chroma\

# 2. Verify RAG is disabled by default
cd backend
.venv\Scripts\python -c "from app.rag.config import get_rag_settings; s = get_rag_settings(); print('RAG enabled:', s.enabled)"
# Expected: RAG enabled: False

# 3. Verify models import
.venv\Scripts\python -c "from app.models.rag import RAGResult, RetrievedChunk; print(RAGResult())"
# Expected: used=False retrieval_status='disabled' ...

# 4. Verify retriever returns safe no-op
.venv\Scripts\python -c "from app.rag.retriever import get_retriever; r = get_retriever().retrieve('test'); print(r.retrieval_status)"
# Expected: disabled

# 5. Verify build script scaffold
.venv\Scripts\python scripts\build_knowledge_index.py
# Expected: prints message about RAG_ENABLED not being true, exits 1

# 6. Verify FastAPI app imports cleanly (existing behaviour unchanged)
.venv\Scripts\python -c "from app.main import app; print('OK')"
# Expected: OK
```

---

## Next Steps (Phase 2)

1. Install: `chromadb`, `sentence-transformers`, `pypdf` → add to `requirements.txt`
2. Implement `DocumentLoader.load()` (PDF + TXT + MD)
3. Implement `Chunker.chunk()` (fixed-size overlapping)
4. Implement `SentenceTransformerEmbeddings.encode()`
5. Implement `ChromaVectorStore.add_chunks()` and `.query()`
6. Implement `RAGRetriever.retrieve()` (embed → query → filter)
7. Implement `ContextFusion.fuse()`
8. Add `rag_retrieval` node to `OrcaWorkflow.build_langgraph()`
9. Extend `llm.synthesize()` to inject `knowledge_context`
10. Add `rag_result` to `OrcaQueryResponse`
11. Run `build_knowledge_index.py` against `orca-knowledge/`
12. End-to-end test with `RAG_ENABLED=true`

**Do not proceed to Phase 2 until this plan is reviewed and approved.**
