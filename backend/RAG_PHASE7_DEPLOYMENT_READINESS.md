# ORCA RAG Phase 7 Deployment Readiness

## 1. Executive Summary

**Status: READY WITH CONDITIONS**

The ORCA RAG system implementation is functionally complete, thoroughly tested, and ready for deployment to **Render** (Backend) and **Vercel** (Frontend).

All 240 backend tests pass (1 PostGIS test skipped as per baseline), including all 108 comprehensive RAG tests spanning Phases 3 through 7. The frontend builds cleanly via Vite in under 1 second. Local production simulation confirms sub-second responses for warm knowledge queries (300–325 ms) and seamless fallback behavior.

### Key Deployment Conditions for Teammate
1. **Chroma Vector Store Provisioning:** The 2,541-chunk Chroma index (`chroma.sqlite3`, ~41 MB) is deliberately ignored from Git to prevent repository bloat. It must either be provisioned via a Render Persistent Disk (`/data/rag/chroma`), downloaded as a compressed asset during build, or built during build.
2. **Render RAM Allocation:** `intfloat/multilingual-e5-small` (~470 MB weights) plus Chroma and PyTorch requires approximately **350–500 MB RAM** at runtime. A Render **Starter** instance (512 MB to 1 GB RAM) or higher is strongly recommended over Free Tier to prevent Out-Of-Memory (OOM) killing.
3. **CORS & Environment Coordination:** When the Vercel frontend URL is assigned, it must be added to `ORCA_CORS_ORIGINS` on Render, and `VITE_API_BASE_URL` on Vercel must point to the Render backend domain.

---

## 2. Current Architecture

```
                       ┌─────────────────────────┐
                       │  Vercel Frontend (SPA)  │
                       │   React 19 + Vite 8     │
                       └────────────┬────────────┘
                                    │ HTTPS / WSS
                                    ▼
                       ┌─────────────────────────┐
                       │  Render Backend (API)   │
                       │     FastAPI + Uvicorn   │
                       └────────────┬────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │   LangGraph Workflow    │
                       └──────┬────────────┬─────┘
                              │            │
             ┌────────────────▼──┐      ┌──▼─────────────────────────┐
             │    Live Agents    │      │    RAG Knowledge System    │
             │ Weather / Ocean   │      │                            │
             │ GIS / PFZ / Nav   │      │ 1. Domain Router           │
             └───────────────────┘      │ 2. Multilingual E5 Model   │
                                        │ 3. ChromaDB (2,541 chunks) │
                                        │ 4. Grounded Synthesizer    │
                                        └─────────────┬──────────────┘
                                                      │
                                        ┌─────────────▼──────────────┐
                                        │ LLM / Fallback Synthesizer │
                                        │ Groq (llama-3.3-70b) /     │
                                        │ Grounded Multilingual Det. │
                                        └────────────────────────────┘
```

---

## 3. Backend Deployment Requirements

- **Platform:** Render Web Service (Docker or Native Python Environment).
- **Python Runtime:** Python 3.11, 3.12, 3.13, or 3.14.
- **Dependencies:** Specified in `backend/requirements.txt`.
- **System Memory:** Minimum 512 MB (1 GB recommended for production stability).
- **Disk Storage:** Ephemeral root filesystem with optional Render Disk (1 GB) for Chroma persistence.
- **Port:** Bound dynamically to `$PORT` via Uvicorn.
- **Health Check Endpoint:** `GET /health` (responds with `{"status":"ok"}` in ~35 ms without DB/RAG lock contention).

---

## 4. Frontend Deployment Requirements

- **Platform:** Vercel (Vite Static Build).
- **Node.js Runtime:** Node 18+ or 20+.
- **Build Script:** `npm run build` (`vite build`).
- **Output Directory:** `dist`.
- **Environment Variable:** `VITE_API_BASE_URL` pointing to the Render backend domain.

---

## 5. Complete Environment Variables Matrix

