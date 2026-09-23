from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = None
    name: str | None = None
    role: str = Field(default="fisherman")
    organization: str | None = None
    institution: str | None = None
    designation: str | None = None


class LoginRequest(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    name: str | None = None
    user_category: str | None = None
    role: str = "fisherman"
    approval_status: str = "approved"
    organization: str | None = None
    designation: str | None = None
    created_at: str | None = None


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str | None = None
    token_type: str = "bearer"
    message: str | None = None


class ProfileUpdateRequest(BaseModel):
    user_category: str

