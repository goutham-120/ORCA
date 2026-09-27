"""Intelligent text chunker for the ORCA RAG knowledge pipeline.

Splits RawDocuments into semantic chunks (~512 tokens / ~1800 chars) with ~50 tokens
(~150 chars) overlap, preserving section headings, table structure, and page numbers.
Produces deterministic chunk IDs.
"""
from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass, field
from typing import Any

from app.rag.document_loader import RawDocument

logger = logging.getLogger(__name__)

DEFAULT_CHUNK_SIZE: int = 1800      # ~450-512 tokens
DEFAULT_CHUNK_OVERLAP: int = 200    # ~50 tokens
MIN_CHUNK_CHARS: int = 80           # Filter out trivial fragments


@dataclass
class DocumentChunk:
    """A single chunk ready for vector embedding and indexing in ChromaDB."""

    chunk_id: str
    content: str
    source: str
    document: str
    document_type: str
    domain: str
    topic: str
    language: str
    year: str
    region: str
    audience: str
    file_path: str
    page_number: int | None
    chunk_index: int
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def id(self) -> str:
        return self.chunk_id


class Chunker:
    """Intelligently chunks RawDocuments into DocumentChunks."""

    def __init__(
        self,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    ) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk(self, documents: list[RawDocument]) -> list[DocumentChunk]:
        """Process a list of RawDocuments and return DocumentChunks."""
        all_chunks: list[DocumentChunk] = []

        for doc in documents:
            doc_chunks = self.chunk_document(doc)
            all_chunks.extend(doc_chunks)

        logger.info(
            "Chunking complete: %d documents -> %d chunks",
            len(documents),
            len(all_chunks),
        )
        return all_chunks

    def chunk_document(self, doc: RawDocument) -> list[DocumentChunk]:
        """Split a single RawDocument into DocumentChunks."""
        chunks: list[DocumentChunk] = []
        doc_slug = re.sub(r"[^a-zA-Z0-9_]+", "_", doc.file_path).strip("_")

        from app.rag.text_cleaner import clean_pdf_text

        # 1. If document has extracted pages (PDFs)
        if doc.pages:
            chunk_idx = 0
            for page_num, page_text in doc.pages:
                clean_text = clean_pdf_text(page_text)
                if len(clean_text) < MIN_CHUNK_CHARS:
                    continue

                # If page fits in target chunk size, keep it whole
                if len(clean_text) <= self.chunk_size:
                    chunk_text = f"[{doc.document} | Page {page_num}]\n{clean_text}"
                    cid = self._make_chunk_id(doc_slug, f"p{page_num}", chunk_idx, chunk_text)
                    meta = self._build_metadata(doc, page_num, chunk_idx)
                    chunks.append(
                        DocumentChunk(
                            chunk_id=cid,
                            content=chunk_text,
                            source=doc.source,
                            document=doc.document,
                            document_type=doc.document_type,
                            domain=doc.domain,
                            topic=doc.topic,
                            language=doc.language,
                            year=str(doc.year) if doc.year is not None else "unknown",
                            region=doc.region or "unknown",
                            audience=doc.audience or "unknown",
                            file_path=doc.file_path,
                            page_number=page_num,
                            chunk_index=chunk_idx,
                            metadata=meta,
                        )
                    )
                    chunk_idx += 1
                else:
                    # Page is large: split by paragraphs / headings
                    sub_texts = self._split_text(clean_text)
                    for sub in sub_texts:
                        if len(sub) < MIN_CHUNK_CHARS:
                            continue
                        chunk_text = f"[{doc.document} | Page {page_num}]\n{sub}"
                        cid = self._make_chunk_id(doc_slug, f"p{page_num}", chunk_idx, chunk_text)
                        meta = self._build_metadata(doc, page_num, chunk_idx)
                        chunks.append(
                            DocumentChunk(
                                chunk_id=cid,
                                content=chunk_text,
                                source=doc.source,
                                document=doc.document,
                                document_type=doc.document_type,
                                domain=doc.domain,
                                topic=doc.topic,
                                language=doc.language,
                                year=str(doc.year) if doc.year is not None else "unknown",
                                region=doc.region or "unknown",
                                audience=doc.audience or "unknown",
                                file_path=doc.file_path,
                                page_number=page_num,
                                chunk_index=chunk_idx,
                                metadata=meta,
                            )
                        )
                        chunk_idx += 1
            return chunks

        # 2. Text / CSV / JSON without page boundaries
        cleaned_doc_content = clean_pdf_text(doc.content)
        sections = self._split_text(cleaned_doc_content)
        for chunk_idx, sec in enumerate(sections):
            if len(sec.strip()) < MIN_CHUNK_CHARS:
                continue
            chunk_text = f"[{doc.document}]\n{sec.strip()}"
            cid = self._make_chunk_id(doc_slug, "sec", chunk_idx, chunk_text)
            meta = self._build_metadata(doc, None, chunk_idx)
            chunks.append(
                DocumentChunk(
                    chunk_id=cid,
                    content=chunk_text,
                    source=doc.source,
                    document=doc.document,
                    document_type=doc.document_type,
                    domain=doc.domain,
                    topic=doc.topic,
                    language=doc.language,
                    year=str(doc.year) if doc.year is not None else "unknown",
                    region=doc.region or "unknown",
                    audience=doc.audience or "unknown",
                    file_path=doc.file_path,
                    page_number=None,
                    chunk_index=chunk_idx,
                    metadata=meta,
                )
            )

        return chunks

    def _split_text(self, text: str) -> list[str]:
        """Split text at section/paragraph boundaries respecting chunk_size and overlap."""
        # Split primarily by double newlines or markdown dividers
        raw_paras = re.split(r"\n\s*\n|(?=^#{1,3}\s)", text, flags=re.MULTILINE)
        paras = [p.strip() for p in raw_paras if p and p.strip()]

        chunks: list[str] = []
        current_parts: list[str] = []
        current_len = 0

        for p in paras:
            p_len = len(p)
            if current_len + p_len <= self.chunk_size:
                current_parts.append(p)
                current_len += p_len + 2
            else:
                if current_parts:
                    chunk_str = "\n\n".join(current_parts)
                    chunks.append(chunk_str)
                    # Create overlap from end of previous chunk if practical
                    overlap_parts = []
                    overlap_len = 0
                    for op in reversed(current_parts):
                        if overlap_len + len(op) <= self.chunk_overlap:
                            overlap_parts.insert(0, op)
                            overlap_len += len(op)
                        else:
                            break
                    current_parts = overlap_parts
                    current_len = overlap_len

                # If single paragraph exceeds chunk_size, split by sentences
                if p_len > self.chunk_size:
                    sentences = re.split(r"(?<=[.!?])\s+", p)
                    for sent in sentences:
                        if current_len + len(sent) <= self.chunk_size:
                            current_parts.append(sent)
                            current_len += len(sent) + 1
                        else:
                            if current_parts:
                                chunks.append(" ".join(current_parts))
                                current_parts = []
                                current_len = 0
                            current_parts.append(sent)
                            current_len = len(sent)
                else:
                    current_parts.append(p)
                    current_len += p_len + 2

        if current_parts:
            chunks.append("\n\n".join(current_parts))

        return chunks

    def _make_chunk_id(
        self, doc_slug: str, sec_label: str, chunk_idx: int, content: str
    ) -> str:
        """Create a deterministic unique chunk ID based on source, position, and hash."""
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()[:8]
        return f"{doc_slug}_{sec_label}_{chunk_idx:04d}_{content_hash}"

    def _build_metadata(
        self, doc: RawDocument, page_num: int | None, chunk_idx: int
    ) -> dict[str, Any]:
        """Construct a ChromaDB-compatible flat metadata dictionary."""
        return {
            "source": str(doc.source),
            "document": str(doc.document),
            "document_type": str(doc.document_type),
            "domain": str(doc.domain),
            "topic": str(doc.topic),
            "language": str(doc.language),
            "year": str(doc.year) if doc.year is not None else "unknown",
            "region": str(doc.region or "unknown"),
            "audience": str(doc.audience or "unknown"),
            "file_path": str(doc.file_path),
            "page_number": int(page_num) if page_num is not None else -1,
            "chunk_index": int(chunk_idx),
        }
