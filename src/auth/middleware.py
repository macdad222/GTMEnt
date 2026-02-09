"""JWT authentication middleware for FastAPI.

Provides:
  - create_access_token(): issue a signed JWT after login
  - get_current_user(): FastAPI dependency that validates the JWT
  - require_role(*roles): dependency that also checks user role
"""

from datetime import datetime, timedelta
from typing import Optional, List

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from src.config import get_settings

logger = structlog.get_logger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

security_scheme = HTTPBearer(auto_error=False)


# ─────────────────────────────────────────────────────────────────────────────
# Token creation
# ─────────────────────────────────────────────────────────────────────────────

def create_access_token(
    user_id: str,
    username: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed JWT access token."""
    settings = get_settings()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": expire,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)
    logger.info("access_token_created", user_id=user_id, username=username)
    return token


# ─────────────────────────────────────────────────────────────────────────────
# Token validation dependency
# ─────────────────────────────────────────────────────────────────────────────

class TokenPayload:
    """Decoded JWT payload."""

    def __init__(self, user_id: str, username: str, role: str):
        self.user_id = user_id
        self.username = username
        self.role = role


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> TokenPayload:
    """FastAPI dependency: extract and validate JWT from Authorization header.

    Usage in routes:
        @router.get("/protected")
        async def my_endpoint(user: TokenPayload = Depends(get_current_user)):
            print(user.username, user.role)
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=[ALGORITHM],
        )
        user_id: Optional[str] = payload.get("sub")
        username: Optional[str] = payload.get("username")
        role: Optional[str] = payload.get("role")

        if user_id is None or username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )

        return TokenPayload(user_id=user_id, username=username, role=role or "analyst")

    except JWTError as e:
        logger.warning("jwt_validation_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─────────────────────────────────────────────────────────────────────────────
# Role-based access control
# ─────────────────────────────────────────────────────────────────────────────

def require_role(*allowed_roles: str):
    """FastAPI dependency factory that checks the user's role.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user: TokenPayload = Depends(require_role("admin"))):
            ...
    """

    async def _check_role(
        user: TokenPayload = Depends(get_current_user),
    ) -> TokenPayload:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' does not have permission. Required: {', '.join(allowed_roles)}",
            )
        return user

    return _check_role
