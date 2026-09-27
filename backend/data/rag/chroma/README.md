# ChromaDB persistent storage directory

This directory is the default ``RAG_PERSIST_DIRECTORY`` for the ORCA RAG pipeline.
ChromaDB will create its SQLite-backed storage files here when the knowledge index is built.

**Do not commit ChromaDB index files to git.** Add this directory to `.gitignore`
(the chroma/ subdirectory is already excluded via the backend `.gitignore`).

## Usage

Build the index (Phase 2):
```bash
cd backend
RAG_ENABLED=true python scripts/build_knowledge_index.py
```
