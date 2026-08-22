"""
Unit tests for internal modules — database mock, auth middleware, config.
"""
import pytest
import os
from datetime import datetime, timedelta
from bson import ObjectId


class TestMockDatabase:
    """Tests for the MockDatabase / MockCollection used in local dev and tests."""

    async def test_insert_and_find_one(self, db):
        """insert_one + find_one should round-trip a document."""
        doc = {"name": "test", "value": 42}
        result = await db.test_collection.insert_one(doc)
        assert result.inserted_id is not None

        found = await db.test_collection.find_one({"name": "test"})
        assert found is not None
        assert found["value"] == 42

    async def test_find_one_not_found(self, db):
        """find_one with no match should return None."""
        found = await db.test_collection.find_one({"name": "nonexistent"})
        assert found is None

    async def test_update_one(self, db):
        """update_one with $set should modify the document."""
        await db.test_collection.insert_one({"name": "update_me", "count": 0})
        result = await db.test_collection.update_one(
            {"name": "update_me"},
            {"$set": {"count": 10}},
        )
        assert result.modified_count >= 1

        updated = await db.test_collection.find_one({"name": "update_me"})
        assert updated["count"] == 10

    async def test_count_documents(self, db):
        """count_documents should return correct count."""
        for i in range(3):
            await db.test_collection.insert_one({"group": "A", "index": i})
        await db.test_collection.insert_one({"group": "B", "index": 0})

        count_a = await db.test_collection.count_documents({"group": "A"})
        assert count_a == 3

        count_all = await db.test_collection.count_documents({})
        assert count_all == 4

    async def test_find_cursor_iteration(self, db):
        """find() should return an async-iterable cursor."""
        for i in range(5):
            await db.items.insert_one({"idx": i, "type": "cursor_test"})

        results = []
        cursor = db.items.find({"type": "cursor_test"})
        async for doc in cursor:
            results.append(doc)
        assert len(results) == 5

    async def test_find_cursor_sort(self, db):
        """MockCursor sort should order results correctly."""
        await db.sorted.insert_one({"name": "C", "rank": 3})
        await db.sorted.insert_one({"name": "A", "rank": 1})
        await db.sorted.insert_one({"name": "B", "rank": 2})

        results = []
        cursor = db.sorted.find({}, sort=[("rank", 1)])
        async for doc in cursor:
            results.append(doc)
        assert [r["name"] for r in results] == ["A", "B", "C"]

    async def test_find_cursor_skip_limit(self, db):
        """MockCursor skip + limit should paginate correctly."""
        for i in range(10):
            await db.paginated.insert_one({"idx": i})

        results = []
        cursor = db.paginated.find({}).skip(3).limit(2)
        async for doc in cursor:
            results.append(doc)
        assert len(results) == 2

    async def test_objectid_generation(self, db):
        """Documents without _id should get an auto-generated ObjectId."""
        result = await db.auto_id.insert_one({"data": "test"})
        assert isinstance(result.inserted_id, ObjectId)


class TestAuthMiddleware:
    """Tests for password hashing, JWT creation, and token verification."""

    def test_hash_and_verify_password(self):
        from middleware.auth import hash_password, verify_password
        hashed = hash_password("MySecret123")
        assert verify_password("MySecret123", hashed) is True
        assert verify_password("WrongPassword", hashed) is False

    def test_password_hash_is_unique(self):
        """Two hashes of the same password should differ (due to salt)."""
        from middleware.auth import hash_password
        h1 = hash_password("SamePassword")
        h2 = hash_password("SamePassword")
        assert h1 != h2

    def test_create_and_decode_token(self):
        from middleware.auth import create_access_token, decode_token
        token = create_access_token({"sub": "user123"})
        payload = decode_token(token)
        assert payload["sub"] == "user123"
        assert "exp" in payload

    def test_expired_token_raises(self):
        from middleware.auth import create_access_token, decode_token
        from fastapi import HTTPException
        token = create_access_token(
            {"sub": "user123"},
            expires_delta=timedelta(seconds=-10),
        )
        with pytest.raises(HTTPException) as exc_info:
            decode_token(token)
        assert exc_info.value.status_code == 401

    def test_invalid_token_raises(self):
        from middleware.auth import decode_token
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            decode_token("this-is-not-a-jwt")


class TestConfig:
    """Tests for settings loading."""

    def test_settings_loads(self):
        from config import get_settings
        settings = get_settings()
        assert settings.secret_key is not None
        assert settings.algorithm == "HS256"
        assert settings.database_name == "paperkit_test"

    def test_settings_has_defaults(self):
        from config import get_settings
        settings = get_settings()
        assert settings.frontend_url is not None
        assert settings.access_token_expire_minutes > 0