| Variable | Target | Required? | Local Default | Render / Vercel Production | Secret? | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ORCA_ENVIRONMENT` | Backend | No | `development` | `production` | No | Disables debug stack traces & relaxes local auth bypasses |
| `ORCA_APP_NAME` | Backend | No | `"ORCA API"` | `"ORCA API"` | No | Service identifier in `/health` |
| `ORCA_API_PREFIX` | Backend | No | `""` | `""` | No | Prefix for root router routes |
| `ORCA_CORS_ORIGINS` | Backend | **Yes** | `localhost:5173,...` | `https://<your-app>.vercel.app` | No | Allowed CORS origins for browser fetch |
| `ORCA_DATABASE_URL` | Backend | No | *(empty -> SQLite orca.db)* | `postgresql://...` or empty | Yes | Optional PostgreSQL / PostGIS database URL |
| `ORCA_JWT_SECRET` | Backend | **Yes** | `replace_with_...` | `random_32_char_hex_secret` | **Yes** | Secret for signing user authentication JWTs |
| `ORCA_ADMIN_EMAIL` | Backend | No | `admin@orca.gov` | `admin@orca.gov` | No | Default admin account username |
| `ORCA_ADMIN_PASSWORD` | Backend | **Yes** | `AdminPassword123!` | Strong random password | **Yes** | Default admin account password |
| `ORCA_MAP_API_KEY` | Backend | No | `""` | Optional API key | **Yes** | Optional auth key for `/map` endpoints in prod |
| `GROQ_API_KEY` | Backend | No | `""` | `gsk_...` | **Yes** | Groq API Key for Llama-3.3-70B synthesis |
| `ORCA_LLM_API_KEY` | Backend | No | `""` | *(alternative to GROQ_API_KEY)* | **Yes** | OpenAI-compatible LLM endpoint key |
| `ORCA_LLM_BASE_URL` | Backend | No | `https://api.groq.com/openai/v1` | `https://api.groq.com/openai/v1` | No | LLM API endpoint URL |
| `ORCA_LLM_MODEL` | Backend | No | `llama-3.3-70b-versatile` | `llama-3.3-70b-versatile` | No | LLM model identifier |
| `RAG_ENABLED` | Backend | **Yes** | `false` | `true` | No | Master switch for RAG knowledge retrieval |
| `RAG_VECTOR_DB` | Backend | No | `chroma` | `chroma` | No | Vector store backend type |
| `RAG_COLLECTION` | Backend | No | `orca_knowledge` | `orca_knowledge` | No | Chroma collection name |
| `RAG_EMBEDDING_MODEL` | Backend | No | `intfloat/multilingual-e5-small` | `intfloat/multilingual-e5-small` | No | Sentence-transformers embedding model |
| `RAG_TOP_K` | Backend | No | `5` | `5` | No | Maximum retrieved chunks per query |
| `RAG_MIN_RELEVANCE_SCORE`| Backend | No | `0.35` | `0.35` | No | Cosine relevance score cutoff threshold |
| `RAG_PERSIST_DIRECTORY` / `RAG_CHROMA_PERSIST_DIR` | Backend | No | `backend/data/rag/chroma` | `/var/data/chroma` (if disk mounted) | No | Absolute/relative path to Chroma DB directory |
| `RAG_WARMUP_ON_STARTUP` | Backend | No | `false` | `true` (if RAM >= 1GB) | No | Pre-loads embedding model on boot |
| `VITE_API_BASE_URL` | Frontend | **Yes** | `http://127.0.0.1:8000` | `https://<render-service>.onrender.com` | No | Public API endpoint for frontend fetch |
| `VITE_MAP_API_KEY` | Frontend | No | `""` | Optional map key | No | Header key sent with map requests if enforced |

---

## 6. Chroma Deployment Strategy

### Analysis of Storage Options

