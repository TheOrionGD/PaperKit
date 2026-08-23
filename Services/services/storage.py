"""Storage service — local fallback.

Phase 17 additions:
  - upload_file_sync     (for use in thread pools)
  - get_storage_usage    (aggregate file sizes for user)
  - get_file_metadata    (extended metadata)
"""
import os
import uuid
from config import get_settings

settings = get_settings()

LOCAL_STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "storage")
os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)


# ── Upload ────────────────────────────────────────────────────────────────────

async def upload_file(file_bytes: bytes, filename: str, content_type: str) -> dict:
    """Save locally."""
    return upload_file_sync(file_bytes, filename, content_type)


def upload_file_sync(file_bytes: bytes, filename: str, content_type: str) -> dict:
    """Synchronous upload — safe to call from thread pool workers."""
    safe_name = f"{uuid.uuid4().hex}_{filename}"
    path = os.path.join(LOCAL_STORAGE_DIR, safe_name)
    with open(path, "wb") as f:
        f.write(file_bytes)
    return {"storage_url": f"/storage/{safe_name}"}


# ── Delete ────────────────────────────────────────────────────────────────────

async def delete_file(storage_url: str):
    if storage_url.startswith("/storage/"):
        filename = storage_url.split("/storage/")[1]
        path = os.path.join(LOCAL_STORAGE_DIR, filename)
        if os.path.exists(path):
            os.remove(path)


# ── Read ──────────────────────────────────────────────────────────────────────

def get_file_bytes(storage_url: str) -> bytes:
    """Download file bytes from local path."""
    if storage_url.startswith("http"):
        import httpx
        resp = httpx.get(storage_url, timeout=60)
        resp.raise_for_status()
        return resp.content
    else:
        filename = storage_url.split("/storage/")[1]
        path = os.path.join(LOCAL_STORAGE_DIR, filename)
        with open(path, "rb") as f:
            return f.read()


# ── Phase 17 additions ────────────────────────────────────────────────────────

async def get_storage_usage(user_id: str, db) -> dict:
    """Return real storage usage stats for a user."""
    cursor = db.files.find({"user_id": user_id, "is_deleted": False})
    total_bytes = 0
    local_bytes = 0
    file_count  = 0

    async for doc in cursor:
        size = doc.get("size", 0) or 0
        total_bytes += size
        file_count  += 1
        local_bytes += size

    return {
        "totalBytes":  total_bytes,
        "localBytes":  local_bytes,
        "cloudBytes":  0,
        "fileCount":   file_count,
        "totalMB":     round(total_bytes / 1024 / 1024, 2),
        "localMB":     round(local_bytes / 1024 / 1024, 2),
        "cloudMB":     0,
    }


async def get_file_metadata(file_id: str, user_id: str, db) -> dict:
    """Return extended metadata for a file."""
    from bson import ObjectId
    from datetime import datetime
    doc = await db.files.find_one({"_id": ObjectId(file_id), "user_id": user_id, "is_deleted": False})
    if not doc:
        raise ValueError("File not found")

    storage_type = "local"
    return {
        "id":                str(doc["_id"]),
        "filename":          doc.get("original_filename", ""),
        "contentType":       doc.get("content_type", ""),
        "size":              doc.get("size", 0),
        "sizeMB":            round((doc.get("size", 0) or 0) / 1024 / 1024, 3),
        "pageCount":         doc.get("page_count"),
        "storageUrl":        doc.get("storage_url", ""),
        "storageType":       storage_type,
        "createdAt":         doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
        "updatedAt":         doc["updated_at"].isoformat() if isinstance(doc.get("updated_at"), datetime) else str(doc.get("updated_at", "")),
    }


async def cleanup_expired_guest_files(db, max_age_hours: int = 24) -> int:
    """Delete guest files older than max_age_hours from disk storage and MongoDB."""
    from datetime import datetime, timezone, timedelta
    from middleware.auth import GUEST_USER_ID

    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    cursor = db.files.find({
        "user_id": str(GUEST_USER_ID),
        "created_at": {"$lt": cutoff},
        "is_deleted": False
    })

    cleaned_count = 0
    async for doc in cursor:
        storage_url = doc.get("storage_url", "")
        if storage_url:
            try:
                await delete_file(storage_url)
            except Exception:
                pass
        await db.files.update_one(
            {"_id": doc["_id"]},
            {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc)}}
        )
        cleaned_count += 1

    return cleaned_count
