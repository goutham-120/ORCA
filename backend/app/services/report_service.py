from __future__ import annotations

from datetime import datetime, timezone
import json
from typing import Any
from uuid import uuid4

from app.database.session import database
from app.schemas.resources import ReportCreateRequest, ReportResponse


def _parse_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return datetime.now(timezone.utc)


def _parse_content(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return {}


def _row_to_report(row: Any) -> ReportResponse | None:
    if row is None:
        return None
    return ReportResponse(
        id=str(row[0]),
        title=str(row[1]),
        query_id=row[2],
        content=_parse_content(row[3]),
        created_at=_parse_datetime(row[4]),
    )


class ReportService:
    def __init__(self) -> None:
        self._fallback_reports: dict[str, ReportResponse] = {}

    def _init_db(self) -> bool:
        try:
            return database.initialize()
        except Exception:
            return False

    def list(self) -> list[ReportResponse]:
        if self._init_db():
            try:
                content_col = "content" if database.is_postgres else "content_json AS content"
                query = f"SELECT id, title, query_id, {content_col}, created_at FROM reports ORDER BY created_at DESC"
                rows = database.fetchall(query)
                reports = [_row_to_report(row) for row in rows]
                return [r for r in reports if r is not None]
            except Exception:
                pass
        return sorted(self._fallback_reports.values(), key=lambda item: item.created_at, reverse=True)

    def get(self, report_id: str) -> ReportResponse | None:
        if self._init_db():
            try:
                content_col = "content" if database.is_postgres else "content_json AS content"
                query = f"SELECT id, title, query_id, {content_col}, created_at FROM reports WHERE id = ?"
                row = database.fetchone(query, (report_id,))
                if row is not None:
                    return _row_to_report(row)
            except Exception:
                pass
        return self._fallback_reports.get(report_id)

    def create(self, request: ReportCreateRequest, user_id: int | None = None) -> ReportResponse:
        report_id = str(uuid4())
        created_at = datetime.now(timezone.utc)
        report = ReportResponse(
            id=report_id,
            title=request.title,
            query_id=request.query_id,
            content=request.content,
            created_at=created_at,
        )
        saved_in_db = False
        if self._init_db():
            try:
                content_payload = json.dumps(request.content)
                if database.is_postgres:
                    database.execute(
                        "INSERT INTO reports (id, user_id, title, query_id, content, created_at) VALUES (?, ?, ?, ?, ?::jsonb, ?)",
                        (report_id, user_id, request.title, request.query_id, content_payload, created_at.isoformat()),
                    )
                else:
                    database.execute(
                        "INSERT INTO reports (id, user_id, title, query_id, content_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                        (report_id, user_id, request.title, request.query_id, content_payload, created_at.isoformat()),
                    )
                saved_in_db = True
            except Exception:
                saved_in_db = False

        if not saved_in_db:
            self._fallback_reports[report.id] = report
        return report

    def delete(self, report_id: str) -> bool:
        deleted = False
        if self._init_db():
            try:
                existing = self.get(report_id)
                if existing is not None:
                    database.execute("DELETE FROM reports WHERE id = ?", (report_id,))
                    deleted = True
            except Exception:
                deleted = False
        if self._fallback_reports.pop(report_id, None) is not None:
            deleted = True
        return deleted

