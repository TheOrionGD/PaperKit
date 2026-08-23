"""Auth middleware — JWT token verification and current_user dependency"""
from datetime import timezone, datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt
from database import get_db
from config import get_settings
from bson import ObjectId

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

GUEST_USER_ID = ObjectId("000000000000000000000001")
GUEST_USER = {
    "_id": GUEST_USER_ID,
    "name": "Guest User",
    "email": "guest@paperkit.local",
    "is_guest": True,
    "preferences": {"dark_mode": False, "default_view": "list", "language": "en"},
}


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


GUEST_TOKENS = {"null", "undefined", "guest", "guest_access_token", "guest_token", ""}


from fastapi import Depends, HTTPException, status, Request

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    request: Request = None
):
    db = get_db()
    if not token and isinstance(request, Request):
        token = request.query_params.get("token") or request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    
    # Try decoding token if provided and not a guest token
    if token and token not in GUEST_TOKENS and not token.startswith("guest"):
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id and ObjectId.is_valid(user_id) and db is not None:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Seamless zero-auth open fallback: guest/local workspace user
    if db is not None:
        try:
            user = await db.users.find_one({"_id": GUEST_USER_ID})
            if not user:
                await db.users.insert_one(GUEST_USER.copy())
                user = GUEST_USER
            return user
        except Exception:
            return GUEST_USER

    return GUEST_USER


async def get_required_user(token: Optional[str] = Depends(oauth2_scheme)):
    if not token or token in GUEST_TOKENS or token.startswith("guest"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await get_current_user(token)
    if user.get("is_guest"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user



