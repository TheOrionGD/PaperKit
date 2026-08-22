"""Unified processing-job system.

Lifecycle: CREATED → VALIDATING → QUEUED → PROCESSING → COMPLETED
                                                       → FAILED
                                                       → CANCELLED

Jobs are persisted in MongoDB `jobs` collection.
A singleton background worker drains the asyncio queue and dispatches work to
a ThreadPoolExecutor so CPU-bound processing doesn't block the event loop.
"""

from __future__ import annotations

import asyncio
import uuid
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from bson import ObjectId


# ── Constants ──────────────────────────────────────────────────────────────────

class JobStatus:
    CREATED    = "CREATED"
    VALIDATING = "VALIDATING"
    QUEUED     = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED  = "COMPLETED"
    FAILED     = "FAILED"
    CANCELLED  = "CANCELLED"


# ── Global state ──────────────────────────────────────────────────────────────

_queue: asyncio.Queue = asyncio.Queue()
_executor: ThreadPoolExecutor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="paperkit-worker")
_worker_task: Optional[asyncio.Task] = None

# Registry: operation_name → callable(job_doc, progress_cb) → list[dict] (output assets)
_handlers: dict[str, Callable] = {}


# ── Public API ────────────────────────────────────────────────────────────────

def register_handler(operation: str, fn: Callable):
    """Register a processing function for a given operation name."""
    _handlers[operation] = fn


async def create_job(
    db,
    user_id: str,
    operation: str,
    input_assets: list[dict],
    parameters: dict,
) -> dict:
    """Create a job document, persist to DB, enqueue for processing."""
    now = _utcnow()
    job_id = str(uuid.uuid4())

    doc = {
        "_id": ObjectId(),
        "jobId": job_id,
        "operation": operation,
        "userId": user_id,
        "inputAssets": input_assets,
        "outputAssets": [],
        "status": JobStatus.CREATED,
        "progress": 0,
        "parameters": parameters,
        "createdAt": now,
        "startedAt": None,
        "completedAt": None,
        "durationMs": None,
        "error": None,
    }

    await db.jobs.insert_one(doc)

    # Transition CREATED → VALIDATING
    await _update_job(db, job_id, {"status": JobStatus.VALIDATING, "progress": 5})

    # Transition VALIDATING → QUEUED
    await _update_job(db, job_id, {"status": JobStatus.QUEUED, "progress": 10})

    # Put on queue
    await _queue.put({"job_id": job_id, "db": db})

    return _serialize_job(doc | {"status": JobStatus.QUEUED, "progress": 10})


async def get_job(db, job_id: str, user_id: str) -> Optional[dict]:
    """Fetch job by jobId for the given user."""
    doc = await db.jobs.find_one({"jobId": job_id, "userId": user_id})
    if not doc:
        return None
    return _serialize_job(doc)


async def list_jobs(db, user_id: str, limit: int = 20, skip: int = 0) -> list[dict]:
    """List jobs for user, newest first."""
    cursor = db.jobs.find({"userId": user_id}).sort([("createdAt", -1)]).skip(skip).limit(limit)
    jobs = []
    async for doc in cursor:
        jobs.append(_serialize_job(doc))
    return jobs


async def cancel_job(db, job_id: str, user_id: str) -> bool:
    """Cancel a job if it's not yet PROCESSING/COMPLETED."""
    doc = await db.jobs.find_one({"jobId": job_id, "userId": user_id})
    if not doc:
        return False
    if doc["status"] in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
        return False
    await _update_job(db, job_id, {
        "status": JobStatus.CANCELLED,
        "completedAt": _utcnow(),
        "error": "Cancelled by user",
    })
    return True


# ── Background worker ─────────────────────────────────────────────────────────

async def start_worker():
    """Start the background job worker (called once on app startup)."""
    global _worker_task
    if _worker_task is None or _worker_task.done():
        _worker_task = asyncio.create_task(_worker_loop())


