"""Auth request/response models."""

from typing import Optional
from pydantic import BaseModel, EmailStr


class GateVerifyRequest(BaseModel):
    access_code: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
