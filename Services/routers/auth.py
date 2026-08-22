"""Auth router — register, login, me, Google OAuth"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from datetime import timezone, datetime, timedelta
from database import get_db
from middleware.auth import hash_password, verify_password, create_access_token, get_current_user
from config import get_settings
from bson import ObjectId
import httpx
import time
from jose import jwt
from pydantic import BaseModel
from typing import Optional

# Caching Firebase public keys (certificates)
_certs_cache = {}
_certs_expiry = 0

async def get_firebase_certs():
    global _certs_cache, _certs_expiry
    now = time.time()
    if not _certs_cache or now > _certs_expiry:
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com")
            if resp.status_code == 200:
                _certs_cache = resp.json()
                cache_control = resp.headers.get("cache-control", "")
                max_age = 3600
                for part in cache_control.split(","):
                    if "max-age" in part:
                        try:
                            max_age = int(part.split("=")[1].strip())
                        except Exception:
                            pass
                _certs_expiry = now + max_age
    return _certs_cache

async def verify_firebase_id_token(id_token: str, project_id: str) -> dict:
    try:
        header = jwt.get_unverified_header(id_token)
        kid = header.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Missing key ID (kid) in Firebase token header")
        
        certs = await get_firebase_certs()
        if kid not in certs:
            raise HTTPException(status_code=401, detail="Invalid key ID (kid) in Firebase token header")
        
        cert_pem = certs[kid]
        
        claims = jwt.decode(
            id_token,
            cert_pem,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}"
        )
        return claims
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Firebase token verification failed: {str(e)}"
        )

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/register")
async def register(body: dict):
    name = body.get("name", "").strip()
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="name, email and password are required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    db = get_db()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_doc = {
        "name": name,
        "email": email,
        "hashed_password": hash_password(password),
        "avatar_url": None,
        "oauth_provider": None,
        "oauth_id": None,
        "created_at": datetime.now(timezone.utc),
        "preferences": {
            "dark_mode": False,
            "default_view": "list",
            "language": "en"
        }
    }
    result = await db.users.insert_one(user_doc)
    return {"message": "Account created successfully", "user_id": str(result.inserted_id)}


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    user = await db.users.find_one({"email": form_data.username.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("hashed_password"):
        raise HTTPException(status_code=401, detail="This account uses OAuth login")
    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user["_id"])})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "avatar_url": current_user.get("avatar_url"),
        "preferences": current_user.get("preferences") or {
            "dark_mode": False,
            "default_view": "list",
            "language": "en"
        },
        "created_at": current_user.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(current_user.get("created_at"), datetime) else str(current_user.get("created_at"))
    }


@router.put("/me")
async def update_me(body: dict, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user["_id"]
    update_data = {}

    if "name" in body:
        name = body["name"].strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        update_data["name"] = name

    if "password" in body and body["password"]:
        new_pass = body["password"]
        if not current_user.get("hashed_password"):
            raise HTTPException(status_code=400, detail="Cannot change password for OAuth account")
        if len(new_pass) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        update_data["hashed_password"] = hash_password(new_pass)

    if "preferences" in body:
        preferences = current_user.get("preferences") or {
            "dark_mode": False,
            "default_view": "list",
            "language": "en"
        }
        if isinstance(body["preferences"], dict):
            for k, v in body["preferences"].items():
                preferences[k] = v
        update_data["preferences"] = preferences

    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.users.update_one({"_id": user_id}, {"$set": update_data})

    updated = await db.users.find_one({"_id": user_id})
    return {
        "id": str(updated["_id"]),
        "name": updated["name"],
        "email": updated["email"],
        "avatar_url": updated.get("avatar_url"),
        "preferences": updated.get("preferences") or {
            "dark_mode": False,
            "default_view": "list",
            "language": "en"
        },
        "created_at": updated.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(updated.get("created_at"), datetime) else str(updated.get("created_at"))
    }


from services.storage import delete_file

@router.delete("/delete-account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])

    # Delete all user's files from storage
    cursor = db.files.find({"user_id": user_id})
    async for f in cursor:
        try:
            await delete_file(f["storage_url"])
        except Exception as e:
            print(f"Error deleting file {f['_id']} from storage: {e}")

    # Delete file records from DB
    await db.files.delete_many({"user_id": user_id})

    # Delete user record from DB
    await db.users.delete_one({"_id": current_user["_id"]})

    return {"message": "Account and all associated files deleted successfully"}





class FirebaseLoginRequest(BaseModel):
    idToken: str
    name: Optional[str] = None

@router.post("/firebase")
async def firebase_login(body: FirebaseLoginRequest):
    """Verify Firebase ID token, find/create user in MongoDB, and return backend JWT"""
    project_id = settings.firebase_project_id
    claims = await verify_firebase_id_token(body.idToken, project_id)
    
    email = claims.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided in token claims")
        
    uid = claims.get("sub")
    name = body.name or claims.get("name") or email.split("@")[0]
    picture = claims.get("picture")
    
    db = get_db()
    user = await db.users.find_one({"email": email})
    
    avatar_url = None
    if user:
        user_id = str(user["_id"])
        # Update provider to firebase to link the login session
        update_set = {
            "oauth_provider": "firebase",
            "oauth_id": uid
        }
        
        # If user has a google picture but does not have a Cloudinary avatar_url, sync it
        existing_avatar = user.get("avatar_url")
        is_cloudinary = existing_avatar and ("res.cloudinary.com" in existing_avatar or "/storage/" in existing_avatar)
        if picture and not existing_avatar:
            avatar_url = picture
            if avatar_url:
                update_set["avatar_url"] = avatar_url
                
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": update_set}
        )
    else:
        if picture:
            avatar_url = picture
            
        # Create a new user record
        user_doc = {
            "name": name,
            "email": email,
            "hashed_password": None,
            "avatar_url": avatar_url or picture,
            "oauth_provider": "firebase",
            "oauth_id": uid,
            "created_at": datetime.now(timezone.utc),
            "preferences": {
                "dark_mode": False,
                "default_view": "list",
                "language": "en"
            }
        }
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
    jwt_token = create_access_token({"sub": user_id})
    return {"access_token": jwt_token, "token_type": "bearer"}

