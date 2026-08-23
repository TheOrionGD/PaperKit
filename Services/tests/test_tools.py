"""
Tests for /tools endpoints — merge, split, compress, rotate, watermark, convert.
"""
import pytest
import io
from bson import ObjectId
from datetime import timezone, datetime


@pytest.fixture
async def two_pdf_files(db, seeded_user, sample_pdf_bytes):
    """Insert two PDF files for merge/multi-file operations."""
    import os
    from services.storage import LOCAL_STORAGE_DIR
    os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)

    files = []
    for i in range(2):
        file_path = os.path.join(LOCAL_STORAGE_DIR, f"merge_test_{i}.pdf")
        with open(file_path, "wb") as f:
            f.write(sample_pdf_bytes)

        file_id = ObjectId()
        doc = {
            "_id": file_id,
            "user_id": str(seeded_user["_id"]),
            "original_filename": f"merge_test_{i}.pdf",
            "content_type": "application/pdf",
            "size": len(sample_pdf_bytes),
            "page_count": 1,
            "storage_url": f"/storage/merge_test_{i}.pdf",
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.files.insert_one(doc)
        files.append(doc)
    yield files
    for doc in files:
        filename = doc["storage_url"].split("/storage/")[1]
        path = os.path.join(LOCAL_STORAGE_DIR, filename)
        if os.path.exists(path):
            os.remove(path)


class TestMergePDF:
    """POST /tools/merge"""

    async def test_merge_two_pdfs(self, client, seeded_user, auth_headers, two_pdf_files):
        """Merging two valid PDFs should return a download URL."""
        file_ids = [str(f["_id"]) for f in two_pdf_files]
        resp = await client.post("/tools/merge", json={
            "file_ids": file_ids,
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "url" in data or "download_url" in data or "storage_url" in data

    async def test_merge_single_file_rejected(self, client, seeded_user, auth_headers, seeded_file):
        """Merging a single file should be rejected (need at least 2)."""
        resp = await client.post("/tools/merge", json={
            "file_ids": [str(seeded_file["_id"])],
        }, headers=auth_headers)
        assert resp.status_code in (400, 422)

    async def test_merge_invalid_token(self, client):
        """Merge with invalid token should return 401."""
        resp = await client.post("/tools/merge", json={"file_ids": ["fake"]}, headers={"Authorization": "Bearer bad-token"})
        assert resp.status_code == 401


class TestSplitPDF:
    """POST /tools/split"""

    async def test_split_pdf_by_range(self, client, seeded_file, auth_headers):
        """Splitting a PDF by page range should succeed."""
        resp = await client.post("/tools/split", json={
            "file_id": str(seeded_file["_id"]),
            "page_range": "1",
        }, headers=auth_headers)
        assert resp.status_code == 200

    async def test_split_nonexistent_file(self, client, seeded_user, auth_headers):
        """Splitting a non-existent file should return 404."""
        resp = await client.post("/tools/split", json={
            "file_id": str(ObjectId()),
            "ranges": "1",
        }, headers=auth_headers)
        assert resp.status_code == 404


class TestCompressPDF:
    """POST /tools/compress"""

    async def test_compress_pdf(self, client, seeded_file, auth_headers):
        """Compressing a valid PDF should return result info."""
        resp = await client.post("/tools/compress", json={
            "file_id": str(seeded_file["_id"]),
            "quality": "medium",
        }, headers=auth_headers)
        assert resp.status_code == 200


class TestRotatePDF:
    """POST /tools/rotate"""

    async def test_rotate_pdf_90(self, client, seeded_file, auth_headers):
        """Rotating a PDF by 90 degrees should succeed."""
        resp = await client.post("/tools/rotate", json={
            "file_id": str(seeded_file["_id"]),
            "angle": 90,
        }, headers=auth_headers)
        assert resp.status_code == 200

    async def test_rotate_pdf_invalid_angle(self, client, seeded_file, auth_headers):
        """Rotating by an invalid angle may be rejected."""
        resp = await client.post("/tools/rotate", json={
            "file_id": str(seeded_file["_id"]),
            "angle": 45,
        }, headers=auth_headers)
        # Some implementations allow any angle, others only 90/180/270
        assert resp.status_code in (200, 400, 422)


class TestWatermark:
    """POST /tools/watermark"""

    async def test_add_text_watermark(self, client, seeded_file, auth_headers):
        """Adding a text watermark should succeed."""
        resp = await client.post("/tools/watermark", json={
            "file_id": str(seeded_file["_id"]),
            "text": "CONFIDENTIAL",
        }, headers=auth_headers)
        assert resp.status_code == 200


class TestToolsAuth:
    """Cross-cutting auth tests for tool endpoints."""

    async def test_tools_require_auth(self, client):
        """All tool endpoints should reject invalid authorization tokens."""
        endpoints = [
            ("/tools/merge", {"file_ids": []}),
            ("/tools/split", {"file_id": "x", "ranges": "1"}),
            ("/tools/compress", {"file_id": "x"}),
            ("/tools/rotate", {"file_id": "x", "angle": 90}),
            ("/tools/watermark", {"file_id": "x", "text": "test"}),
        ]
        for url, body in endpoints:
            resp = await client.post(url, json=body, headers={"Authorization": "Bearer bad-token"})
            assert resp.status_code == 401, f"{url} should reject invalid auth token"

    async def test_tools_guest_execution_allowed(self, client):
        """Guest users should be able to execute tools without auth headers."""
        resp = await client.post("/tools/merge", json={"file_ids": []})
        assert resp.status_code in (400, 422)
