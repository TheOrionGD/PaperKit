"""Jobs router — create, poll, list, cancel processing jobs."""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from database import get_db
from middleware.auth import get_current_user
from services import job_service
import json

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("")
async def create_job(body: dict, current_user: dict = Depends(get_current_user)):
    """Enqueue a new processing job."""
    operation   = body.get("operation")
    input_assets = body.get("inputAssets", [])
    parameters  = body.get("parameters", {})

    if not operation:
        raise HTTPException(status_code=400, detail="operation is required")
    if not input_assets:
        raise HTTPException(status_code=400, detail="inputAssets is required")

    db      = get_db()
    user_id = str(current_user["_id"])

    job = await job_service.create_job(db, user_id, operation, input_assets, parameters)
    return job


@router.get("")
async def list_jobs(
    limit: int = Query(20, ge=1, le=100),
    skip:  int = Query(0,  ge=0),
    current_user: dict = Depends(get_current_user),
):
    db      = get_db()
    user_id = str(current_user["_id"])
    jobs    = await job_service.list_jobs(db, user_id, limit=limit, skip=skip)
    return {"items": jobs, "total": len(jobs)}


@router.get("/{job_id}")
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db      = get_db()
    user_id = str(current_user["_id"])
    job     = await job_service.get_job(db, job_id, user_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}")
async def cancel_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db      = get_db()
    user_id = str(current_user["_id"])
    ok      = await job_service.cancel_job(db, job_id, user_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Job cannot be cancelled")
    return {"message": "Job cancelled"}


@router.get("/{job_id}/events")
async def job_events(job_id: str, current_user: dict = Depends(get_current_user)):
    """Server-Sent Events stream — client receives updates until job finishes."""
    db      = get_db()
    user_id = str(current_user["_id"])

    async def event_generator():
        terminal = {
            job_service.JobStatus.COMPLETED,
            job_service.JobStatus.FAILED,
            job_service.JobStatus.CANCELLED,
        }
        while True:
            job = await job_service.get_job(db, job_id, user_id)
            if not job:
                yield "data: {\"error\": \"not found\"}\n\n"
                break
            payload = json.dumps(job)
            yield f"data: {payload}\n\n"
            if job["status"] in terminal:
                break
            await asyncio.sleep(0.8)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
