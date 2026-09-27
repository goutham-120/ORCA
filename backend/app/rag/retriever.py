"""RAG retriever — the runtime query interface for the ORCA pipeline.

Design contract
---------------
- When ``RAG_ENABLED=false``, ``retrieve()`` returns immediately with
  ``RAGResult(used=False, retrieval_status="disabled")``.
- When RAG is enabled:
  - Generates query embedding with proper model prefix ("query: ")
  - Queries persistent ChromaDB vector store
  - Filters by minimum relevance score threshold
  - Returns structured RAGResult with ordered RetrievedChunk instances
- When collection is empty or query fails gracefully, returns appropriate status.
- The existing Ask ORCA pipeline remains unaffected.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.models.rag import RAGResult, RetrievedChunk
from app.rag.config import RAGSettings, get_rag_settings
from app.rag.embeddings import SentenceTransformerEmbeddings
from app.rag.vector_store import ChromaVectorStore

logger = logging.getLogger(__name__)


class RAGRetriever:
    """Runtime retrieval interface for the ORCA RAG pipeline."""

    def __init__(self, settings: RAGSettings | None = None) -> None:
        self._settings = settings or get_rag_settings()
        self._embeddings: SentenceTransformerEmbeddings | None = None
        self._vector_store: ChromaVectorStore | None = None

    def _ensure_initialized(self) -> None:
        """Lazily initialize embeddings model and ChromaDB client."""
        if self._embeddings is None:
            self._embeddings = SentenceTransformerEmbeddings(
                model_name=self._settings.embedding_model
            )
        if self._vector_store is None:
            self._vector_store = ChromaVectorStore(
                persist_directory=self._settings.persist_directory,
                collection_name=self._settings.collection_name,
            )

    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        min_relevance: float | None = None,
        metadata_filter: dict[str, Any] | None = None,
    ) -> RAGResult:
        """Retrieve relevant knowledge chunks for a query.

        When ``RAG_ENABLED=false`` (default), returns immediately with disabled status.

        Parameters
        ----------
        query:
            The user's query string.
        top_k:
            Override maximum number of chunks to return.
        min_relevance:
            Override minimum relevance score threshold (0.0 to 1.0).
        metadata_filter:
            Optional ChromaDB metadata filter.

        Returns
        -------
        RAGResult
            Always returns a valid RAGResult; never raises.
        """
        if not self._settings.enabled:
            return RAGResult(
                used=False,
                query=query,
                retrieved_chunks=[],
                retrieval_status="disabled",
            )

        clean_query = query.strip()
        if not clean_query:
            return RAGResult(
                used=False,
                query=query,
                retrieved_chunks=[],
                retrieval_status="skipped",
            )

        k = top_k if top_k is not None else self._settings.top_k

        # In cloud / memory-constrained environments (e.g. Render 512MB RAM):
        # Use SQLite FTS directly for instant zero-RAM retrieval to prevent OOM kills
        import os
        is_cloud_render = bool(os.getenv("RENDER") or os.getenv("LOW_MEMORY_RAG", "true").lower() in ("1", "true", "yes"))

        if is_cloud_render:
            fts_chunks = self._retrieve_sqlite_fts(clean_query, top_k=k)
            if fts_chunks:
                return RAGResult(
                    used=True,
                    query=query,
                    retrieved_chunks=fts_chunks,
                    retrieval_status="success",
                )
            # CRITICAL: In cloud/Render, NEVER fall through to PyTorch SentenceTransformer
            # PyTorch consumes 600MB+ RAM and triggers Render's 512MB Linux cgroup SIGKILL (502 Bad Gateway)
            logger.info("SQLite FTS returned no chunks for query: %s", clean_query)
            return RAGResult(
                used=False,
                query=query,
                retrieved_chunks=[],
                retrieval_status="skipped",
            )

        try:
            self._ensure_initialized()
            assert self._embeddings is not None
            assert self._vector_store is not None

            # Check if vector store has any indexed data
            if self._vector_store.count() == 0:
                logger.warning("RAG retriever called but vector store collection is empty")
                fts_chunks = self._retrieve_sqlite_fts(clean_query, top_k=k)
                if fts_chunks:
                    return RAGResult(
                        used=True,
                        query=query,
                        retrieved_chunks=fts_chunks,
                        retrieval_status="success",
                    )
                return RAGResult(
                    used=False,
                    query=query,
                    retrieved_chunks=[],
                    retrieval_status="skipped",
                )

            # Generate query embedding
            query_vector = self._embeddings.embed_query(clean_query)

            threshold = (
                min_relevance
                if min_relevance is not None
                else self._settings.min_relevance_score
            )

            # Query ChromaDB
            raw_results = self._vector_store.query(
                query_embedding=query_vector,
                top_k=k,
                where=metadata_filter,
            )

            retrieved_chunks: list[RetrievedChunk] = []
            for item in raw_results:
                score = item.get("similarity", 0.0)
                if score >= threshold:
                    retrieved_chunks.append(
                        RetrievedChunk(
                            id=item["id"],
                            content=item["content"],
                            source=item["source"],
                            document=item["document"],
                            metadata=item["metadata"],
                            relevance_score=round(score, 4),
                        )
                    )

            if not retrieved_chunks:
                # Fallback to SQLite FTS before giving up
                fts_chunks = self._retrieve_sqlite_fts(clean_query, top_k=k)
                if fts_chunks:
                    return RAGResult(
                        used=True,
                        query=query,
                        retrieved_chunks=fts_chunks,
                        retrieval_status="success",
                    )
                logger.debug("No chunks matched min_relevance threshold (%.2f) for query: %s", threshold, clean_query)
                return RAGResult(
                    used=False,
                    query=query,
                    retrieved_chunks=[],
                    retrieval_status="skipped",
                )

            return RAGResult(
                used=True,
                query=query,
                retrieved_chunks=retrieved_chunks,
                retrieval_status="success",
            )

        except Exception as exc:  # noqa: BLE001
            logger.warning("Vector RAG retrieval failed (%s), falling back to SQLite FTS", exc)
            fts_chunks = self._retrieve_sqlite_fts(clean_query, top_k=k)
            if fts_chunks:
                return RAGResult(
                    used=True,
                    query=query,
                    retrieved_chunks=fts_chunks,
                    retrieval_status="success",
                )
            return RAGResult(
                used=False,
                query=query,
                retrieved_chunks=[],
                retrieval_status="error",
                error=str(exc),
            )

    def _find_chroma_db(self) -> Path | None:
        """Find the chroma.sqlite3 database file across various deployment environments."""
        from app.rag.config import _BACKEND_ROOT, _REPO_ROOT

        candidates: list[Path] = []
        if self._settings.persist_directory:
            p = self._settings.persist_directory
            candidates.append(p / "chroma.sqlite3")
            clean_p = Path(str(p).lstrip("/\\"))
            candidates.append(clean_p / "chroma.sqlite3")
            candidates.append(_BACKEND_ROOT / clean_p / "chroma.sqlite3")
            candidates.append(_REPO_ROOT / clean_p / "chroma.sqlite3")

        candidates.extend([
            _BACKEND_ROOT / "data" / "rag" / "chroma" / "chroma.sqlite3",
            _REPO_ROOT / "backend" / "data" / "rag" / "chroma" / "chroma.sqlite3",
            Path.cwd() / "backend" / "data" / "rag" / "chroma" / "chroma.sqlite3",
            Path.cwd() / "data" / "rag" / "chroma" / "chroma.sqlite3",
            Path("/opt/render/project/src/backend/data/rag/chroma/chroma.sqlite3"),
            Path("/opt/render/project/src/data/rag/chroma/chroma.sqlite3"),
        ])

        for c in candidates:
            try:
                if c.exists() and c.is_file():
                    return c
            except Exception:
                pass
        return None

    def _retrieve_sqlite_fts(self, query: str, top_k: int = 5) -> list[RetrievedChunk]:
        """Ultra-fast, zero-RAM full-text search directly against ChromaDB SQLite database.

        Guarantees instant retrieval without loading PyTorch or SentenceTransformers into RAM,
        preventing OOM crashes on free-tier cloud containers (e.g. Render 512MB).
        """
        import re
        import sqlite3

        db_path = self._find_chroma_db()
        if not db_path:
            logger.warning("chroma.sqlite3 not found in any candidate path")
            return []

        words = re.findall(r"\w{2,}", query, flags=re.UNICODE)
        stop = {
            "what", "are", "the", "for", "and", "under", "with", "this", "that",
            "from", "when", "does", "about", "tell", "show", "give", "can", "you",
            "please", "near", "today", "tomorrow", "now", "where", "how", "who",
        }
        fts_reserved = {"and", "or", "not", "near"}
        keywords = [
            w for w in words
            if w.lower() not in stop and w.lower() not in fts_reserved
        ]
        if not keywords:
            keywords = [w for w in words if w.lower() not in fts_reserved]
        if not keywords:
            return []

        # Double-quote each word so FTS5 treats it as a literal token without syntax error
        fts_query = " OR ".join([f'"{k}"' for k in keywords[:10]])

        try:
            conn = sqlite3.connect(str(db_path), timeout=5)
            cur = conn.cursor()
            sql = """
                SELECT fts.rowid, fts.string_value, bm25(embedding_fulltext_search) as rank
                FROM embedding_fulltext_search fts
                WHERE embedding_fulltext_search MATCH ?
                ORDER BY rank
                LIMIT ?;
            """
            cur.execute(sql, (fts_query, top_k))
            rows = cur.fetchall()
            chunks: list[RetrievedChunk] = []
            for row in rows:
                row_id, text, rank = row
                cur.execute(
                    "SELECT key, string_value, int_value FROM embedding_metadata WHERE id = ?;",
                    (row_id,),
                )
                meta = {k: (s if s is not None else i) for k, s, i in cur.fetchall()}
                score = round(abs(1.0 / (1.0 + abs(rank))), 4)
                chunks.append(
                    RetrievedChunk(
                        id=str(row_id),
                        content=text,
                        source=str(meta.get("source", "Government Advisory")),
                        document=str(meta.get("document", "Document")),
                        metadata=meta,
                        relevance_score=score,
                    )
                )
            conn.close()
            return chunks
        except Exception as e:
            logger.warning("SQLite FTS retrieval failed: %s", e)
            return []


# Module-level singleton
_retriever: RAGRetriever | None = None


def get_retriever() -> RAGRetriever:
    """Return the shared RAGRetriever singleton."""
    global _retriever  # noqa: PLW0603
    if _retriever is None:
        _retriever = RAGRetriever()
    return _retriever


def warmup_rag() -> bool:
    """Pre-warm the embedding model and vector store when RAG is enabled.

    Returns True if warm-up completed, False if RAG is disabled or failed gracefully.
    Does not raise exceptions.
    """
    try:
        settings = get_rag_settings()
        if not settings.enabled:
            logger.debug("RAG is disabled; skipping warmup.")
            return False

        import os
        is_cloud_render = bool(os.getenv("RENDER") or os.getenv("LOW_MEMORY_RAG", "true").lower() in ("1", "true", "yes"))
        if is_cloud_render:
            logger.info("Cloud zero-RAM environment detected; skipping PyTorch neural model load to conserve memory.")
            return True

        retriever = get_retriever()
        retriever._ensure_initialized()
        if retriever._embeddings:
            _ = retriever._embeddings.encode_query("orca warmup")
        logger.info("RAG embedding model and vector store warmed up successfully.")
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("RAG warmup skipped due to non-fatal error: %s", exc)
        return False
