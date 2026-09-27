"""Embedding provider for the ORCA RAG pipeline.

Supports multilingual Sentence-Transformers models with special handling for
asymmetric retrieval models (such as intfloat/multilingual-e5-small) that require
"query: " and "passage: " prefixes.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Protocol

from app.rag.config import DEFAULT_EMBEDDING_MODEL

logger = logging.getLogger(__name__)


class EmbeddingProvider(Protocol):
    """Minimal interface that any embedding backend must satisfy."""

    def encode_documents(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        ...

    def encode_query(self, query: str) -> list[float]:
        ...


class SentenceTransformerEmbeddings:
    """Sentence-Transformers backed embedding provider.

    Configured by default to use `intfloat/multilingual-e5-small` or the model
    specified by the RAG_EMBEDDING_MODEL environment variable.
    Caches loaded model instances at class level to avoid repeated cold-start loading.
    """

    _MODEL_CACHE: dict[str, Any] = {}

    def __init__(self, model_name: str | None = None) -> None:
        self.model_name = (
            model_name
            or os.getenv("RAG_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL).strip()
            or DEFAULT_EMBEDDING_MODEL
        )
        self.is_e5 = "e5" in self.model_name.lower()

    @property
    def model(self):
        """Lazy load the SentenceTransformer model on first use with process-level caching."""
        if self.model_name not in SentenceTransformerEmbeddings._MODEL_CACHE:
            logger.info("Loading embedding model into process cache: %s", self.model_name)
            from sentence_transformers import SentenceTransformer

            SentenceTransformerEmbeddings._MODEL_CACHE[self.model_name] = SentenceTransformer(
                self.model_name
            )
        return SentenceTransformerEmbeddings._MODEL_CACHE[self.model_name]

    def encode_documents(
        self, texts: list[str], batch_size: int = 32, show_progress: bool = False
    ) -> list[list[float]]:
        """Encode documents/passages for indexing.

        For E5 models, each passage is prefixed with 'passage: ' as required by
        the E5 training objective.
        """
        if not texts:
            return []

        formatted = (
            [f"passage: {t}" for t in texts]
            if self.is_e5
            else texts
        )

        embeddings = self.model.encode(
            formatted,
            batch_size=batch_size,
            normalize_embeddings=True,
            show_progress_bar=show_progress,
        )
        return embeddings.tolist()

    def encode_query(self, query: str) -> list[float]:
        """Encode a single query string for vector search.

        For E5 models, the query is prefixed with 'query: ' as required by
        the E5 training objective.
        """
        formatted = f"query: {query}" if self.is_e5 else query
        emb = self.model.encode([formatted], normalize_embeddings=True)[0]
        return emb.tolist()

    def embed_documents(
        self,
        texts: list[str],
        batch_size: int = 32,
        show_progress: bool = False,
    ) -> list[list[float]]:
        """Alias for encode_documents."""
        return self.encode_documents(texts, batch_size=batch_size, show_progress=show_progress)

    def embed_query(self, query: str) -> list[float]:
        """Alias for encode_query."""
        return self.encode_query(query)
