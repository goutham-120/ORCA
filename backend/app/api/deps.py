"""FastAPI authentication dependencies."""

from __future__ import annotations

from typing import Annotated
from fastapi import Depends, Header, HTTPException, status
import jwt

from app.config import get_settings
from app.models.user import User, users

JWT_SECRET = get_settings().jwt_secret or "orca-secret-key-change-in-production-32chars"
JWT_ALGORITHM = "HS256"


def get_current_user(authorization: str | None = Header(default=None)) -> User:
    """Validate Bearer JWT token and return current authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims.")
        user = users.by_id(int(user_id))
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_approved_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Ensure the user is approved by an administrator."""
    if current_user.approval_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval.",
        )
    return current_user


def require_admin_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Ensure the current user has administrator authorization."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator authorization is required to perform this action.",
        )
    return current_user

