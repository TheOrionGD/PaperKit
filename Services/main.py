"""PaperKit FastAPI application entry point"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from database import close_client
from config import get_settings
from routers.auth import router as auth_router
from routers.files import router as files_router
from routers.tools import router as tools_router
from routers.ai import router as ai_router
from routers.jobs import router as jobs_router
from routers.image_tools import router as image_tools_router
from routers.video_tools import router as video_tools_router
from routers.archive_tools import router as archive_tools_router
from services import job_service
from services.image_processing import handle_image_job
from services.video_processing import handle_video_job
from services.archive_processing import handle_archive_job

settings = get_settings()

# Ensure __init__.py files exist
for pkg in ["routers", "services", "models", "middleware"]:
    init = os.path.join(os.path.dirname(__file__), pkg, "__init__.py")
    if not os.path.exists(init):
        open(init, "w").close()

# Register job handlers
job_service.register_handler("image.convert",            handle_image_job)
job_service.register_handler("image.resize",             handle_image_job)
job_service.register_handler("image.crop",               handle_image_job)
job_service.register_handler("image.rotate",             handle_image_job)
job_service.register_handler("image.flip",               handle_image_job)
job_service.register_handler("image.brightness",         handle_image_job)
job_service.register_handler("image.contrast",           handle_image_job)
job_service.register_handler("image.saturation",         handle_image_job)
job_service.register_handler("image.sharpness",          handle_image_job)
job_service.register_handler("image.background_removal", handle_image_job)
job_service.register_handler("image.watermark",          handle_image_job)
job_service.register_handler("image.vectorize",          handle_image_job)

job_service.register_handler("video.convert",        handle_video_job)
job_service.register_handler("video.transcode",      handle_video_job)
job_service.register_handler("video.trim",           handle_video_job)
job_service.register_handler("video.merge",          handle_video_job)
job_service.register_handler("video.extract_audio",  handle_video_job)
job_service.register_handler("video.normalize_audio",handle_video_job)
job_service.register_handler("video.extract_frames", handle_video_job)
job_service.register_handler("video.frames_to_video",handle_video_job)
job_service.register_handler("video.frames_to_gif",  handle_video_job)

job_service.register_handler("archive.extract",    handle_archive_job)
job_service.register_handler("archive.create_zip", handle_archive_job)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — launch background job worker
    await job_service.start_worker()
    yield
    # Shutdown
    await job_service.stop_worker()
    await close_client()


app = FastAPI(
    title="PaperKit API",
    description="All-in-One Document & Media Solution — backend API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve local storage files (only used if Cloudinary is not configured)
storage_dir = os.path.join(os.path.dirname(__file__), "storage")
os.makedirs(storage_dir, exist_ok=True)
app.mount("/storage", StaticFiles(directory=storage_dir), name="storage")

# Routers
app.include_router(auth_router)
app.include_router(files_router)
app.include_router(tools_router)
app.include_router(ai_router)
app.include_router(jobs_router)
app.include_router(image_tools_router)
app.include_router(video_tools_router)
app.include_router(archive_tools_router)


from fastapi.responses import Response, JSONResponse

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "PaperKit API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health",
        "environment": settings.environment if hasattr(settings, 'environment') else "production"
    }

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "PaperKit API", "version": "2.0.0"}