| Option | Architecture | Feasibility | Render Build Time | Maintenance Cost | Teammate Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Option A: Ingest on Render Build** | Run `python -m app.rag.ingest` during Render build script | ⚠️ High Risk | ~10–15 min build; requires 380 MB source PDFs in repo | Free | **Not Recommended**: Source PDFs are ignored from Git; would exceed Render build timeouts. |
| **Option B: Render Persistent Disk** | Mount 1 GB disk at `/var/data/chroma` and copy index once | ⭐ **Recommended** | < 1 min | $0.25 / GB / month | **Best for Production**: Index survives service restarts and zero cold regeneration. |
| **Option C: External Vector DB** | Migrate to Supabase pgvector or Pinecone | ⚠️ Requires Refactor | N/A | Variable | **Not Recommended for Phase 7**: Breaks Phase 7 rule against modifying RAG architecture. |
| **Option D: Download Prebuilt Tarball on Build** | Download `chroma-index.tar.gz` from S3 / GitHub Release during `render-build.sh` | ⭐ **Recommended for Free Tier** | ~10 seconds download + unpack | $0 (Free) | **Best for Free Tier**: Ephemeral filesystem is populated during Render build step. |

### Concrete Action for Teammate
- **If using Render Paid ($7 Starter + $0.25 Disk):**
  1. Add a Disk in Render service settings mounted at `/var/data/chroma`.
  2. Upload `data/rag/chroma/` files into `/var/data/chroma`.
  3. Set `RAG_CHROMA_PERSIST_DIR=/var/data/chroma`.
- **If using Render Free Tier:**
  1. Compress `backend/data/rag/chroma/` into a release asset or public storage URL:
     `tar -czvf chroma-2541-chunks.tar.gz -C backend/data/rag chroma`
  2. In Render `build.sh`:
     ```bash
     curl -L -o chroma.tar.gz "https://<your-bucket-or-release>/chroma-2541-chunks.tar.gz"
     mkdir -p backend/data/rag
     tar -xzvf chroma.tar.gz -C backend/data/rag
     ```

---

## 7. Embedding Model Strategy

- **Model:** `intfloat/multilingual-e5-small` (~470 MB weights).
- **Download Behavior:** Automatically downloaded by `sentence-transformers` on first invocation into `~/.cache/huggingface/hub/`.
- **Pre-Caching during Render Build:**
  To eliminate first-query download delay, add to Render build command:
  ```bash
  python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small')"
  ```
- **Process Caching:** The application uses a process-level `_MODEL_CACHE` dictionary in `embeddings.py`. Once loaded into RAM, subsequent queries take **~16 ms**.
- **Startup Warmup:**
  - If service has >= 1 GB RAM: Set `RAG_WARMUP_ON_STARTUP=true`. This executes `warmup_rag()` during FastAPI startup, eliminating the cold-start penalty.
  - If service has 512 MB RAM (Free Tier): Set `RAG_WARMUP_ON_STARTUP=false`. RAG will lazy-load on the first knowledge request, allowing the container to boot quickly.

---

## 8. Render Backend Service Configuration

- **Environment:** Python
- **Build Command:**
  ```bash
  pip install --upgrade pip && pip install -r requirements.txt
  ```
- **Start Command:**
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
  ```
  *(Note: Single worker `workers=1` is strongly recommended on Render Starter / Free tier to avoid duplicating the 400 MB embedding model across multiple worker processes).*
- **Health Check Path:** `/health`
- **Auto-Deploy:** Yes (on merge to `integration`).

---

## 9. Vercel Frontend Service Configuration

- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Environment Variables:**
  - `VITE_API_BASE_URL`: `https://<render-service-name>.onrender.com`

---

## 10. CORS Configuration

Backend CORS is configured via `ORCA_CORS_ORIGINS` in `backend/app/config.py`:
```python
origins = os.getenv("ORCA_CORS_ORIGINS", "")
cors_origins = [origin.strip() for origin in origins.split(",") if origin.strip()]
```
### Required Step on Deployment
Once Vercel deploys the frontend and generates a domain (e.g., `https://orca-frontend.vercel.app`), update Render environment variables:
```env
ORCA_CORS_ORIGINS=https://orca-frontend.vercel.app,http://localhost:5173
```
*Note: Because `allow_credentials=True` is enabled for JWT session cookie support, browser security standards forbid `*` (wildcard) origins. Exact origin domains must be specified.*

