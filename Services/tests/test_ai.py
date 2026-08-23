"""
Tests for /ai endpoints — summarize, ask, translate, extract-tables.
"""
import pytest
from bson import ObjectId


class TestAIEndpoints:
    """AI tool endpoints — all require auth and a valid PDF file."""

    async def test_summarize_invalid_token_rejects(self, client):
        """Invalid Bearer token should return 401."""
        resp = await client.post("/ai/summarize", json={"file_id": "x"}, headers={"Authorization": "Bearer invalid"})
        assert resp.status_code == 401

    async def test_ask_invalid_token_rejects(self, client):
        """Invalid Bearer token should return 401."""
        resp = await client.post("/ai/ask", json={"file_id": "x", "question": "What?"}, headers={"Authorization": "Bearer invalid"})
        assert resp.status_code == 401

    async def test_translate_invalid_token_rejects(self, client):
        """Invalid Bearer token should return 401."""
        resp = await client.post("/ai/translate", json={"file_id": "x"}, headers={"Authorization": "Bearer invalid"})
        assert resp.status_code == 401

    async def test_extract_tables_invalid_token_rejects(self, client):
        """Invalid Bearer token should return 401."""
        resp = await client.post("/ai/extract-tables", json={"file_id": "x"}, headers={"Authorization": "Bearer invalid"})
        assert resp.status_code == 401

    async def test_ai_guest_mode_allowed(self, client):
        """Guest user without token should pass auth gate and return validation error."""
        resp = await client.post("/ai/summarize", json={})
        assert resp.status_code == 400

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
