"""PaperKit FastAPI application entry point — Open-Source PDF & Document Suite"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

import asyncio
from services.storage import cleanup_expired_guest_files
from database import get_db, close_client
from config import get_settings
from routers.auth import router as auth_router
from routers.files import router as files_router
from routers.tools import router as tools_router
from routers.ai import router as ai_router
from routers.jobs import router as jobs_router
from services import job_service

settings = get_settings()

# Ensure __init__.py files exist
for pkg in ["routers", "services", "models", "middleware"]:
    init = os.path.join(os.path.dirname(__file__), pkg, "__init__.py")
    if not os.path.exists(init):
        open(init, "w").close()


async def _guest_cleanup_loop():
    while True:
        try:
            await asyncio.sleep(3600)  # Run once every hour
            db = get_db()
            if db is not None:
                cleaned = await cleanup_expired_guest_files(db, max_age_hours=24)
                if cleaned > 0:
                    print(f"[Storage] Auto-purged {cleaned} expired guest session files.")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Storage] Guest cleanup error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — launch background job worker & guest cleanup task
    await job_service.start_worker()
    cleanup_task = asyncio.create_task(_guest_cleanup_loop())
    yield
    # Shutdown
    cleanup_task.cancel()
    await job_service.stop_worker()
    await close_client()


app = FastAPI(
    title="PaperKit API",
    description="Open-Source PDF & Document Suite — backend API",
    version="2.0.0",
    lifespan=lifespan,
)

origins = [
    settings.frontend_url,
    "https://paperkit-web.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://localhost",
    "https://localhost",
    "capacitor://localhost",
    "ionic://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?|capacitor://.*|ionic://.*|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Length", "X-Filename"],
)

# HTTP Request & Response Logging Middleware
import time
from fastapi import Request

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    method = request.method
    path = request.url.path
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        print(f"[API LOG] {method} {path} => Status: {response.status_code} ({duration_ms:.2f}ms) | Client: {client_ip}")
        return response
    except Exception as exc:
        duration_ms = (time.time() - start_time) * 1000
        print(f"[API LOG ERROR] {method} {path} => FAILED: {exc} ({duration_ms:.2f}ms) | Client: {client_ip}")
        raise exc


# Custom StaticFiles wrapper with explicit OpenXML/PDF MIME types & Content-Disposition
class CustomStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        filename = os.path.basename(path)
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        mime_types = {
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'ppt': 'application/vnd.ms-powerpoint',
            'pdf': 'application/pdf',
            'txt': 'text/plain; charset=utf-8',
            'html': 'text/html; charset=utf-8',
            'md': 'text/markdown; charset=utf-8',
        }
        if ext in mime_types:
            response.headers['content-type'] = mime_types[ext]
        response.headers['content-disposition'] = f'attachment; filename="{filename}"'
        response.headers['access-control-expose-headers'] = 'Content-Disposition, Content-Type'
        return response

storage_dir = os.path.join(os.path.dirname(__file__), "storage")
os.makedirs(storage_dir, exist_ok=True)
app.mount("/storage", CustomStaticFiles(directory=storage_dir), name="storage")

# Routers
app.include_router(auth_router)
app.include_router(files_router)
app.include_router(tools_router)
app.include_router(ai_router)
app.include_router(jobs_router)


from fastapi.responses import Response

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