---

## 11. Local Production Simulation Results

Simulated on local runtime using production endpoints and production headers:

| Test Scenario | Query | Query Mode | Response Latency | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Health Check** | `GET /health` | System | **37.8 ms** | `status: "ok"` |
| **Cold Knowledge Query** | "What environmental conditions affect Indian mackerel?" | `knowledge_only` | **15,600.2 ms** (Cold model load) | Synthesized CMFRI answer, zero live agents |
| **Warm Knowledge Query 1**| "What are the 2026 fishing ban dates?" | `knowledge_only` | **324.7 ms** | Structured Gazette ban table, no live assessment |
| **Warm Knowledge Query 2**| "What should fishermen do during distress?" | `knowledge_only` | **321.1 ms** | Numbered Coast Guard NMSAR steps |
| **Live Operational Query** | "What are today's PFZs?" | `live_operational` | **1,902.1 ms** | Live INCOIS GIS check, map follow-up |
| **Hybrid Query** | "What is PFZ advisory and where are today's PFZs?"| `hybrid` | **1,831.8 ms** | INCOIS definition + live PFZ coordinates |
| **Multilingual Telugu (Knowledge)**| "భారతీయ మాకెరెల్ చేపలను..." | `knowledge_only` | **306.7 ms** | Native structured Telugu markdown |
| **Multilingual Telugu (Live)**| "ఈరోజు PFZలు ఎక్కడ ఉన్నాయి?" | `live_operational` | **1,889.7 ms** | Live operational Telugu response |
| **Multilingual Hindi (Knowledge)**| "भारतीय मैकेरल मछली को..." | `knowledge_only` | **296.1 ms** | Native structured Hindi markdown |
| **Out-of-Domain Query** | "What is the capital of France?" | `live_operational` | **285.4 ms** | Clean marine domain restriction, no RAG |

---

## 12. RAG Validation Results

All 10 user flows required by Phase 7 were tested and confirmed:
1. **Mackerel Biology:** Synthesizes CMFRI evidence (SST 27–29.5°C, Salinity 32–35 PSU, Upwelling, Plankton, Dissolved Oxygen) with no fake live risk score.
2. **2026 Ban Dates:** Produces clean statutory table (East Coast: 15 Apr – 14 Jun; West Coast: 1 Jun – 31 Jul) with traditional non-motorized exemptions.
3. **Marine Distress Safety:** Actionable numbered steps (VHF Ch 16, MAYDAY, EPIRB, SART, Life jackets) from Coast Guard NMSAR.
4. **Live PFZs:** Routes to `live_operational`, invokes GISAgent, provides live marine spatial assessment.
5. **Hybrid PFZ:** Clearly separates INCOIS scientific background from current live spatial coordinates.
6. **Telugu Knowledge:** Answers fully in structured Telugu without exposing English document chunks or section numbers.
7. **Telugu Live PFZ:** Answers in Telugu with real-time operational assessment.
8. **Hindi Knowledge:** Answers fully in structured Hindi with CMFRI attribution.
9. **Out-of-Domain:** Rejects general non-marine questions without retrieving irrelevant marine chunks.
10. **Degraded Mode:** When `RAG_ENABLED=false` or vector database is offline, operational marine agents continue functioning with zero pipeline crashes.

---

## 13. Security Audit Findings

