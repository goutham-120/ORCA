"""ChromaDB vector store wrapper for the ORCA RAG pipeline.

Responsibilities:
- Create / open a persistent ChromaDB collection at RAG_PERSIST_DIRECTORY
- Add / upsert DocumentChunk objects (text + embeddings + metadata) in batches
- Query by embedding vector and return top-K results with distance scores
- Expose collection size, count, reset, and health checks
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.rag.chunker import DocumentChunk

logger = logging.getLogger(__name__)


class ChromaVectorStore:
    """Wraps a persistent ChromaDB collection for ORCA knowledge chunks."""

    def __init__(
        self,
        persist_directory: Path,
        collection_name: str = "orca_knowledge",
    ) -> None:
        self.persist_directory = Path(persist_directory)
        self.collection_name = collection_name
        self._client: Any = None
        self._collection: Any = None

    def _get_client(self) -> Any:
        if self._client is None:
            import chromadb

            self.persist_directory.mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(path=str(self.persist_directory))
            logger.info(
                "Initialized ChromaDB persistent client at %s", self.persist_directory
            )
        return self._client

    def _get_collection(self) -> Any:
        if self._collection is None:
            client = self._get_client()
            self._collection = client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    # ------------------------------------------------------------------
    # Index population
    # ------------------------------------------------------------------

    def add_chunks(
        self,
        chunks: list[DocumentChunk],
        embeddings: list[list[float]],
        batch_size: int = 200,
    ) -> int:
        """Persist chunks and their embeddings into the collection using upsert.

        Parameters
        ----------
        chunks:
            Chunked documents with metadata.
        embeddings:
            Pre-computed embedding vectors (one per chunk).
        batch_size:
            Batch size for vector store insertion to avoid memory/API limits.

        Returns
        -------
        int
            Number of chunks successfully added.
        """
        if not chunks:
            return 0
        if len(chunks) != len(embeddings):
            raise ValueError(
                f"Chunk count ({len(chunks)}) does not match embeddings count ({len(embeddings)})"
            )

        collection = self._get_collection()
        total = len(chunks)
        added = 0

        for start_idx in range(0, total, batch_size):
            end_idx = min(start_idx + batch_size, total)
            batch_chunks = chunks[start_idx:end_idx]
            batch_embeddings = embeddings[start_idx:end_idx]

            ids = [c.id for c in batch_chunks]
            documents = [c.content for c in batch_chunks]
            metadatas = []
            for c in batch_chunks:
                # Ensure all metadata values are primitive types (str, int, float, bool)
                clean_meta: dict[str, str | int | float | bool] = {}
                for k, v in c.metadata.items():
                    if v is None:
                        clean_meta[k] = ""
                    elif isinstance(v, (str, int, float, bool)):
                        clean_meta[k] = v
                    else:
                        clean_meta[k] = str(v)
                metadatas.append(clean_meta)

            collection.upsert(
                ids=ids,
                documents=documents,
                embeddings=batch_embeddings,
                metadatas=metadatas,
            )
            added += len(batch_chunks)
            logger.debug("Indexed batch %d-%d / %d into %s", start_idx, end_idx, total, self.collection_name)

        logger.info("Successfully added/upserted %d chunks into %s", added, self.collection_name)
        return added

    # ------------------------------------------------------------------
    # Query
    # ------------------------------------------------------------------

    def query(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        where: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Find the top-K most similar chunks for a query embedding.

        Parameters
        ----------
        query_embedding:
            Dense float vector for the query string.
        top_k:
            Maximum number of results to return.
        where:
            Optional metadata filter dict for ChromaDB.

        Returns
        -------
        list[dict]
            Each dict contains: id, content, source, document, metadata, distance, similarity.
        """
        collection = self._get_collection()
        query_kwargs: dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": top_k,
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            query_kwargs["where"] = where

        results = collection.query(**query_kwargs)

        items: list[dict[str, Any]] = []
        ids = results.get("ids", [[]])[0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for chunk_id, content, meta, dist in zip(ids, documents, metadatas, distances):
            # With cosine distance: similarity = 1 - distance
            similarity = max(0.0, min(1.0, 1.0 - float(dist)))
            source = meta.get("file_path") or meta.get("source", "")
            doc_title = meta.get("document", "")

            items.append({
                "id": chunk_id,
                "content": content,
                "source": source,
                "document": doc_title,
                "metadata": meta,
                "distance": float(dist),
                "similarity": similarity,
            })

        return items

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def count(self) -> int:
        """Return the number of chunks currently stored in the collection."""
        try:
            return self._get_collection().count()
        except Exception as exc:
            logger.warning("Error getting collection count: %s", exc)
            return 0

    def reset(self) -> None:
        """Delete and recreate the collection for clean deterministic rebuilds."""
        client = self._get_client()
        try:
            client.delete_collection(name=self.collection_name)
            logger.info("Deleted ChromaDB collection %s", self.collection_name)
        except Exception as exc:
            logger.debug("Collection %s did not exist for deletion: %s", self.collection_name, exc)
        self._collection = client.create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("Recreated empty ChromaDB collection %s", self.collection_name)
