"""Files router — upload, list, delete, download URL, storage usage, cloud sync"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from database import get_db
from middleware.auth import get_current_user
from services.storage import upload_file, delete_file, get_storage_usage, get_file_metadata
from services.processing import get_page_count
from bson import ObjectId
from datetime import timezone, datetime

router = APIRouter(prefix="/files", tags=["files"])

ALLOWED_TYPES = {
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff",
    "image/svg+xml",
    "text/plain", "text/html",
    # Video
    "video/mp4", "video/x-msvideo", "video/x-matroska", "video/quicktime",
    "video/webm", "video/mpeg", "video/3gpp",
    # Audio
    "audio/mpeg", "audio/wav", "audio/aac", "audio/ogg", "audio/flac",
    # Archives
    "application/zip", "application/x-zip-compressed",
    "application/x-rar-compressed", "application/vnd.rar",
    "application/x-7z-compressed",
    "application/octet-stream",
}

MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB (supports large video files)


@router.get("")
async def list_files(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    search: str = Query(None),
    category: str = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_id = str(current_user["_id"])
    
    cursor = db.files.find({"user_id": user_id, "is_deleted": False})
    all_files = []
    async for f in cursor:
        all_files.append(f)
        
    if search:
        s_lower = search.lower()
        all_files = [f for f in all_files if s_lower in f.get("original_filename", "").lower()]
        
    if category and category != "all":
        ext_map = {
            "pdf": ["pdf"],
            "word": ["doc", "docx"],
            "image": ["jpg", "jpeg", "png", "gif", "webp"],
            "others": ["xls", "xlsx", "ppt", "pptx", "txt", "html", "md"]
        }
        if category in ext_map:
            allowed_exts = ext_map[category]
            all_files = [
                f for f in all_files 
                if f.get("original_filename", "").split(".")[-1].lower() in allowed_exts
            ]
        elif category == "others":
            known_exts = []
            for exts in ext_map.values():
                known_exts.extend(exts)
            all_files = [
                f for f in all_files
                if f.get("original_filename", "").split(".")[-1].lower() not in known_exts
            ]

    reverse = (order == "desc")
    def get_sort_key(f):
        val = f.get(sort)
        if val is None:
            if sort in ("created_at", "updated_at"):
                return datetime.min
            elif sort == "size":
                return 0
            return ""
        return val
        
    all_files.sort(key=get_sort_key, reverse=reverse)
    total = len(all_files)
    
    paginated_files = all_files[skip : skip + limit]
    
    files = []
    for f in paginated_files:
        files.append({
            "_id": str(f["_id"]),
            "original_filename": f["original_filename"],
            "content_type": f["content_type"],
            "size": f["size"],
            "page_count": f.get("page_count"),
            "created_at": f["created_at"].isoformat() if isinstance(f["created_at"], datetime) else str(f["created_at"]),
            "status": f.get("status", "ready"),
            "thumbnail_url": f.get("thumbnail_url") or (f["storage_url"] if f["content_type"].startswith("image/") else None)
        })
        
    return {"items": files, "total": total}


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB)")

    storage = await upload_file(content, file.filename, file.content_type)

    # Count pages for PDFs
    page_count = None
    if file.content_type == "application/pdf":
        try:
            page_count = get_page_count(content)
        except Exception:
            pass

    db = get_db()
    doc = {
        "user_id": str(current_user["_id"]),
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "page_count": page_count,
        "storage_url": storage["storage_url"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.files.insert_one(doc)
    return {
        "_id": str(result.inserted_id),
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "page_count": page_count,
    }


@router.delete("/{file_id}")
async def delete_file_route(file_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    f = await db.files.find_one({"_id": ObjectId(file_id), "user_id": str(current_user["_id"])})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    await delete_file(f["storage_url"])
    await db.files.update_one({"_id": ObjectId(file_id)}, {"$set": {"is_deleted": True}})
    return {"message": "File deleted"}


@router.get("/{file_id}/download-url")
async def get_download_url(file_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    f = await db.files.find_one({"_id": ObjectId(file_id), "user_id": str(current_user["_id"]), "is_deleted": False})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return {"url": f["storage_url"]}


@router.patch("/{file_id}/rename")
async def rename_file(
    file_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    new_name = body.get("filename")
    if not new_name:
        raise HTTPException(status_code=400, detail="filename is required")
    
    db = get_db()
    f = await db.files.find_one({"_id": ObjectId(file_id), "user_id": str(current_user["_id"]), "is_deleted": False})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
        
    # Preserve original extension if not provided or different in new name
    old_filename = f["original_filename"]
    old_ext = old_filename.rsplit(".", 1)[-1] if "." in old_filename else ""
    new_ext = new_name.rsplit(".", 1)[-1] if "." in new_name else ""
    
    if old_ext and new_ext.lower() != old_ext.lower():
        # Keep old extension
        new_name = f"{new_name.rsplit('.', 1)[0]}.{old_ext}"
        
    await db.files.update_one(
        {"_id": ObjectId(file_id)},
        {"$set": {"original_filename": new_name, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "File renamed successfully", "filename": new_name}


# ── Phase 17: Storage endpoints ───────────────────────────────────────────────

@router.get("/storage-usage")
async def storage_usage(current_user: dict = Depends(get_current_user)):
    """Return real storage usage statistics for the current user."""
    db      = get_db()
    user_id = str(current_user["_id"])
    return await get_storage_usage(user_id, db)


@router.get("/{file_id}/metadata")
async def file_metadata(file_id: str, current_user: dict = Depends(get_current_user)):
    """Return extended metadata for a file."""
    db      = get_db()
    user_id = str(current_user["_id"])
    try:
        return await get_file_metadata(file_id, user_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
