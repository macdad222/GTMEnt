"""Auth service -- JWT, password hashing, gate verification."""

import hashlib
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from src.config import get_settings
from src.database import get_db
from src.db_models import UserDB

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _prehash(password: str) -> str:
    """SHA-256 pre-hash to avoid bcrypt's 72-byte limit."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    return pwd_context.hash(_prehash(password))


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(_prehash(plain), hashed)


def create_access_token(user_id: str, role: str) -> str:
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiry_hours)
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


def verify_gate(code: str) -> bool:
    settings = get_settings()
    return code == settings.gate_access_code


def _user_to_dict(user: UserDB) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "is_active": user.is_active,
    }


def register_user(name: str, email: str, password: str) -> dict:
    with get_db() as db:
        existing = db.query(UserDB).filter(UserDB.email == email).first()
        if existing:
            raise ValueError("Email already registered")

        user_count = db.query(UserDB).count()
        role = "admin" if user_count == 0 else "user"

        user = UserDB(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=role,
            is_active=True,
        )
        db.add(user)
        db.flush()
        db.refresh(user)
        return _user_to_dict(user)


def authenticate_user(email: str, password: str) -> Optional[dict]:
    with get_db() as db:
        user = db.query(UserDB).filter(UserDB.email == email).first()
        if not user or not user.password_hash:
            return None
        if not verify_password(password, user.password_hash):
            return None
        user.last_login = datetime.utcnow()
        db.flush()
        return _user_to_dict(user)


def get_user_by_id(user_id: str) -> Optional[dict]:
    with get_db() as db:
        user = db.query(UserDB).filter(UserDB.id == user_id).first()
        if not user:
            return None
        return _user_to_dict(user)
