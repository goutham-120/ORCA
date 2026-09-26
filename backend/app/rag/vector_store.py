"""ChromaDB vector store wrapper for the ORCA RAG pipeline.

Phase 1: Skeleton only — interfaces defined, implementation deferred to Phase 2.

Responsibilities (Phase 2):
- Create / open a persistent ChromaDB collection at RAG_PERSIST_DIRECTORY
- Add DocumentChunk objects (text + embeddings + metadata)
- Query by embedding vector and return top-K results with distance scores
- Expose a collection size / health check
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.rag.chunker import DocumentChunk

logger = logging.getLogger(__name__)


class ChromaVectorStore:
    """Wraps a persistent ChromaDB collection.

    Phase 1: Constructor and interface only. All methods raise NotImplementedError.
    ``chromadb`` is NOT imported at module level so it is safe to import this
    file even when the package is not installed.
    """

    def __init__(
        self,
        persist_directory: Path,
        collection_name: str,
    ) -> None:
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self._client = None    # chromadb.Client — lazy-loaded in Phase 2
        self._collection = None  # chromadb.Collection — lazy-loaded in Phase 2

    # ------------------------------------------------------------------
    # Index population (used by build_knowledge_index.py script)
    # ------------------------------------------------------------------

    def add_chunks(self, chunks: list[DocumentChunk], embeddings: list[list[float]]) -> int:
        """Persist chunks and their embeddings into the collection.

        Parameters
        ----------
        chunks:
            Chunked documents with metadata.
        embeddings:
            Pre-computed embedding vectors (one per chunk).

        Returns
        -------
        int
            Number of chunks successfully added.

        Raises
        ------
        NotImplementedError
            Phase 1 stub — full implementation deferred to Phase 2.
        """
        raise NotImplementedError(
            "ChromaVectorStore.add_chunks() is not yet implemented. "
            "This will be implemented in RAG Phase 2."
        )

    # ------------------------------------------------------------------
    # Query
    # ------------------------------------------------------------------

    def query(
        self,
        query_embedding: list[float],
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """Find the top-K most similar chunks for a query embedding.

        Parameters
        ----------
        query_embedding:
            Dense float vector for the query string.
        top_k:
            Maximum number of results to return.

        Returns
        -------
        list[dict]
            Each dict contains: id, content, source, document, metadata, distance.

        Raises
        ------
        NotImplementedError
            Phase 1 stub — full implementation deferred to Phase 2.
        """
        raise NotImplementedError(
            "ChromaVectorStore.query() is not yet implemented. "
            "This will be implemented in RAG Phase 2."
        )

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def count(self) -> int:
        """Return the number of chunks currently stored in the collection.

        Raises
        ------
        NotImplementedError
            Phase 1 stub — full implementation deferred to Phase 2.
        """
        raise NotImplementedError(
            "ChromaVectorStore.count() is not yet implemented. "
            "This will be implemented in RAG Phase 2."
        )
