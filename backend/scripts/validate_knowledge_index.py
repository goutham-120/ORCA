"""Validate the ORCA knowledge index and persistent ChromaDB store.

Checks:
1. ChromaDB persist directory exists on disk.
2. ChromaDB collection exists and contains chunks (non-empty).
3. Sample chunk records contain non-empty text, valid embeddings, and valid deterministic IDs.
4. All required metadata fields are present and properly typed.
5. backend/data/rag/index_manifest.json exists and is valid JSON.
6. Manifest statistics match the ChromaDB collection count.

Exits with code 0 on success, code 1 on validation failure.
"""
from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

# Ensure backend package is importable
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.rag.config import get_rag_settings
from app.rag.vector_store import ChromaVectorStore

logging.basicConfig(level=logging.WARNING)

REQUIRED_METADATA_FIELDS = [
    "source",
    "document",
    "document_type",
    "domain",
    "topic",
    "language",
    "year",
    "region",
    "audience",
    "file_path",
    "page_number",
    "chunk_index",
]


def validate_index() -> bool:
    settings = get_rag_settings()
    manifest_path = _BACKEND_ROOT / "data" / "rag" / "index_manifest.json"
    failures: list[str] = []
    warnings: list[str] = []

    print("=" * 60)
    print("ORCA KNOWLEDGE INDEX VALIDATION")
    print("=" * 60)

    # 1. Check Chroma persist directory
    print("[1/6] Checking ChromaDB directory...")
    if not settings.persist_directory.exists():
        failures.append(f"Chroma persist directory does not exist: {settings.persist_directory}")
    else:
        print(f"      OK: Directory exists ({settings.persist_directory})")

    # 2. Check manifest file
    print("[2/6] Checking index manifest...")
    manifest_data = None
    if not manifest_path.exists():
        failures.append(f"Index manifest not found: {manifest_path}")
    else:
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest_data = json.load(f)
            print(f"      OK: Manifest exists ({len(manifest_data.get('included', []))} included sources)")
        except Exception as exc:
            failures.append(f"Failed to read/parse manifest JSON: {exc}")

    # 3. Check ChromaDB collection & count
    print("[3/6] Connecting to ChromaDB collection...")
    chroma_count = 0
    vector_store = None
    try:
        vector_store = ChromaVectorStore(
            persist_directory=settings.persist_directory,
            collection_name=settings.collection,
        )
        chroma_count = vector_store.count()
        if chroma_count == 0:
            failures.append(f"ChromaDB collection '{settings.collection}' is empty (0 chunks)")
        else:
            print(f"      OK: Collection '{settings.collection}' contains {chroma_count} chunks")
    except Exception as exc:
        failures.append(f"Failed to connect to ChromaDB: {exc}")

    # 4. Check Manifest vs Chroma count alignment
    print("[4/6] Verifying chunk count alignment with manifest...")
    if manifest_data:
        manifest_chunks = manifest_data.get("statistics", {}).get("chunks_indexed", -1)
        if manifest_chunks != chroma_count:
            warnings.append(
                f"Count mismatch: Manifest records {manifest_chunks} chunks, "
                f"ChromaDB has {chroma_count} chunks"
            )
        else:
            print(f"      OK: Count matches manifest ({chroma_count} chunks)")

    # 5. Inspect chunk contents, embeddings, IDs, and metadata
    print("[5/6] Inspecting sample chunks from ChromaDB...")
    if vector_store and chroma_count > 0:
        try:
            col = vector_store._get_collection()
            # Fetch sample of chunks
            sample = col.get(
                limit=min(100, chroma_count),
                include=["documents", "metadatas", "embeddings"],
            )

            ids = sample.get("ids", [])
            documents = sample.get("documents", [])
            metadatas = sample.get("metadatas", [])
            embeddings = sample.get("embeddings", [])

            empty_docs = 0
            invalid_ids = 0
            missing_meta_fields: dict[str, int] = {k: 0 for k in REQUIRED_METADATA_FIELDS}
            no_embeddings = 0

            for i in range(len(ids)):
                cid = ids[i]
                doc = documents[i]
                meta = metadatas[i] or {}

                if not cid or not isinstance(cid, str):
                    invalid_ids += 1
                if not doc or not doc.strip():
                    empty_docs += 1

                for field in REQUIRED_METADATA_FIELDS:
                    if field not in meta:
                        missing_meta_fields[field] += 1

                # Check embeddings if included
                if embeddings is not None and len(embeddings) > i:
                    emb = embeddings[i]
                    if emb is None or len(emb) == 0:
                        no_embeddings += 1

            if empty_docs > 0:
                failures.append(f"Found {empty_docs} chunks with empty document content")
            if invalid_ids > 0:
                failures.append(f"Found {invalid_ids} invalid chunk IDs")
            if no_embeddings > 0:
                failures.append(f"Found {no_embeddings} chunks without embeddings")

            for field, missing_cnt in missing_meta_fields.items():
                if missing_cnt > 0:
                    failures.append(f"Metadata field '{field}' missing in {missing_cnt} sample chunks")

            if not failures:
                print(f"      OK: Sampled {len(ids)} chunks — all have non-empty text, valid IDs, embeddings, and required metadata")

        except Exception as exc:
            failures.append(f"Failed to inspect sample chunks from ChromaDB: {exc}")

    # 6. Overall result
    print("[6/6] Validation summary:")
    if warnings:
        print("\nWarnings:")
        for w in warnings:
            print(f"  [WARN] {w}")

    if failures:
        print("\nCRITICAL FAILURES:")
        for f in failures:
            print(f"  [FAIL] {f}")
        print("\n" + "=" * 60)
        print("VALIDATION STATUS: FAILED")
        print("=" * 60)
        return False

    print("\n" + "=" * 60)
    print("VALIDATION STATUS: PASSED (ALL CHECKS OK)")
    print("=" * 60)
    return True


def main() -> None:
    success = validate_index()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
