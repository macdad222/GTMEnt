"""Auth API routes -- gate, register, login."""

from fastapi import APIRouter, HTTPException, status, Depends

from src.auth.models import (
    GateVerifyRequest, RegisterRequest, LoginRequest,
    TokenResponse, UserResponse,
)
from src.auth.service import (
    verify_gate, register_user, authenticate_user, create_access_token,
)
from src.auth.middleware import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/verify-gate")
async def verify_gate_code(request: GateVerifyRequest):
    """Verify the shared access code before allowing registration/login."""
    if not verify_gate(request.access_code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access code")
    return {"valid": True}


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest):
    """Self-register a new user account."""
    if len(request.password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    if not request.name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required")
    if not request.email.strip() or "@" not in request.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email is required")

    try:
        user = register_user(request.name.strip(), request.email.strip().lower(), request.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    token = create_access_token(user["id"], user["role"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login with email and password."""
    user = authenticate_user(request.email.strip().lower(), request.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(user["id"], user["role"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    """Get the current authenticated user."""
    return UserResponse(**user)
