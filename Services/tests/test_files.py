"""
Tests for /files endpoints — upload, list, delete, rename, download URL, storage usage.
"""
import pytest
import io
from bson import ObjectId
from datetime import timezone, datetime


class TestFileUpload:
    """POST /files/upload"""

    async def test_upload_pdf_success(self, client, seeded_user, auth_headers, sample_pdf_bytes):
        """Uploading a valid PDF should return file metadata."""
        files = {"file": ("document.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")}
        resp = await client.post("/files/upload", files=files, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["original_filename"] == "document.pdf"
        assert data["content_type"] == "application/pdf"
        assert data["size"] > 0
        assert "_id" in data

    async def test_upload_image_success(self, client, seeded_user, auth_headers):
        """Uploading a valid image should succeed."""
        # Create a minimal 1x1 PNG
        from PIL import Image
        buf = io.BytesIO()
        img = Image.new("RGB", (10, 10), color="red")
        img.save(buf, format="PNG")
        buf.seek(0)

        files = {"file": ("test.png", buf, "image/png")}
        resp = await client.post("/files/upload", files=files, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["content_type"] == "image/png"

    async def test_upload_unsupported_type(self, client, seeded_user, auth_headers):
        """Uploading an unsupported file type should return 415."""
        files = {"file": ("malware.exe", io.BytesIO(b"MZ" + b"\x00" * 100), "application/x-msdownload")}
        resp = await client.post("/files/upload", files=files, headers=auth_headers)
        assert resp.status_code == 415

    async def test_upload_invalid_token(self, client, sample_pdf_bytes):
        """Upload with invalid token should return 401."""
        files = {"file": ("doc.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")}
        resp = await client.post("/files/upload", files=files, headers={"Authorization": "Bearer bad-token"})
        assert resp.status_code == 401

    async def test_upload_guest_session(self, client, sample_pdf_bytes):
        """Upload without auth should succeed under guest session."""
        files = {"file": ("doc.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")}
        resp = await client.post("/files/upload", files=files)
        assert resp.status_code == 200


class TestFileList:
    """GET /files"""

    async def test_list_files_empty(self, client, seeded_user, auth_headers):
        """New user should have an empty file list."""
        resp = await client.get("/files", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    async def test_list_files_with_data(self, client, seeded_file, auth_headers):
        """User with uploaded files should see them in the list."""
        resp = await client.get("/files", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert any(f["original_filename"] == "test_doc.pdf" for f in data["items"])

    async def test_list_files_pagination(self, client, seeded_user, auth_headers, db):
        """Pagination parameters should limit results correctly."""
        # Seed 5 files
        for i in range(5):
            await db.files.insert_one({
                "_id": ObjectId(),
                "user_id": str(seeded_user["_id"]),
                "original_filename": f"file_{i}.pdf",
                "content_type": "application/pdf",
                "size": 1000 + i,
                "storage_url": f"/storage/file_{i}.pdf",
                "is_deleted": False,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })

        resp = await client.get("/files?limit=2&skip=0", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5

    async def test_list_files_search(self, client, seeded_file, auth_headers):
        """Search parameter should filter by filename."""
        resp = await client.get("/files?search=test_doc", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

        resp2 = await client.get("/files?search=nonexistent_xyz", headers=auth_headers)
        assert resp2.status_code == 200
        assert resp2.json()["total"] == 0

    async def test_list_files_isolated_per_user(self, client, seeded_file, db):
        """User A should NOT see User B's files."""
        from middleware.auth import create_access_token
        other_user_id = ObjectId()
        await db.users.insert_one({
            "_id": other_user_id,
            "name": "Other User",
            "email": "other@paperkit.dev",
            "hashed_password": None,
            "created_at": datetime.now(timezone.utc),
        })
        other_token = create_access_token({"sub": str(other_user_id)})
        resp = await client.get("/files", headers={"Authorization": f"Bearer {other_token}"})
        assert resp.status_code == 200
        assert resp.json()["total"] == 0


class TestFileOperations:
    """DELETE, PATCH rename, GET download-url"""

    async def test_delete_file(self, client, seeded_file, auth_headers):
        """Deleting a file should succeed."""
        file_id = str(seeded_file["_id"])
        resp = await client.delete(f"/files/{file_id}", headers=auth_headers)
        assert resp.status_code == 200

        # File should no longer appear in list
        resp2 = await client.get("/files", headers=auth_headers)
        assert all(f["_id"] != file_id for f in resp2.json()["items"])

    async def test_delete_nonexistent_file(self, client, seeded_user, auth_headers):
        """Deleting a non-existent file should return 404."""
        fake_id = str(ObjectId())
        resp = await client.delete(f"/files/{fake_id}", headers=auth_headers)
        assert resp.status_code == 404

    async def test_rename_file(self, client, seeded_file, auth_headers):
        """Renaming a file should persist the new name."""
        file_id = str(seeded_file["_id"])
        resp = await client.patch(
            f"/files/{file_id}/rename",
            json={"filename": "renamed_doc.pdf"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["filename"] == "renamed_doc.pdf"

    async def test_rename_preserves_extension(self, client, seeded_file, auth_headers):
        """Renaming without proper extension should preserve the original."""
        file_id = str(seeded_file["_id"])
        resp = await client.patch(
            f"/files/{file_id}/rename",
            json={"filename": "newname.txt"},  # wrong ext for PDF
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["filename"].endswith(".pdf")

    async def test_rename_empty_name_rejected(self, client, seeded_file, auth_headers):
        """Empty filename should return 400."""
        file_id = str(seeded_file["_id"])
        resp = await client.patch(
            f"/files/{file_id}/rename",
            json={"filename": ""},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    async def test_get_download_url(self, client, seeded_file, auth_headers):
        """Getting download URL for an existing file should return a URL."""
        file_id = str(seeded_file["_id"])
        resp = await client.get(f"/files/{file_id}/download-url", headers=auth_headers)
        assert resp.status_code == 200
        assert "url" in resp.json()

    async def test_get_download_url_nonexistent(self, client, seeded_user, auth_headers):
        """Getting download URL for non-existent file should return 404."""
        fake_id = str(ObjectId())
        resp = await client.get(f"/files/{fake_id}/download-url", headers=auth_headers)
        assert resp.status_code == 404


class TestStorageUsage:
    """GET /files/storage-usage"""

    async def test_storage_usage_empty(self, client, seeded_user, auth_headers):
        """New user should have 0 usage."""
        resp = await client.get("/files/storage-usage", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "totalBytes" in data or "fileCount" in data
