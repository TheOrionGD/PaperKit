"""
Tests for /ai endpoints — summarize, ask, translate, extract-tables.
"""
import pytest
from bson import ObjectId


class TestAIEndpoints:
    """AI tool endpoints — all require auth and a valid PDF file."""

    async def test_summarize_requires_auth(self, client):
        resp = await client.post("/ai/summarize", json={"file_id": "x"})
        assert resp.status_code == 401

    async def test_ask_requires_auth(self, client):
        resp = await client.post("/ai/ask", json={"file_id": "x", "question": "What?"})
        assert resp.status_code == 401

    async def test_translate_requires_auth(self, client):
        resp = await client.post("/ai/translate", json={"file_id": "x"})
        assert resp.status_code == 401

    async def test_extract_tables_requires_auth(self, client):
        resp = await client.post("/ai/extract-tables", json={"file_id": "x"})
        assert resp.status_code == 401

    async def test_summarize_missing_file_id(self, client, seeded_user, auth_headers):
        """Missing file_id should return 400."""
        resp = await client.post("/ai/summarize", json={}, headers=auth_headers)
        assert resp.status_code == 400

    async def test_ask_missing_question(self, client, seeded_user, auth_headers):
        """Missing question should return 400."""
        resp = await client.post("/ai/ask", json={"file_id": "x"}, headers=auth_headers)
        assert resp.status_code == 400

    async def test_summarize_nonexistent_file(self, client, seeded_user, auth_headers):
        """Summarizing a non-existent file should return 404."""
        resp = await client.post("/ai/summarize", json={
            "file_id": str(ObjectId()),
        }, headers=auth_headers)
        assert resp.status_code == 404

    async def test_ask_nonexistent_file(self, client, seeded_user, auth_headers):
        """Asking about a non-existent file should return 404."""
        resp = await client.post("/ai/ask", json={
            "file_id": str(ObjectId()),
            "question": "What is this?",
        }, headers=auth_headers)
        assert resp.status_code == 404

    async def test_translate_missing_file_id(self, client, seeded_user, auth_headers):
        """Missing file_id should return 400."""
        resp = await client.post("/ai/translate", json={}, headers=auth_headers)
        assert resp.status_code == 400

    async def test_extract_tables_missing_file_id(self, client, seeded_user, auth_headers):
        """Missing file_id should return 400."""
        resp = await client.post("/ai/extract-tables", json={}, headers=auth_headers)
        assert resp.status_code == 400
