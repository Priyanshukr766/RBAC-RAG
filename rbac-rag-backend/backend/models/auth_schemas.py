from typing import Literal
from pydantic import BaseModel, ConfigDict

AllowedRole = Literal[
    "admin",
    "hr",
    "finance",
    "engineering",
    "intern",
    "all_employees",
]


class UserCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str
    password: str
    full_name: str


class UserLoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    role: AllowedRole


class RoleUpdateRequest(BaseModel):
    user_id: int
    new_role: AllowedRole
    is_active: bool = True


class AuthenticatedUser(BaseModel):
    user_id: int
    email: str
    role: AllowedRole
    is_active: bool
