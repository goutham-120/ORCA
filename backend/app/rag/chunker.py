"""Text chunker for the ORCA RAG pipeline.

Phase 1: Skeleton only — interfaces defined, implementation deferred to Phase 2.

Responsibilities (Phase 2):
- Accept a list of RawDocument objects
- Split each document into overlapping fixed-size token/character chunks
- Preserve source + document metadata on every chunk
- Return a list of DocumentChunk objects ready for embedding
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.rag.document_loader import RawDocument

logger = logging.getLogger(__name__)

# Default chunking parameters — will be tunable via env vars in Phase 2.
DEFAULT_CHUNK_SIZE: int = 512       # characters
DEFAULT_CHUNK_OVERLAP: int = 64     # characters


@dataclass
class DocumentChunk:
    """A single chunk produced by the chunker.

    Attributes
    ----------
    chunk_id:
        Globally unique identifier for this chunk (used as ChromaDB doc id).
    content:
        The chunk text.
    source:
        Absolute path (as string) to the source file.
    document:
        Human-readable document title.
    chunk_index:
        Zero-based position of this chunk within the source document.
    metadata:
        Merged metadata (document-level + chunk-level).
    """

    chunk_id: str
    content: str
    source: str
    document: str
    chunk_index: int
    metadata: dict[str, Any] = field(default_factory=dict)


class Chunker:
    """Splits RawDocuments into overlapping DocumentChunks.

    Phase 1: Constructor and interface only. ``chunk()`` raises NotImplementedError.
    """

    def __init__(
        self,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    ) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk(self, documents: list[RawDocument]) -> list[DocumentChunk]:
        """Split documents into chunks.

        Parameters
        ----------
        documents:
            Raw documents returned by DocumentLoader.

        Returns
        -------
        list[DocumentChunk]
            Flat list of all chunks across all documents.

        Raises
        ------
        NotImplementedError
            Phase 1 stub — full implementation deferred to Phase 2.
        """
        raise NotImplementedError(
            "Chunker.chunk() is not yet implemented. "
            "This will be implemented in RAG Phase 2."
        )
