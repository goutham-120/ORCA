"""Document loader for the ORCA RAG pipeline.

Phase 1: Skeleton only — interfaces defined, implementation deferred to Phase 2.

Responsibilities (Phase 2):
- Walk the orca-knowledge directory tree
- Support PDF, plain-text (.txt), and Markdown (.md) files
- Return a list of raw Document objects with source metadata
- Log skipped / unreadable files without crashing the pipeline
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# File extensions that will be processed in Phase 2.
SUPPORTED_EXTENSIONS: frozenset[str] = frozenset({".pdf", ".txt", ".md"})


@dataclass
class RawDocument:
    """A raw document before chunking.

    Attributes
    ----------
    content:
        Full extracted text of the document.
    source:
        Absolute path (as string) to the source file.
    document:
        Human-readable document title (usually the filename without extension).
    metadata:
        Arbitrary key-value pairs attached at load time (e.g., file size, category).
    """

    content: str
    source: str
    document: str
    metadata: dict[str, Any] = field(default_factory=dict)


class DocumentLoader:
    """Walks a knowledge directory and loads supported documents.

    Phase 1: Constructor and interface only. ``load()`` raises NotImplementedError.
    """

    def __init__(self, knowledge_path: Path) -> None:
        self.knowledge_path = knowledge_path

    def load(self) -> list[RawDocument]:
        """Load all supported documents from the knowledge path.

        Returns
        -------
        list[RawDocument]
            One entry per successfully loaded file.

        Raises
        ------
        NotImplementedError
            Phase 1 stub — full implementation deferred to Phase 2.
        """
        raise NotImplementedError(
            "DocumentLoader.load() is not yet implemented. "
            "This will be implemented in RAG Phase 2."
        )
