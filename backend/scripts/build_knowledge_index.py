"""Build the ORCA knowledge index for RAG retrieval.

Phase 1: Skeleton / entry-point scaffold. The actual indexing logic will be
implemented in Phase 2.

Usage (Phase 2)
---------------
    # From the backend/ directory:
    python scripts/build_knowledge_index.py

    # With explicit overrides:
    RAG_KNOWLEDGE_PATH=/path/to/orca-knowledge \\
    RAG_PERSIST_DIRECTORY=./data/rag/chroma \\
    python scripts/build_knowledge_index.py

What this script will do (Phase 2)
-----------------------------------
1. Read RAG configuration from environment variables.
2. Walk the RAG_KNOWLEDGE_PATH directory and load all supported documents
   (PDF, TXT, MD) using DocumentLoader.
3. Split each document into overlapping chunks using Chunker.
4. Encode all chunks with SentenceTransformerEmbeddings.
5. Persist embeddings and metadata into a ChromaDB collection at
   RAG_PERSIST_DIRECTORY.
6. Print a summary: documents loaded, chunks created, time elapsed.

Prerequisites (Phase 2 — not required now)
-------------------------------------------
- chromadb>=0.4
- sentence-transformers>=2.2
- pypdf>=3.0   (for PDF extraction)
"""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure the backend package is importable when run as a script.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))


def main() -> None:
    """Entry point for the knowledge index builder."""
    from app.rag.config import get_rag_settings

    settings = get_rag_settings()

    if not settings.enabled:
        print(
            "[build_knowledge_index] RAG_ENABLED is not set to 'true'.\n"
            "Set RAG_ENABLED=true before running this script."
        )
        sys.exit(1)

    # Phase 2: Replace this block with the actual pipeline.
    print(
        "[build_knowledge_index] Phase 1 scaffold — indexing pipeline not yet implemented.\n"
        f"  knowledge_path     : {settings.knowledge_path}\n"
        f"  persist_directory  : {settings.persist_directory}\n"
        f"  collection         : {settings.collection}\n"
        f"  embedding_model    : {settings.embedding_model or '(default)'}\n"
        f"  top_k              : {settings.top_k}\n"
        f"  min_relevance_score: {settings.min_relevance_score}\n"
        "\nThis script will be implemented in RAG Phase 2."
    )
    sys.exit(0)


if __name__ == "__main__":
    main()
