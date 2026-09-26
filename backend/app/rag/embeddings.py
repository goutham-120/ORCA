"""Embedding provider for the ORCA RAG pipeline.

Phase 1: Skeleton only — interfaces defined, implementation deferred to Phase 2.

Responsibilities (Phase 2):
- Load a Sentence-Transformers model (default: all-MiniLM-L6-v2)
- Encode a list of strings into dense float vectors
- Cache the model in memory between calls
- Support configurable model name via RAG_EMBEDDING_MODEL
"""
from __future__ import annotations

import logging
from typing import Protocol

logger = logging.getLogger(__name__)

# Default model — lightweight, 384-dim, runs on CPU without GPU.
DEFAULT_EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"


class EmbeddingProvider(Protocol):
    """Minimal interface that any embedding backend must satisfy."""

    def encode(self, texts: list[str]) -> list[list[float]]:
        """Encode texts to dense float vectors.

        Parameters
        ----------
        texts:
            Batch of strings to encode.

        Returns
        -------
        list[list[float]]
            One embedding vector per input string.
        """
        ...


class SentenceTransformerEmbeddings:
    """Sentence-Transformers backed embedding provider.

    Phase 1: Constructor and interface only. ``encode()`` raises NotImplementedError.
    ``sentence-transformers`` is NOT imported at module level so it is safe to
    import this file even when the package is not installed.
    """

    def __init__(self, model_name: str = DEFAULT_EMBEDDING_MODEL) -> None:
        self.model_name = model_name
        self._model = None  # Lazy-loaded in Phase 2

    def encode(self, texts: list[str]) -> list[list[float]]:
        """Encode texts using the configured Sentence-Transformers model.

        Raises
        ------
        NotImplementedError
            Phase 1 stub — full implementation deferred to Phase 2.
        """
        raise NotImplementedError(
            "SentenceTransformerEmbeddings.encode() is not yet implemented. "
            "This will be implemented in RAG Phase 2."
        )
