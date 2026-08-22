"""Archive tools router — delegates all work to the job system."""
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from middleware.auth import get_current_user
from services import job_service
from bson import ObjectId

router = APIRouter(prefix="/tools/archive", tags=["archive-tools"])

ARCHIVE_OPS = {"extract", "create_zip"}


async def _resolve_asset(file_id: str, user_id: str, db) -> dict:
    doc = await db.files.find_one({"_id": ObjectId(file_id), "user_id": user_id, "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail=f"File {file_id} not found")
    return {
        "fileId":     str(doc["_id"]),
        "filename":   doc.get("original_filename", ""),
        "storageUrl": doc.get("storage_url", ""),
        "contentType": doc.get("content_type", ""),
    }


@router.post("/{operation}")
async def run_archive_op(
    operation: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    if operation not in ARCHIVE_OPS:
        raise HTTPException(status_code=400, detail=f"Unknown archive operation: {operation}")

    db      = get_db()
    user_id = str(current_user["_id"])

    file_ids   = body.get("file_ids", [])
    primary_id = body.get("file_id") or (file_ids[0] if file_ids else None)
    if not primary_id:
        raise HTTPException(status_code=400, detail="file_id or file_ids required")

    input_assets = [await _resolve_asset(primary_id, user_id, db)]
    for fid in (file_ids[1:] if len(file_ids) > 1 else []):
        input_assets.append(await _resolve_asset(fid, user_id, db))

    parameters = {k: v for k, v in body.items() if k not in ("file_id", "file_ids")}

    job = await job_service.create_job(
        db, user_id, f"archive.{operation}", input_assets, parameters
    )
    return job
