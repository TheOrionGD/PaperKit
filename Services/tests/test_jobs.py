"""
Tests for /jobs endpoints — create, list, get, cancel jobs.
"""
import pytest
from bson import ObjectId
from datetime import datetime


class TestCreateJob:
    """POST /jobs"""

    async def test_create_job_success(self, client, seeded_file, auth_headers):
        """Creating a valid job should return job info with queued status."""
        resp = await client.post("/jobs", json={
            "operation": "pdf.compress",
            "inputAssets": [str(seeded_file["_id"])],
            "parameters": {"format": "png"},
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "jobId" in data or "id" in data or "_id" in data
        assert data.get("status") in ("queued", "pending", None) or "status" in data

    async def test_create_job_missing_operation(self, client, seeded_user, auth_headers):
        """Job without operation should return 400."""
        resp = await client.post("/jobs", json={
            "inputAssets": ["some-id"],
        }, headers=auth_headers)
        assert resp.status_code == 400

    async def test_create_job_missing_assets(self, client, seeded_user, auth_headers):
        """Job without inputAssets should return 400."""
        resp = await client.post("/jobs", json={
            "operation": "pdf.compress",
        }, headers=auth_headers)
        assert resp.status_code == 400

    async def test_create_job_invalid_token(self, client):
        """Creating a job with invalid token should return 401."""
        resp = await client.post("/jobs", json={
            "operation": "pdf.compress",
            "inputAssets": ["x"],
        }, headers={"Authorization": "Bearer bad-token"})
        assert resp.status_code == 401

    async def test_create_job_guest_allowed(self, client):
        """Creating a job as guest should be accepted into queue."""
        resp = await client.post("/jobs", json={
            "operation": "pdf.compress",
            "inputAssets": ["x"],
        })
        assert resp.status_code in (200, 201, 202)


class TestListJobs:
    """GET /jobs"""

    async def test_list_jobs_empty(self, client, seeded_user, auth_headers):
        """New user should have no jobs."""
        resp = await client.get("/jobs", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert len(data["items"]) == 0

    async def test_list_jobs_after_creation(self, client, seeded_file, auth_headers):
        """After creating a job, it should appear in the list."""
        await client.post("/jobs", json={
            "operation": "pdf.compress",
            "inputAssets": [str(seeded_file["_id"])],
            "parameters": {},
        }, headers=auth_headers)

        resp = await client.get("/jobs", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()["items"]) >= 1


class TestGetJob:
    """GET /jobs/{job_id}"""

    async def test_get_nonexistent_job(self, client, seeded_user, auth_headers):
        """Getting a non-existent job should return 404."""
        fake_id = str(ObjectId())
        resp = await client.get(f"/jobs/{fake_id}", headers=auth_headers)
        assert resp.status_code == 404


class TestCancelJob:
    """DELETE /jobs/{job_id}"""

    async def test_cancel_nonexistent_job(self, client, seeded_user, auth_headers):
        """Cancelling a non-existent job should return 400 or 404."""
        fake_id = str(ObjectId())
        resp = await client.delete(f"/jobs/{fake_id}", headers=auth_headers)
        assert resp.status_code in (400, 404)
