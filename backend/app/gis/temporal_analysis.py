"""Small reusable temporal filters for timestamped GIS features."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable, Mapping


def parse_timestamp(value: Any) -> datetime | None:
    """Parse an ISO-8601 timestamp into UTC, returning None when absent/invalid."""
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


def within_time_window(value: Any, start: Any = None, end: Any = None) -> bool:
    """Return whether a timestamp falls within inclusive optional bounds."""
    timestamp = parse_timestamp(value)
    start_time, end_time = parse_timestamp(start), parse_timestamp(end)
    if timestamp is None:
        return False
    if start is not None and start_time is None or end is not None and end_time is None:
        raise ValueError("Time-window bounds must be valid ISO-8601 timestamps.")
    return (start_time is None or timestamp >= start_time) and (end_time is None or timestamp <= end_time)


def filter_features_by_time(features: Iterable[Mapping[str, Any]], start: Any = None, end: Any = None, timestamp_key: str = "observed_at") -> list[Mapping[str, Any]]:
    """Filter feature mappings using a top-level or properties timestamp."""
    return [feature for feature in features if within_time_window(feature.get(timestamp_key, feature.get("properties", {}).get(timestamp_key)), start, end)]
