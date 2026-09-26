"""RAG configuration — reads all RAG-related environment variables.

All settings default to safe values that keep the system fully operational
when RAG_ENABLED=false (the default). No RAG packages are imported here;
this module has zero external dependencies beyond the standard library.

Environment Variables
---------------------
RAG_ENABLED
    Master switch. Must be explicitly set to "true" to activate RAG.
    Default: false

RAG_VECTOR_DB
    Vector database backend to use.
    Currently only "chroma" is supported.
    Default: chroma

RAG_COLLECTION
    Name of the ChromaDB collection that stores ORCA knowledge chunks.
    Default: orca_knowledge

RAG_EMBEDDING_MODEL
    Sentence-Transformers model name used to encode queries and chunks.
    Leave empty to use the default defined in embeddings.py.
    Default: "" (empty → embeddings.py picks the default)

RAG_TOP_K
    Maximum number of chunks to retrieve per query.
    Default: 5

RAG_MIN_RELEVANCE_SCORE
    Minimum cosine similarity threshold (0.0–1.0) for a chunk to be included.
    Chunks below this score are dropped.
    Default: 0.35

RAG_KNOWLEDGE_PATH
    Absolute path to the root directory containing source documents.
    Default: <repo_root>/orca-knowledge

RAG_PERSIST_DIRECTORY
    Absolute path where ChromaDB persists its data on disk.
    Default: <repo_root>/backend/data/rag/chroma
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# Repo root is two levels above this file:  backend/app/rag/config.py
_REPO_ROOT = Path(__file__).resolve().parents[4]
_BACKEND_ROOT = Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class RAGSettings:
    enabled: bool = False
    vector_db: str = "chroma"
    collection: str = "orca_knowledge"
    embedding_model: str = ""
    top_k: int = 5
    min_relevance_score: float = 0.35
    knowledge_path: Path = field(default_factory=lambda: _REPO_ROOT / "orca-knowledge")
    persist_directory: Path = field(
        default_factory=lambda: _BACKEND_ROOT / "data" / "rag" / "chroma"
    )


def get_rag_settings() -> RAGSettings:
    """Read RAG configuration from environment variables.

    Safe to call at import time; never raises.
    """
    enabled_raw = os.getenv("RAG_ENABLED", "false").strip().lower()
    enabled = enabled_raw in {"1", "true", "yes", "on"}

    top_k_raw = os.getenv("RAG_TOP_K", "5")
    try:
        top_k = max(1, int(top_k_raw))
    except ValueError:
        top_k = 5

    score_raw = os.getenv("RAG_MIN_RELEVANCE_SCORE", "0.35")
    try:
        min_score = float(score_raw)
        min_score = max(0.0, min(1.0, min_score))
    except ValueError:
        min_score = 0.35

    knowledge_path_raw = os.getenv("RAG_KNOWLEDGE_PATH", "")
    knowledge_path = (
        Path(knowledge_path_raw) if knowledge_path_raw else _REPO_ROOT / "orca-knowledge"
    )

    persist_dir_raw = os.getenv("RAG_PERSIST_DIRECTORY", "")
    persist_directory = (
        Path(persist_dir_raw)
        if persist_dir_raw
        else _BACKEND_ROOT / "data" / "rag" / "chroma"
    )

    return RAGSettings(
        enabled=enabled,
        vector_db=os.getenv("RAG_VECTOR_DB", "chroma").strip().lower(),
        collection=os.getenv("RAG_COLLECTION", "orca_knowledge").strip(),
        embedding_model=os.getenv("RAG_EMBEDDING_MODEL", "").strip(),
        top_k=top_k,
        min_relevance_score=min_score,
        knowledge_path=knowledge_path,
        persist_directory=persist_directory,
    )