async def stop_worker():
    """Gracefully stop the worker."""
    global _worker_task
    if _worker_task and not _worker_task.done():
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass


async def _worker_loop():
    """Continuously drain the job queue."""
    loop = asyncio.get_running_loop()
    while True:
        try:
            item = await _queue.get()
            job_id = item["job_id"]
            db = item["db"]

            # Check if cancelled before starting
            doc = await db.jobs.find_one({"jobId": job_id})
            if not doc or doc["status"] == JobStatus.CANCELLED:
                _queue.task_done()
                continue

            # Transition → PROCESSING
            start_time = time.monotonic()
            await _update_job(db, job_id, {
                "status": JobStatus.PROCESSING,
                "progress": 15,
                "startedAt": _utcnow(),
            })

            handler = _handlers.get(doc["operation"])
            if not handler:
                await _fail_job(db, job_id, start_time, f"No handler for operation: {doc['operation']}")
                _queue.task_done()
                continue

            # Progress callback — runs in worker thread, schedules coroutine on loop
            def make_progress_cb(jid, dbase):
                def progress_cb(pct: int):
                    coro = _update_job(dbase, jid, {"progress": min(max(int(pct), 15), 95)})
                    asyncio.run_coroutine_threadsafe(coro, loop)
                return progress_cb

            try:
                output_assets = await loop.run_in_executor(
                    _executor,
                    _run_handler,
                    handler,
                    doc,
                    make_progress_cb(job_id, db),
                )
                duration_ms = int((time.monotonic() - start_time) * 1000)
                
                # Save all outputs to file history natively in async loop
                if output_assets:
                    for asset in output_assets:
                        await db.files.insert_one({
                            "user_id": doc["userId"],
                            "original_filename": asset.get("filename"),
                            "content_type": asset.get("contentType"),
                            "size": asset.get("size", 0),
                            "page_count": None,
                            "storage_url": asset.get("storageUrl"),
                            "is_deleted": False,
                            "created_at": _utcnow(),
                            "updated_at": _utcnow(),
                        })

                await _update_job(db, job_id, {
                    "status": JobStatus.COMPLETED,
                    "progress": 100,
                    "outputAssets": output_assets or [],
                    "completedAt": _utcnow(),
                    "durationMs": duration_ms,
                })
            except Exception as exc:
                await _fail_job(db, job_id, start_time, str(exc))

            _queue.task_done()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[JobWorker] Unexpected error: {e}")
            traceback.print_exc()


def _run_handler(handler: Callable, doc: dict, progress_cb: Callable) -> list[dict]:
    """Execute handler synchronously in thread pool."""
    return handler(doc, progress_cb)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _update_job(db, job_id: str, updates: dict):
    await db.jobs.update_one({"jobId": job_id}, {"$set": updates})


async def _fail_job(db, job_id: str, start_time: float, error: str):
    duration_ms = int((time.monotonic() - start_time) * 1000)
    await _update_job(db, job_id, {
        "status": JobStatus.FAILED,
        "completedAt": _utcnow(),
        "durationMs": duration_ms,
        "error": error,
    })


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_job(doc: dict) -> dict:
    def _fmt(v):
        if isinstance(v, datetime):
            return v.isoformat()
        return v

    return {
        "jobId":        doc.get("jobId", ""),
        "operation":    doc.get("operation", ""),
        "userId":       doc.get("userId", ""),
        "inputAssets":  doc.get("inputAssets", []),
        "outputAssets": doc.get("outputAssets", []),
        "status":       doc.get("status", ""),
        "progress":     doc.get("progress", 0),
        "parameters":   doc.get("parameters", {}),
        "createdAt":    _fmt(doc.get("createdAt")),
        "startedAt":    _fmt(doc.get("startedAt")),
        "completedAt":  _fmt(doc.get("completedAt")),
        "durationMs":   doc.get("durationMs"),
        "error":        doc.get("error"),
    }
