"""Build the ORCA knowledge index for RAG retrieval.

Usage
-----
    # Incremental / standard update:
    python backend/scripts/build_knowledge_index.py

    # Deterministic complete rebuild:
    python backend/scripts/build_knowledge_index.py --rebuild

This script:
1. Discovers and categorizes all documents in orca-knowledge into included, excluded, deferred.
2. Loads clean text from all included documents (PDFs, CSVs, TXT, JSON).
3. Chunks documents intelligently with section/heading awareness and deterministic IDs.
4. Generates dense multilingual embeddings using intfloat/multilingual-e5-small (passage: prefix).
5. Persists chunks, vectors, and metadata in persistent ChromaDB.
6. Saves backend/data/rag/index_manifest.json with complete provenance.
7. Prints a structured indexing summary.
"""
from __future__ import annotations

import argparse
import datetime
import json
import logging
import sys
import time
from pathlib import Path

# Ensure the backend package is importable when run as a script.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.rag.chunker import Chunker, DocumentChunk
from app.rag.config import get_rag_settings
from app.rag.document_loader import DocumentLoader
from app.rag.embeddings import SentenceTransformerEmbeddings
from app.rag.vector_store import ChromaVectorStore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("build_knowledge_index")


def build_index(rebuild: bool = False) -> None:
    settings = get_rag_settings()
    manifest_path = _BACKEND_ROOT / "data" / "rag" / "index_manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("ORCA KNOWLEDGE INDEX BUILDER")
    print("=" * 60)
    print(f"Knowledge root   : {settings.knowledge_path}")
    print(f"Chroma persist   : {settings.persist_directory}")
    print(f"Chroma collection: {settings.collection}")
    print(f"Embedding model  : {settings.embedding_model}")
    print(f"Rebuild mode     : {rebuild}")
    print("=" * 60)

    start_time = time.time()

    # 1. Inspect, classify and load clean documents
    loader = DocumentLoader(knowledge_path=settings.knowledge_path)
    print("\n[1/5] Scanning and loading knowledge sources...")
    load_start = time.time()
    loaded_docs = loader.load()
    manifest_data_raw = loader.manifest_data

    included_entries = manifest_data_raw["included"]
    excluded_entries = manifest_data_raw["excluded"]
    deferred_entries = manifest_data_raw["deferred"]
    total_discovered = manifest_data_raw["statistics"]["total_discovered"]

    print(f"      Scanned knowledge base in {time.time() - load_start:.1f}s:")
    print(f"      Discovered files : {total_discovered}")
    print(f"      Included sources : {len(included_entries)}")
    print(f"      Excluded files   : {len(excluded_entries)}")
    print(f"      Deferred files   : {len(deferred_entries)}")
    print(f"      Loaded documents : {len(loaded_docs)}")

    # 3. Chunk documents
    print("\n[3/5] Chunking documents...")
    chunker = Chunker(chunk_size=1800, chunk_overlap=200)
    all_chunks: list[DocumentChunk] = []
    chunk_counts_by_path: dict[str, int] = {}

    for doc in loaded_docs:
        chunks = chunker.chunk_document(doc)
        all_chunks.extend(chunks)
        chunk_counts_by_path[doc.file_path] = len(chunks)

    print(f"      Generated {len(all_chunks)} chunks across {len(loaded_docs)} documents")

    # Update chunk_count in included manifest entries
    for entry in included_entries:
        fpath = entry.get("file_path", "")
        entry["chunk_count"] = chunk_counts_by_path.get(fpath, 0)

    # 4. Initialize Vector Store & Embeddings
    print(f"\n[4/5] Initializing embeddings ({settings.embedding_model})...")
    embeddings_model = SentenceTransformerEmbeddings(model_name=settings.embedding_model)

    vector_store = ChromaVectorStore(
        persist_directory=settings.persist_directory,
        collection_name=settings.collection,
    )

    if rebuild:
        print("      Rebuilding collection from scratch (--rebuild enabled)...")
        vector_store.reset()

    # 5. Embed and Index into ChromaDB
    print(f"\n[5/5] Encoding and persisting {len(all_chunks)} chunks to ChromaDB...")
    texts_to_embed = [c.content for c in all_chunks]

    embed_start = time.time()
    embeddings = embeddings_model.embed_documents(texts_to_embed, batch_size=64)
    print(f"      Computed {len(embeddings)} embeddings in {time.time() - embed_start:.1f}s")

    added_count = vector_store.add_chunks(all_chunks, embeddings, batch_size=200)
    total_stored = vector_store.count()

    # 6. Save Manifest
    manifest_data = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "knowledge_root": str(settings.knowledge_path),
        "included": included_entries,
        "excluded": excluded_entries,
        "deferred": deferred_entries,
        "statistics": {
            "documents": len(included_entries),
            "chunks": total_stored,
            "documents_discovered": total_discovered,
            "documents_included": len(included_entries),
            "documents_excluded": len(excluded_entries),
            "documents_deferred": len(deferred_entries),
            "chunks_created": len(all_chunks),
            "chunks_indexed": total_stored,
        },
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)
    print(f"\nManifest saved to: {manifest_path}")

    # Summary Output
    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("ORCA KNOWLEDGE INDEX SUMMARY")
    print("=" * 60)
    print(f"Documents discovered: {total_discovered}")
    print(f"Documents included  : {len(included_entries)}")
    print(f"Documents excluded  : {len(excluded_entries)}")
    print(f"Documents deferred  : {len(deferred_entries)}")
    print(f"Chunks created      : {len(all_chunks)}")
    print(f"Chunks indexed      : {total_stored}")
    print(f"Embedding model     : {settings.embedding_model}")
    print(f"Chroma collection   : {settings.collection}")
    print(f"Chroma path         : {settings.persist_directory}")
    print(f"Time elapsed        : {elapsed:.1f}s")
    print("=" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build ORCA ChromaDB Knowledge Index")
    parser.add_argument(
        "--rebuild",
        action="store_true",
        help="Wipe existing ChromaDB collection and rebuild deterministically from scratch",
    )
    args = parser.parse_args()
    build_index(rebuild=args.rebuild)


if __name__ == "__main__":
    main()
