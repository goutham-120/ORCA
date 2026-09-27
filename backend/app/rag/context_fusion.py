"""Context fusion — merges RAG knowledge chunks with live agent evidence.

Maintains strict conceptual and structural separation between:
1. LIVE EVIDENCE (sensor telemetry, real-time forecasts, satellite observations)
2. KNOWLEDGE EVIDENCE (scientific bulletins, statutory regulations, advisory SOPs)
"""
from __future__ import annotations

import logging
from typing import Any

from app.models.rag import RAGResult, RetrievedChunk

logger = logging.getLogger(__name__)


def format_source_citation(meta: dict[str, Any]) -> str:
    """Format a clean, user-facing citation without internal filesystem paths."""
    source = meta.get("source") or "Government Advisory"
    doc = meta.get("document") or "Document"
    page = meta.get("page_number")
    year = meta.get("year")

    page_str = f", p. {page}" if page is not None and str(page) not in ("-1", "None", "") else ""
    year_str = f" ({year})" if year and str(year) not in ("unknown", "None", "") else ""
    return f"{source} — {doc}{year_str}{page_str}"


class ContextFusion:
    """Fuses RAG retrieved chunks with live agent evidence."""

    def fuse(
        self,
        rag_result: RAGResult,
        analysis_results: dict[str, Any] | None = None,
        evidence: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Produce structured evidence separating live telemetry from static knowledge.

        Returns a dictionary containing:
        - 'live_evidence': list of live telemetry/satellite evidence items
        - 'knowledge_evidence': list of retrieved chunk dictionaries
        - 'knowledge_sources': list of unique, concise citation strings
        - 'knowledge_context_text': formatted string for prompt injection
        """
        analysis_results = analysis_results or {}
        live_evidence = evidence or []

        knowledge_evidence: list[dict[str, Any]] = []
        sources: list[str] = []
        seen_sources: set[str] = set()
        context_blocks: list[str] = []

        if rag_result.used and rag_result.retrieved_chunks:
            for idx, chunk in enumerate(rag_result.retrieved_chunks, 1):
                citation = format_source_citation(chunk.metadata)
                if citation not in seen_sources:
                    seen_sources.add(citation)
                    sources.append(citation)

                from app.rag.text_cleaner import clean_pdf_text
                cleaned_content = clean_pdf_text(chunk.content)

                knowledge_evidence.append({
                    "id": chunk.id,
                    "document": chunk.document,
                    "source": chunk.source,
                    "citation": citation,
                    "page_number": chunk.metadata.get("page_number"),
                    "domain": chunk.metadata.get("domain", ""),
                    "topic": chunk.metadata.get("topic", ""),
                    "relevance_score": chunk.relevance_score,
                    "content": cleaned_content,
                })

                context_blocks.append(
                    f"[{idx}] {citation}:\n{cleaned_content}"
                )

        knowledge_context_text = "\n\n".join(context_blocks)

        return {
            "live_evidence": live_evidence,
            "knowledge_evidence": knowledge_evidence,
            "knowledge_sources": sources,
            "knowledge_context_text": knowledge_context_text,
        }
