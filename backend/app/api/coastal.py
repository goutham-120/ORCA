"""FastAPI router for Coastal Authority hazard reports, complaints & responses, and official announcements."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Header, HTTPException, Query, status
from pydantic import BaseModel

from app.database.session import database

router = APIRouter(prefix="/coastal", tags=["coastal"])


# --- Schemas ---

class HazardReportCreate(BaseModel):
    region: str = "Visakhapatnam Coast"
    hazard_type: str
    location: str
    description: str
    photo_url: str | None = None
    photo_name: str | None = None
    timestamp: str | None = None
    source: str = "Marine & Disaster Operations"
    op_role: str = "Disaster Response"


class ComplaintCreate(BaseModel):
    sender_name: str | None = None
    sender_role: str | None = None
    location: str | None = None
    message: str
    region: str = "Visakhapatnam Coast"
    photo_url: str | None = None
    photo_name: str | None = None
    timestamp: str | None = None


class ComplaintRespond(BaseModel):
    response: str


class AnnouncementCreate(BaseModel):
    title: str
    details: str
    short_desc: str | None = None
    source: str = "Coastal Authority"
    region: str = "Visakhapatnam Coast"
    target_audience: str = "Fishermen / Mariners"
    datetime: str | None = None


# --- Helper functions ---

def _format_hazard_row(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "region": row["region"],
        "hazardType": row["hazard_type"],
        "location": row["location"],
        "description": row["description"],
        "photoPreview": row["photo_url"],
        "photoName": row["photo_name"],
        "timestamp": row["timestamp"],
        "status": row["status"],
        "acknowledgedAt": row["acknowledged_at"],
        "source": row["source"],
        "opRole": row["op_role"],
        "createdAt": str(row["created_at"]),
    }


def _get_authenticated_user_from_header(authorization: str | None) -> Any | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    try:
        import jwt
        from app.api.deps import JWT_ALGORITHM, JWT_SECRET
        from app.models.user import users
        tok_payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = tok_payload.get("sub")
        if user_id:
            return users.by_id(int(user_id))
    except Exception:
        pass
    return None


def _format_complaint_row(row: Any) -> dict[str, Any]:
    keys = row.keys() if hasattr(row, "keys") else []
    loc_val = row["location"] if "location" in keys and row["location"] else row["region"]
    return {
        "id": row["id"],
        "senderUserId": row["sender_user_id"] if "sender_user_id" in keys else None,
        "senderName": row["sender_name"],
        "senderRole": row["sender_role"],
        "senderEmail": row["sender_email"] if "sender_email" in keys else None,
        "recipientRole": row["recipient_role"] if "recipient_role" in keys else "coastal_authority",
        "message": row["message"],
        "region": row["region"],
        "location": loc_val,
        "photoUrl": row["photo_url"] if "photo_url" in keys else None,
        "photoName": row["photo_name"] if "photo_name" in keys else None,
        "timestamp": row["timestamp"],
        "status": row["status"],
        "response": row["response"],
        "respondedAt": row["responded_at"],
        "responderUserId": row["responder_user_id"] if "responder_user_id" in keys else None,
        "createdAt": str(row["created_at"]),
    }


def _format_announcement_row(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "details": row["details"],
        "shortDesc": row["short_desc"] or (row["details"][:120] + "..." if len(row["details"]) > 120 else row["details"]),
        "source": row["source"],
        "region": row["region"],
        "targetAudience": row["target_audience"],
        "datetime": row["datetime"],
        "createdAt": str(row["created_at"]),
    }


# --- Endpoints: Hazards ---

@router.get("/hazards")
def list_hazards(region: str | None = Query(default=None)) -> list[dict[str, Any]]:
    """Retrieve all submitted hazard reports, optionally filtered by region."""
    if region:
        rows = database.fetchall("SELECT * FROM coastal_hazard_reports WHERE region = ? ORDER BY id DESC", (region,))
    else:
        rows = database.fetchall("SELECT * FROM coastal_hazard_reports ORDER BY id DESC")
    return [_format_hazard_row(r) for r in rows]


@router.post("/hazards", status_code=status.HTTP_201_CREATED)
def create_hazard(payload: HazardReportCreate) -> dict[str, Any]:
    """Submit a new hazard report from Marine & Disaster Operations."""
    from datetime import datetime
    ts = payload.timestamp or datetime.now().strftime("%b %d, %Y, %I:%M %p")
    database.execute(
        """
        INSERT INTO coastal_hazard_reports (region, hazard_type, location, description, photo_url, photo_name, timestamp, status, source, op_role)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending Review', ?, ?)
        """,
        (
            payload.region,
            payload.hazard_type,
            payload.location,
            payload.description,
            payload.photo_url,
            payload.photo_name,
            ts,
            payload.source,
            payload.op_role,
        ),
    )
    row = database.fetchone("SELECT * FROM coastal_hazard_reports ORDER BY id DESC LIMIT 1", ())
    if row is None:
        raise HTTPException(status_code=500, detail="Failed to retrieve created hazard report.")
    return _format_hazard_row(row)


@router.post("/hazards/{hazard_id}/acknowledge")
def acknowledge_hazard(hazard_id: int) -> dict[str, Any]:
    """Acknowledge a pending hazard report as Coastal Authority."""
    from datetime import datetime
    row = database.fetchone("SELECT * FROM coastal_hazard_reports WHERE id = ?", (hazard_id,))
    if row is None:
        raise HTTPException(status_code=404, detail="Hazard report not found.")
    
    ack_time = datetime.now().strftime("%b %d, %Y, %I:%M %p")
    database.execute(
        "UPDATE coastal_hazard_reports SET status = 'Acknowledged', acknowledged_at = ? WHERE id = ?",
        (ack_time, hazard_id),
    )
    updated = database.fetchone("SELECT * FROM coastal_hazard_reports WHERE id = ?", (hazard_id,))
    return _format_hazard_row(updated)


# --- Endpoints: Complaints & Messages ---

@router.get("/complaints/my")
def list_my_complaints(
    authorization: str | None = Header(default=None),
) -> list[dict[str, Any]]:
    """Retrieve complaints/messages submitted strictly by the current authenticated user."""
    user = _get_authenticated_user_from_header(authorization)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token is required.")

    rows = database.fetchall(
        """
        SELECT * FROM coastal_complaints 
        WHERE sender_user_id = ? OR LOWER(sender_email) = LOWER(?)
        ORDER BY id DESC
        """,
        (user.id, user.email),
    )
    return [_format_complaint_row(r) for r in rows]


@router.get("/complaints")
def list_complaints(
    region: str | None = Query(default=None),
    sender_email: str | None = Query(default=None),
    authorization: str | None = Header(default=None),
) -> list[dict[str, Any]]:
    """Retrieve complaints and messages.
    - Fishermen and Marine Operators ONLY receive their own submitted messages.
    - Coastal Authority and Admin receive incoming messages.
    """
    user = _get_authenticated_user_from_header(authorization)

    # If requester is a sender role (fisherman or marine_disaster_ops), strictly filter by user identity!
    if user and user.role in ("fisherman", "marine_disaster_ops"):
        rows = database.fetchall(
            """
            SELECT * FROM coastal_complaints 
            WHERE sender_user_id = ? OR LOWER(sender_email) = LOWER(?)
            ORDER BY id DESC
            """,
            (user.id, user.email),
        )
        return [_format_complaint_row(r) for r in rows]

    # For Coastal Authority / Admin (or query with explicit sender_email)
    query = "SELECT * FROM coastal_complaints WHERE 1=1"
    params: list[Any] = []
    if region and region != "All Regions":
        query += " AND (region = ? OR region = 'All Regions')"
        params.append(region)
    if sender_email:
        query += " AND LOWER(sender_email) = LOWER(?)"
        params.append(sender_email.strip().lower())
    query += " ORDER BY id DESC"
    rows = database.fetchall(query, tuple(params))
    return [_format_complaint_row(r) for r in rows]


@router.post("/complaints", status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """Submit a complaint or message from a Fisherman or Marine Operator.
    Sender identity and role are populated strictly from the authenticated backend session/token.
    """
    from datetime import datetime

    user = _get_authenticated_user_from_header(authorization)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is required to submit a complaint.",
        )

    if user.role == "coastal_authority":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Coastal Authority users cannot submit complaints; Coastal Authority is the recipient/responding role.",
        )

    sender_name = user.display_name or user.name or user.email.split("@")[0]
    raw_role = (user.role or "").lower()
    if "disaster" in raw_role or "marine" in raw_role:
        sender_role_label = "Marine Operator"
    elif "coastal" in raw_role:
        sender_role_label = "Coastal Authority"
    else:
        sender_role_label = "Fisherman"

    location_text = (payload.location or payload.region or "").strip()
    ts = payload.timestamp or datetime.now().strftime("%b %d, %Y, %I:%M %p")

    database.execute(
        """
        INSERT INTO coastal_complaints (
            sender_user_id, sender_name, sender_role, sender_email, recipient_role,
            message, region, location, photo_url, photo_name, timestamp, status
        )
        VALUES (?, ?, ?, ?, 'coastal_authority', ?, ?, ?, ?, ?, ?, 'Pending Response')
        """,
        (
            user.id,
            sender_name,
            sender_role_label,
            user.email,
            payload.message,
            payload.region,
            location_text,
            payload.photo_url,
            payload.photo_name,
            ts,
        ),
    )
    row = database.fetchone("SELECT * FROM coastal_complaints ORDER BY id DESC LIMIT 1", ())
    if row is None:
        raise HTTPException(status_code=500, detail="Failed to retrieve created complaint.")
    return _format_complaint_row(row)


@router.post("/complaints/{complaint_id}/respond")
def respond_complaint(
    complaint_id: int,
    payload: ComplaintRespond,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """Respond to a complaint or message as Coastal Authority."""
    from datetime import datetime

    user = _get_authenticated_user_from_header(authorization)
    row = database.fetchone("SELECT * FROM coastal_complaints WHERE id = ?", (complaint_id,))
    if row is None:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    
    resp_time = datetime.now().strftime("%b %d, %Y, %I:%M %p")
    responder_id = user.id if user else None

    database.execute(
        """
        UPDATE coastal_complaints 
        SET response = ?, status = 'Responded', responded_at = ?, responder_user_id = ? 
        WHERE id = ?
        """,
        (payload.response, resp_time, responder_id, complaint_id),
    )
    updated = database.fetchone("SELECT * FROM coastal_complaints WHERE id = ?", (complaint_id,))
    return _format_complaint_row(updated)


# --- Endpoints: Announcements ---

@router.get("/announcements")
def list_announcements(
    region: str | None = Query(default=None),
    target_audience: str | None = Query(default=None),
) -> list[dict[str, Any]]:
    """Retrieve authority announcements, optionally filtered by region and target_audience."""
    query = "SELECT * FROM authority_announcements WHERE 1=1"
    params: list[Any] = []
    if region:
        query += " AND (region = ? OR region = 'All Regions')"
        params.append(region)
    if target_audience:
        query += " AND (target_audience = ? OR target_audience = 'All')"
        params.append(target_audience)
    query += " ORDER BY id DESC"
    rows = database.fetchall(query, tuple(params))
    return [_format_announcement_row(r) for r in rows]


@router.post("/announcements", status_code=status.HTTP_201_CREATED)
def create_announcement(payload: AnnouncementCreate) -> dict[str, Any]:
    """Publish an official Coastal Authority announcement."""
    from datetime import datetime
    dt = payload.datetime or datetime.now().strftime("%b %d, %Y %I:%M %p")
    short_desc = payload.short_desc or (payload.details[:120] + "..." if len(payload.details) > 120 else payload.details)
    database.execute(
        """
        INSERT INTO authority_announcements (title, details, short_desc, source, region, target_audience, datetime)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (payload.title, payload.details, short_desc, payload.source, payload.region, payload.target_audience, dt),
    )
    row = database.fetchone("SELECT * FROM authority_announcements ORDER BY id DESC LIMIT 1", ())
    if row is None:
        raise HTTPException(status_code=500, detail="Failed to retrieve created announcement.")
    return _format_announcement_row(row)
