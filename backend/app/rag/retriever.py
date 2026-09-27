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

        try:
            self._ensure_initialized()
            assert self._embeddings is not None
            assert self._vector_store is not None

            # Check if vector store has any indexed data
            if self._vector_store.count() == 0:
                logger.warning("RAG retriever called but vector store collection is empty")
                return RAGResult(
                    used=False,
                    query=query,
                    retrieved_chunks=[],
                    retrieval_status="skipped",
                )

            # Generate query embedding
            query_vector = self._embeddings.embed_query(clean_query)

            # Determine query parameters
            k = top_k if top_k is not None else self._settings.top_k
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
            logger.error("RAG retrieval failed: %s", exc, exc_info=True)
            return RAGResult(
                used=False,
                query=query,
                retrieved_chunks=[],
                retrieval_status="error",
                error=str(exc),
            )


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
        retriever = get_retriever()
        retriever._ensure_initialized()
        if retriever._embeddings:
            _ = retriever._embeddings.encode_query("orca warmup")
        logger.info("RAG embedding model and vector store warmed up successfully.")
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("RAG warmup skipped due to non-fatal error: %s", exc)
        return False
