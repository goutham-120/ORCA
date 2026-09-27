"""Pydantic models for the RAG retrieval layer.

These models are purposefully minimal for Phase 1. They will be extended
in Phase 2 when the actual retrieval pipeline is wired into the LangGraph
workflow.
"""
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class RetrievedChunk(BaseModel):
    """A single document chunk returned from the vector store."""

    id: str = Field(description="Unique chunk identifier (ChromaDB document ID).")
    content: str = Field(description="The raw text of the retrieved chunk.")
    source: str = Field(description="Source file path or URL for the chunk.")
    document: str = Field(description="Human-readable document title or filename.")
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional chunk-level metadata (page, section, chunk_index, etc.).",
    )
    relevance_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Cosine-similarity or distance-derived relevance score (higher = more relevant).",
    )


class RAGResult(BaseModel):
    """Result of a single RAG retrieval operation."""

    used: bool = Field(
        default=False,
        description="Whether RAG was actually used for this query (False when RAG_ENABLED=false or no chunks met the threshold).",
    )
    query: str = Field(
        default="",
        description="The query string that was sent to the vector store.",
    )
    retrieved_chunks: list[RetrievedChunk] = Field(
        default_factory=list,
        description="Ordered list of retrieved chunks (highest relevance first).",
    )
    retrieval_status: Literal["success", "skipped", "disabled", "error"] = Field(
        default="disabled",
        description=(
            "Status of the retrieval operation. "
            "'disabled' = RAG_ENABLED=false; "
            "'skipped' = enabled but no chunks above threshold; "
            "'success' = chunks returned; "
            "'error' = retrieval failed."
        ),
    )
    error: str | None = Field(
        default=None,
        description="Error message if retrieval_status is 'error'.",
    )
