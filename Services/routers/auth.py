"""Auth router — register, login, me, update profile, delete account (No Firebase)"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timezone, datetime
from database import get_db
from middleware.auth import hash_password, verify_password, create_access_token, get_current_user, get_required_user
from services.storage import delete_file
from config import get_settings
from bson import ObjectId

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
async def get_me(current_user: dict = Depends(get_required_user)):
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
async def update_me(body: dict, current_user: dict = Depends(get_required_user)):
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


@router.delete("/delete-account")
async def delete_account(current_user: dict = Depends(get_required_user)):
    db = get_db()
    user_id = str(current_user["_id"])

    cursor = db.files.find({"user_id": user_id})
    async for f in cursor:
        try:
            await delete_file(f["storage_url"])
        except Exception as e:
            print(f"Error deleting file {f['_id']} from storage: {e}")

    await db.files.delete_many({"user_id": user_id})
    await db.users.delete_one({"_id": current_user["_id"]})

    return {"message": "Account and all associated files deleted successfully"}

@router.delete("/clear-session")
async def clear_session(current_user: dict = Depends(get_required_user)):
    db = get_db()
    user_id = str(current_user["_id"])

    cursor = db.files.find({"user_id": user_id})
    async for f in cursor:
        try:
            if "storage_url" in f and f["storage_url"]:
                await delete_file(f["storage_url"])
        except Exception as e:
            print(f"Error deleting file {f.get('_id')} from storage: {e}")

    await db.files.delete_many({"user_id": user_id})
    
    try:
        await db.jobs.delete_many({"user_id": user_id})
        await db.history.delete_many({"user_id": user_id})
        await db.ai_usage_logs.delete_many({"user_id": user_id})
    except Exception:
        pass

    return {"message": "Session data cleared successfully"}
