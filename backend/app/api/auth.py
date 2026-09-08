"""Authentication and current-user profile routes."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time

from fastapi import APIRouter, Header, HTTPException, status

from app.config import get_settings
from app.models.user import User, users
from app.schemas.auth import AuthResponse, LoginRequest, ProfileUpdateRequest, RegisterRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["authentication"])

USER_CATEGORIES = {"fisher_marine_operator", "researcher_scientist", "coastal_authority", "general_user"}
_token_secret = (get_settings().jwt_secret or secrets.token_urlsafe(32)).encode("utf-8")
_password_iterations = 310_000


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _password_iterations)
    return f"pbkdf2_sha256${_password_iterations}${_encode(salt)}${_encode(derived)}"


def _password_matches(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt, expected = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), _decode(salt), int(iterations))
        return hmac.compare_digest(_encode(derived), expected)
    except (TypeError, ValueError):
        return False


def _issue_token(user_id: int) -> str:
    payload = _encode(json.dumps({"sub": str(user_id), "exp": int(time.time()) + 86400}, separators=(",", ":")).encode("utf-8"))
    signature = _encode(hmac.new(_token_secret, payload.encode("ascii"), hashlib.sha256).digest())
    return f"{payload}.{signature}"


def _user_id_from_token(token: str) -> int:
    try:
        payload, signature = token.split(".", 1)
        expected = _encode(hmac.new(_token_secret, payload.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError
        claims = json.loads(_decode(payload))
        if int(claims["exp"]) < time.time():
            raise ValueError
        return int(claims["sub"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired authentication token.")


def _authenticated_user(authorization: str | None) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")
    user = users.by_id(_user_id_from_token(authorization.removeprefix("Bearer ")))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")
    return user


def _response_user(user: User) -> UserResponse:
    return UserResponse(id=str(user.id), email=user.email, display_name=user.display_name, user_category=user.user_category)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest) -> AuthResponse:
    email = request.email.strip().lower()
    if users.by_email(email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this email address.")
    try:
        user = users.create(email, request.display_name.strip(), _hash_password(request.password))
    except Exception as exc:
        if users.by_email(email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this email address.") from exc
        raise
    return AuthResponse(user=_response_user(user), access_token=_issue_token(user.id))


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest) -> AuthResponse:
    user = users.by_email(request.email.strip().lower())
    if user is None or not _password_matches(request.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    return AuthResponse(user=_response_user(user), access_token=_issue_token(user.id))


@router.get("/me", response_model=UserResponse)
def me(authorization: str | None = Header(default=None)) -> UserResponse:
    return _response_user(_authenticated_user(authorization))


@router.put("/profile", response_model=UserResponse)
def update_profile(request: ProfileUpdateRequest, authorization: str | None = Header(default=None)) -> UserResponse:
    if request.user_category not in USER_CATEGORIES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Invalid user category.")
    user = _authenticated_user(authorization)
    updated = users.update_category(user.id, request.user_category)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return _response_user(updated)
