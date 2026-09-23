"""Authentication and current-user profile routes."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import base64
import hashlib
import hmac
import secrets
from typing import Annotated, Any

try:
    import bcrypt
    HAS_BCRYPT = True
except ImportError:
    bcrypt = None  # type: ignore
    HAS_BCRYPT = False

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.api.deps import JWT_ALGORITHM, JWT_SECRET, get_current_user, require_admin_user
from app.config import get_settings
from app.models.user import User, users
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    PreferencesUpdateRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["authentication"])

VALID_ROLES = {
    "fisherman": "Fisherman",
    "researcher": "Researcher",
    "coastal_authority": "Coastal Authority",
    "marine_disaster_ops": "Marine & Disaster Operations",
}

USER_CATEGORIES = {
    "fisher_marine_operator",
    "researcher_scientist",
    "coastal_authority",
    "general_user",
}


def _hash_password(password: str) -> str:
    if HAS_BCRYPT and bcrypt is not None:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
    # Fallback to standard library PBKDF2
    salt = secrets.token_bytes(16)
    iterations = 100_000
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    salt_b64 = base64.urlsafe_b64encode(salt).decode("ascii").rstrip("=")
    derived_b64 = base64.urlsafe_b64encode(derived).decode("ascii").rstrip("=")
    return f"pbkdf2_sha256${iterations}${salt_b64}${derived_b64}"


def _password_matches(password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False
    # Check bcrypt hash first
    if stored_hash.startswith(("$2b$", "$2a$", "$2y$")):
        if HAS_BCRYPT and bcrypt is not None:
            try:
                return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
            except Exception:
                return False
        return False
    # Fallback to PBKDF2
    if stored_hash.startswith("pbkdf2_sha256$"):
        try:
            algorithm, iterations, salt, expected = stored_hash.split("$", 3)
            raw_salt = base64.urlsafe_b64decode(salt + "=" * (-len(salt) % 4))
            derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), raw_salt, int(iterations))
            encoded_derived = base64.urlsafe_b64encode(derived).rstrip(b"=").decode("ascii")
            return hmac.compare_digest(encoded_derived, expected)
        except Exception:
            return False
    return False


def _issue_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=7)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _response_user(user: User) -> UserResponse:
    display_name = user.name or user.display_name
    return UserResponse(
        id=str(user.id),
        email=user.email,
        display_name=display_name,
        name=user.name or display_name,
        user_category=user.user_category,
        preferences=user.preferences or {},
        role=user.role or "fisherman",
        approval_status=user.approval_status or "approved",
        organization=user.organization,
        designation=user.designation,
        created_at=user.created_at,
    )


def _authenticated_user(authorization: str | None = Header(default=None)) -> User:
    user = get_current_user(authorization)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest) -> AuthResponse:
    email = request.email.strip().lower()

    # Check if email is already registered
    if users.by_email(email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this email address.",
        )

    # Standardize role name
    role_raw = (request.role or "fisherman").strip().lower().replace(" ", "_")
    if role_raw in {"marine_&_disaster_operations", "marine_and_disaster_operations"}:
        role_raw = "marine_disaster_ops"

    if role_raw == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrator role cannot be self-assigned through public registration.",
        )

    if role_raw not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user role. Allowed roles: {', '.join(VALID_ROLES.keys())}",
        )

    full_name = (request.name or request.display_name or "").strip()
    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required.",
        )

    organization = (request.organization or request.institution or "").strip() or None
    designation = (request.designation or "").strip() or None

    # Validate role-specific rules
    if role_raw == "researcher" and not organization:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution information is required for Researcher accounts.",
        )

    if role_raw in {"coastal_authority", "marine_disaster_ops"}:
        if not organization:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization information is required for authority and disaster operations accounts.",
            )
        approval_status_val = "pending"
    else:
        approval_status_val = "approved"

    hashed_pw = _hash_password(request.password)

    try:
        user = users.create(
            email=email,
            display_name=full_name,
            name=full_name,
            password_hash=hashed_pw,
            user_category=request.user_category,
            preferences=request.preferences or {},
            role=role_raw,
            approval_status=approval_status_val,
            organization=organization,
            designation=designation,
        )
    except Exception as exc:
        if users.by_email(email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account already exists for this email address.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user.",
        ) from exc

    if user.approval_status == "pending":
        return AuthResponse(
            user=_response_user(user),
            access_token=None,
            message="Registration submitted successfully. Your account is pending administrator approval before access is granted.",
        )

    token = _issue_token(user)
    return AuthResponse(
        user=_response_user(user),
        access_token=token,
        message="Registration successful.",
    )


def record_login_activity(
    email: str,
    status_val: str,
    user_id: int | None = None,
    role: str = "fisherman",
) -> None:
    """Record a login attempt (success or failed) in backend database."""
    from app.database.session import database

    ts = datetime.now().strftime("%b %d, %Y, %I:%M %p")
    existing = database.fetchone(
        "SELECT id FROM login_activity WHERE LOWER(email) = LOWER(?) AND status = ? AND timestamp = ?",
        (email, status_val, ts),
    )
    if existing is None:
        database.execute(
            """
            INSERT INTO login_activity (user_id, email, role, timestamp, status)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, email, role, ts, status_val),
        )


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest) -> AuthResponse:
    email = request.email.strip().lower()
    user = users.by_email(email)

    if user is None or not _password_matches(request.password, user.password_hash):
        record_login_activity(
            email=email,
            status_val="failed",
            user_id=user.id if user else None,
            role=user.role if user else "unknown",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if user.approval_status == "pending":
        record_login_activity(
            email=email,
            status_val="failed",
            user_id=user.id,
            role=user.role,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account registration is pending administrator approval. Please wait for approval before signing in.",
        )

    if user.approval_status == "rejected":
        record_login_activity(
            email=email,
            status_val="failed",
            user_id=user.id,
            role=user.role,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account registration was rejected by an administrator.",
        )

    record_login_activity(
        email=email,
        status_val="success",
        user_id=user.id,
        role=user.role,
    )
    token = _issue_token(user)
    return AuthResponse(user=_response_user(user), access_token=token)


def _resolve_user(current_user: Any = None, authorization: Any = None) -> User:
    if isinstance(current_user, User):
        fresh = users.by_id(current_user.id)
        return fresh if fresh is not None else current_user
    if isinstance(current_user, str):
        return get_current_user(current_user)
    if isinstance(authorization, str) and authorization:
        return get_current_user(authorization)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


@router.get("/me", response_model=UserResponse)
def me(
    current_user: Annotated[User | str | None, Depends(get_current_user)] = None,
    authorization: str | None = Header(default=None),
) -> UserResponse:
    user = _resolve_user(current_user, authorization)
    record_login_activity(
        email=user.email,
        status_val="success",
        user_id=user.id,
        role=user.role or "fisherman",
    )
    return _response_user(user)


@router.post("/logout")
def logout() -> dict[str, str]:
    return {"message": "Logged out successfully."}


@router.post("/admin/login", response_model=AuthResponse)
def admin_login(request: LoginRequest) -> AuthResponse:
    """Authenticate administrator account and return JWT."""
    email = request.email.strip().lower()
    user = users.by_email(email)

    if user is None or not _password_matches(request.password, user.password_hash):
        record_login_activity(
            email=email,
            status_val="failed",
            user_id=user.id if user else None,
            role="admin",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials.",
        )

    if user.role != "admin":
        record_login_activity(
            email=email,
            status_val="failed",
            user_id=user.id,
            role=user.role,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator authorization is required to access the admin portal.",
        )

    record_login_activity(
        email=email,
        status_val="success",
        user_id=user.id,
        role="admin",
    )
    token = _issue_token(user)
    return AuthResponse(user=_response_user(user), access_token=token)


# --- Admin Approval & Activity Endpoints ---

@router.get("/admin/login-activity")
def list_login_activity(
    admin: Annotated[User, Depends(require_admin_user)],
    role: str | None = None,
    status: str | None = None,
    date: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve all recorded user login activity logs for admin oversight."""
    from app.database.session import database

    query = """
        SELECT la.id, la.user_id, la.email, la.role, la.timestamp, la.status, la.created_at,
               u.display_name, u.name
        FROM login_activity la
        LEFT JOIN users u ON la.user_id = u.id
        WHERE 1=1
    """
    params: list[Any] = []

    if role and role.lower() != "all":
        query += " AND LOWER(la.role) = ?"
        params.append(role.strip().lower())

    if status and status.lower() != "all":
        query += " AND LOWER(la.status) = ?"
        params.append(status.strip().lower())

    if date and date.strip():
        query += " AND (la.created_at LIKE ? OR la.timestamp LIKE ?)"
        params.append(f"%{date.strip()}%")
        params.append(f"%{date.strip()}%")

    query += " ORDER BY la.id DESC"
    rows = database.fetchall(query, tuple(params))

    results = []
    for r in rows:
        keys = r.keys() if hasattr(r, "keys") else []
        u_name = r["name"] if "name" in keys and r["name"] else (r["display_name"] if "display_name" in keys and r["display_name"] else r["email"].split("@")[0])
        results.append({
            "id": r["id"],
            "userId": r["user_id"],
            "user": u_name,
            "email": r["email"],
            "role": r["role"],
            "timestamp": r["timestamp"],
            "status": r["status"],
            "createdAt": str(r["created_at"]),
        })

    return results


@router.get("/pending-users", response_model=list[UserResponse])
def list_pending_users(admin: Annotated[User, Depends(require_admin_user)]) -> list[UserResponse]:
    """Retrieve all users waiting for administrator approval."""
    pending = users.get_pending_users()
    return [_response_user(u) for u in pending]


@router.post("/approve/{user_id}", response_model=UserResponse)
def approve_user(user_id: int, admin: Annotated[User, Depends(require_admin_user)]) -> UserResponse:
    """Approve a pending user registration."""
    user = users.by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    updated = users.update_approval_status(user_id, "approved")
    if updated is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update approval status.")
    return _response_user(updated)


@router.post("/reject/{user_id}", response_model=UserResponse)
def reject_user(user_id: int, admin: Annotated[User, Depends(require_admin_user)]) -> UserResponse:
    """Reject a pending user registration."""
    user = users.by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    updated = users.update_approval_status(user_id, "rejected")
    if updated is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update approval status.")
    return _response_user(updated)


@router.put("/profile", response_model=UserResponse)
def update_profile(
    request: ProfileUpdateRequest,
    current_user: Annotated[User | str | None, Depends(get_current_user)] = None,
    authorization: str | None = Header(default=None),
) -> UserResponse:
    """Update profile user_category or preferences."""
    user = _resolve_user(current_user, authorization)
    
    updated = user
    if request.user_category is not None:
        if request.user_category not in USER_CATEGORIES:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Invalid user category.")
        updated = users.update_category(user.id, request.user_category)

    if request.preferences is not None:
        current_prefs = dict(updated.preferences or {}) if updated else {}
        current_prefs.update(request.preferences)
        updated = users.update_preferences(user.id, current_prefs)

    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return _response_user(updated)
