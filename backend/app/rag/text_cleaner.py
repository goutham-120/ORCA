"""Robust text cleaning and normalization for ORCA RAG documents and retrieved knowledge.

Handles:
- Encoding mojibake repair (e.g. â€™, â€œ, â€“, Â°, Ã©)
- Unicode replacement character (\ufffd, \u200b) removal
- Broken ligatures (fi, fl, ff, ffi, ffl)
- KrutiDev / legacy non-Unicode font extraction artifacts
- Hyphenation repair at line breaks (e.g. hydro- \n phobic -> hydrophobic)
- Extraction headers and page break markers (--- Page X ---, [Title | Page X])
- Normalization of excessive whitespace and blank lines

Preserves:
- Legitimate scientific symbols and units: μ, α, β, γ, δ, °, °C, ±, ², ³, ~, %, ‰, ≥, ≤, ×, ÷, <, >
- Valid Indic scripts: Devanagari, Telugu, Tamil, Malayalam, Kannada, Bengali, Odia, Gujarati
- Markdown structure (headings, tables, bullet points)
"""
from __future__ import annotations

import re
import unicodedata

# Mojibake mapping for common double-encoded UTF-8 / Windows-1252 sequences
MOJIBAKE_MAP: dict[str, str] = {
    "â€™": "'",
    "â€˜": "'",
    "â€œ": '"',
    "â€\x9d": '"',
    "â€\x9c": '"',
    "â€": '"',
    "â€“": "–",
    "â€”": "—",
    "â€¢": "•",
    "â€¦": "…",
    "Â°": "°",
    "Â±": "±",
    "Â²": "²",
    "Â³": "³",
    "Âµ": "μ",
    "Â": "",
    "Ã©": "é",
    "Ã¨": "è",
    "Ã ": "à",
    "Ã¡": "á",
    "Ã±": "ñ",
    "Ã³": "ó",
    "Ãº": "ú",
    "Ã§": "ç",
}

# Broken ligatures
LIGATURE_MAP: dict[str, str] = {
    "ﬁ": "fi",
    "ﬂ": "fl",
    "ﬀ": "ff",
    "ﬃ": "ffi",
    "ﬄ": "ffl",
}

# Extraction header and artifact patterns to strip from chunk text
HEADER_PATTERNS: tuple[str, ...] = (
    r"^---\s*Page\s+\d+\s*---$",
    r"^Source\s+PDF:\s*.*?--- Page \d+ ---",
    r"^\[.*?\|\s*Page\s+\d+\]$",
    r"^\*{3,}$",
    r"^=+$",
    r"^\d+\s+\d+\.\d+(?:\.\d+)?\b.*$",
    r"^\d+\.\d+(?:\.\d+)?\b.*$",
    r"^Chunk\s+ID:.*$",
    r"^Source:\s+.*$",
)

# KrutiDev / legacy font artifact regex (nonsense letters with braces / brackets / currency symbols)
KRUTIDEV_PATTERN = re.compile(
    r"\b(?:rnrls|vriru|ql\{d|q-\{6T\{|Il-igqr€rq|q\{qmq|3fr\{|3\{rE|riarfi|[a-z]{1,4}\{[a-z0-9]|q\{|3fr\{)\b",
    re.IGNORECASE,
)


def fix_mojibake(text: str) -> str:
    """Repair common mojibake sequences and strip replacement characters."""
    if not text:
        return ""

    # Sort keys by length descending to replace longer sequences (e.g. â€“) before shorter substrings (e.g. â€)
    for bad in sorted(MOJIBAKE_MAP.keys(), key=len, reverse=True):
        if bad in text:
            text = text.replace(bad, MOJIBAKE_MAP[bad])

    # Strip unicode replacement characters and zero-width spaces
    text = text.replace("\ufffd", "").replace("\ufeff", "").replace("\u200b", "")
    return text


def fix_ligatures(text: str) -> str:
    """Normalize broken typographic ligatures to ASCII equivalents."""
    if not text:
        return ""
    for lig, asc in LIGATURE_MAP.items():
        if lig in text:
            text = text.replace(lig, asc)
    return text


def fix_hyphenation(text: str) -> str:
    """Rejoin hyphenated words split across lines."""
    if not text:
        return ""
    # e.g. "salin- \n ity" -> "salinity"
    return re.sub(r"([a-zA-Z]{3,})-\s*\n\s*([a-zA-Z]{3,})", r"\1\2", text)


def is_garbage_line(line: str) -> bool:
    """Check if a single line is an OCR extraction artifact or KrutiDev noise."""
    s = line.strip()
    if not s:
        return False

    # Check known extraction headers
    for pat in HEADER_PATTERNS:
        if re.match(pat, s, re.IGNORECASE):
            return True

    # Check for KrutiDev legacy font noise
    if KRUTIDEV_PATTERN.search(s):
        # If the line is almost entirely garbage (no substantial English words), drop it
        words = s.split()
        garbage_words = [w for w in words if KRUTIDEV_PATTERN.search(w)]
        if len(garbage_words) >= len(words) * 0.4:
            return True

    # High ratio of non-alphanumeric punctuation in short lines
    if len(s) < 20 and sum(1 for c in s if c in "{}[]€¥$<>_~`\\|") >= 3:
        return True

    return False


def clean_pdf_text(text: str) -> str:
    """Clean and normalize raw extracted PDF text.

    Safe for both pre-chunking ingestion and post-retrieval synthesis.
    Preserves scientific symbols and Indic scripts.
    """
    if not text:
        return ""

    # Strip inline relevance scores, similarity metrics, and page markers
    text = re.sub(r"\(Relevance:\s*[^)]+\)", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\(Similarity:\s*[^)]+\)", "", text, flags=re.IGNORECASE)
    text = re.sub(r"---\s*Page\s+\d+\s*---", "", text, flags=re.IGNORECASE)

    # 1. Mojibake repair
    text = fix_mojibake(text)

    # 2. Ligatures
    text = fix_ligatures(text)

    # 3. Hyphenation at line breaks
    text = fix_hyphenation(text)

    # 4. Clean line-by-line
    lines = text.split("\n")
    cleaned_lines: list[str] = []

    for line in lines:
        if is_garbage_line(line):
            continue

        # Clean KrutiDev tokens inside lines that also have clean text
        cleaned_line = KRUTIDEV_PATTERN.sub("", line)
        # Normalize internal spaces while preserving leading indentation if any
        cleaned_line = re.sub(r"[ \t]+", " ", cleaned_line).strip()

        if cleaned_line:
            cleaned_lines.append(cleaned_line)

    # 5. Join lines with single blank line max between paragraphs
    result = "\n".join(cleaned_lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()


def normalize_knowledge_text(text: str) -> str:
    """Higher-level text normalization for knowledge text presented to users or LLM."""
    return clean_pdf_text(text)
