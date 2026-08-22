"""
PaperKit Test Configuration — conftest.py
Provides isolated test fixtures using an in-memory MockDatabase and
a FastAPI TestClient so tests never touch production data.
"""
import os
import sys
import pytest
import asyncio
from datetime import timezone, datetime
from bson import ObjectId

# Ensure the Services directory is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

# ── Override environment BEFORE any app module imports ─────────────────────────
os.environ["MONGODB_URL"] = ""
os.environ["DATABASE_NAME"] = "paperkit_test"
os.environ["SECRET_KEY"] = ""
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
os.environ["GEMINI_API_KEY"] = ""
os.environ["FRONTEND_URL"] = "http://localhost:5173"

# Clear cached settings so they reload with test env vars
from config import get_settings
get_settings.cache_clear()

from httpx import AsyncClient, ASGITransport
from middleware.auth import create_access_token, hash_password
from database import get_db, MockDatabase, MockDatabaseClient
import database as db_module


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_db():
    """Reset the mock database to a clean state before each test."""
    # Create a fresh in-memory mock database that never writes to disk
    fresh_db = MockDatabase.__new__(MockDatabase)
    fresh_db.file_path = None
    fresh_db._data = {}
    # Override save_db to be a no-op so insert_one/update_one don't hit the filesystem
    fresh_db.save_db = lambda: None

    fresh_client = MockDatabaseClient.__new__(MockDatabaseClient)
    fresh_client.database = fresh_db
    db_module._client = fresh_client
    yield
    db_module._client = None


@pytest.fixture
def db():
    """Get the test mock database instance."""
    return get_db()


@pytest.fixture
def test_user_data():
    """Standard test user data."""
    return {
        "name": "Test User",
        "email": "test@paperkit.dev",
        "password": "TestPassword123!",
    }


@pytest.fixture
def test_user_doc():
    """A pre-built user document as it would exist in the DB."""
    user_id = ObjectId()
    return {
        "_id": user_id,
        "name": "Test User",
        "email": "test@paperkit.dev",
        "hashed_password": hash_password("TestPassword123!"),
        "avatar_url": None,
        "oauth_provider": None,
        "oauth_id": None,
        "created_at": datetime.now(timezone.utc),
        "preferences": {
            "dark_mode": False,
            "default_view": "list",
            "language": "en",
        },
    }


@pytest.fixture
def auth_token(test_user_doc):
    """Create a valid JWT for the test user."""
    return create_access_token({"sub": str(test_user_doc["_id"])})


@pytest.fixture
def auth_headers(auth_token):
    """Authorization headers with Bearer token."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
async def seeded_user(db, test_user_doc):
    """Insert the test user into the DB and return the doc."""
    await db.users.insert_one(test_user_doc)
    return test_user_doc


@pytest.fixture
def sample_pdf_bytes():
    """Generate a minimal valid PDF in memory."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((72, 72), "PaperKit Test Document\nThis is test content for automated testing.")
        pdf_bytes = doc.tobytes()
        doc.close()
        return pdf_bytes
    except ImportError:
        # Fallback: minimal valid PDF
        return (
            b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
            b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n"
            b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n"
            b"0000000058 00000 n \n0000000115 00000 n \n"
            b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
        )


@pytest.fixture
async def seeded_file(db, seeded_user, sample_pdf_bytes):
    """Insert a sample file record into the DB."""
    import tempfile, os
    from services.storage import LOCAL_STORAGE_DIR
    # Write PDF to a temp file for local storage
    os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)
    file_path = os.path.join(LOCAL_STORAGE_DIR, "test_doc.pdf")
    with open(file_path, "wb") as f:
        f.write(sample_pdf_bytes)

    file_id = ObjectId()
    file_doc = {
        "_id": file_id,
        "user_id": str(seeded_user["_id"]),
        "original_filename": "test_doc.pdf",
        "content_type": "application/pdf",
        "size": len(sample_pdf_bytes),
        "page_count": 1,
        "storage_url": "/storage/test_doc.pdf",
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.files.insert_one(file_doc)
    yield file_doc
    # Cleanup temp file
    if os.path.exists(file_path):
        os.remove(file_path)


@pytest.fixture
def app():
    """Create a fresh FastAPI app instance for testing."""
    # Import after env vars are set
    from main import app as fastapi_app
    return fastapi_app


@pytest.fixture
async def client(app):
    """Async HTTP test client using httpx."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
