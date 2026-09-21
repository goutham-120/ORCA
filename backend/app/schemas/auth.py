from typing import Any
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)
    user_category: str | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)


class LoginRequest(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    user_category: str | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str | None = None
    token_type: str = "bearer"


class ProfileUpdateRequest(BaseModel):
    user_category: str | None = None
    display_name: str | None = None
    preferences: dict[str, Any] | None = None


class PreferencesUpdateRequest(BaseModel):
    preferences: dict[str, Any] = Field(default_factory=dict)