| Category | Status | Finding | Action / Mitigation |
| :--- | :--- | :--- | :--- |
| **Git & Secrets Tracking** | **PASS** | `.env`, `.env.*`, `chroma.sqlite3`, and `orca-knowledge/` are verified in `.gitignore`. No real keys exist in repository history. | Maintained. Teammate must not commit production `.env`. |
| **Prompt Injection via Knowledge** | **PASS** | Evaluated via `test_prompt_injection_in_retrieved_chunk_is_neutralized`. Adversarial text in documents is treated strictly as passive context. | Protected by synthesizer prompt constraints. |
| **Internal Metadata Leakage** | **PASS** | Section numbers (`74 6.4.3`), `--- PAGE ---` markers, relevance scores (`0.85`), and chunk UUIDs are stripped before user presentation. | Cleaned by `text_cleaner.py` and `knowledge_synthesizer.py`. |
| **Production CORS** | **WARNING** | Default CORS allows `localhost`. Render requires explicit Vercel URL. | **ACTION REQUIRED**: Configure `ORCA_CORS_ORIGINS` on Render. |
| **JWT Secret Strength** | **WARNING** | Default `ORCA_JWT_SECRET` is placeholder string. | **ACTION REQUIRED**: Provide high-entropy 32+ character secret on Render. |

---

## 14. Key Deployment Risks & Mitigations

1. **Render Free-Tier RAM Spike (OOM Risk):**
   - *Risk:* 512 MB Free Tier instance may crash if PyTorch, SentenceTransformers, and Uvicorn exceed memory.
   - *Mitigation:* Use Render Starter plan (1 GB RAM, $7/mo), set `workers=1`, and leave `RAG_WARMUP_ON_STARTUP=false` if on Free Tier.
2. **Ephemeral Disk Wipe on Restart:**
   - *Risk:* If Chroma files are created in the container root, they disappear when Render restarts.
   - *Mitigation:* Mount a Render Disk at `/var/data/chroma`, or unpack prebuilt `chroma.tar.gz` during `render-build.sh`.
3. **Cold-Start Request Timeout:**
   - *Risk:* First RAG request takes ~15 seconds to download/load the E5 model, which may cause browser fetch timeout.
   - *Mitigation:* Pre-cache model in the build step via `python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small')"`.

---

## 15. Teammate Handoff Checklist

```markdown
### Pre-Merge
- [ ] Review git status on `rag-integration` (clean working tree).
- [ ] Merge `rag-integration` into `integration` branch.
- [ ] Confirm no `.env` or `chroma.sqlite3` files were committed to git.

### Render Backend Setup
- [ ] Create Render Web Service connected to `integration` branch (Root directory: `backend`).
- [ ] Set Environment to Python 3.11+.
- [ ] Set Build Command: `pip install -r requirements.txt`.
- [ ] Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`.
- [ ] Configure Environment Variables on Render:
      - `ORCA_ENVIRONMENT=production`
      - `ORCA_JWT_SECRET=<generate-random-32-char-string>`
      - `ORCA_ADMIN_PASSWORD=<generate-strong-password>`
      - `GROQ_API_KEY=<your-groq-key>`
      - `RAG_ENABLED=true`
      - `RAG_PERSIST_DIRECTORY=data/rag/chroma` (or mounted disk path)
- [ ] Provide Chroma index:
      - Option A: Provision Render Disk and copy `backend/data/rag/chroma/` contents.
      - Option B: Download and unpack prebuilt `chroma.tar.gz` in build command.
- [ ] Deploy backend and verify `GET https://<render-url>/health` returns `{"status":"ok"}`.

### Vercel Frontend Setup
- [ ] Create Vercel project connected to `integration` branch (Root directory: `frontend`).
- [ ] Set Framework Preset to `Vite`.
- [ ] Set Environment Variable:
      - `VITE_API_BASE_URL=https://<your-render-url>.onrender.com`
- [ ] Deploy frontend.

### Post-Deployment Verification
- [ ] Update Render `ORCA_CORS_ORIGINS=https://<your-vercel-domain>.vercel.app`.
- [ ] Test English Knowledge: "What environmental conditions affect Indian mackerel?"
- [ ] Test Regulations: "What are the 2026 fishing ban dates?"
- [ ] Test Telugu Knowledge: "భారతీయ మాకెరెల్ చేపలను ప్రభావితం చేసే పర్యావరణ పరిస్థితులు ఏమిటి?"
- [ ] Test Live PFZ: "What are today's PFZs?"
- [ ] Test Hybrid Query: "What is a PFZ advisory and where are today's PFZs?"
```
