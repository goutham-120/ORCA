"""Inspect all files in orca-knowledge and produce a complete inventory."""
import os
from pathlib import Path
import json

repo_root = Path(__file__).resolve().parents[2]
knowledge_root = repo_root / "orca-knowledge"

print(f"Inspecting knowledge root: {knowledge_root}")
if not knowledge_root.exists():
    print("ERROR: orca-knowledge directory does not exist!")
    exit(1)

all_files = []
for root, dirs, files in os.walk(knowledge_root):
    for f in sorted(files):
        p = Path(root) / f
        rel = p.relative_to(knowledge_root)
        size = p.stat().st_size
        ext = p.suffix.lower()
        all_files.append({
            "rel_path": str(rel).replace("\\", "/"),
            "ext": ext,
            "size_bytes": size,
            "filename": f,
        })

print(f"Total files found: {len(all_files)}")
ext_counts = {}
for item in all_files:
    ext_counts[item["ext"]] = ext_counts.get(item["ext"], 0) + 1

print("\nFile counts by extension:")
for ext, count in sorted(ext_counts.items()):
    print(f"  {ext}: {count}")

print("\nCategorized Directory Breakdown:")
categories = {}
for item in all_files:
    parts = item["rel_path"].split("/")
    top_dir = parts[0]
    categories.setdefault(top_dir, []).append(item)

for cat, items in categories.items():
    print(f"\n--- {cat} ({len(items)} files) ---")
    for it in items:
        size_kb = it["size_bytes"] / 1024
        print(f"  {it['rel_path']} ({size_kb:.1f} KB)")
