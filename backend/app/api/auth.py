"""Development-safe authentication contract placeholders.

Persistent identity and secure token issuance will be supplied by the auth
integration; routes deliberately do not implement credential storage.
"""

from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["authentication"])


def _user_for(email: str, display_name: str | None = None) -> UserResponse:
    return UserResponse(id=f"pending:{email}", email=email, display_name=display_name or email.split("@", 1)[0])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest) -> AuthResponse:
    return AuthResponse(user=_user_for(request.email, request.display_name), access_token=None)


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest) -> AuthResponse:
    return AuthResponse(user=_user_for(request.email), access_token=None)


@router.get("/me", response_model=UserResponse)
async def me(x_orca_user: str | None = Header(default=None)) -> UserResponse:
    if not x_orca_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication integration is required; send X-ORCA-User for development.")
    return _user_for(x_orca_user)
