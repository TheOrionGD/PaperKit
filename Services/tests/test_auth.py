"""
Tests for /auth endpoints — register, login, me, update profile, delete account.
"""
import pytest
from middleware.auth import create_access_token, hash_password


class TestRegister:
    """POST /auth/register"""

    async def test_register_success(self, client):
        """Registering with valid data should return 200 and user_id."""
        resp = await client.post("/auth/register", json={
            "name": "Alice",
            "email": "alice@paperkit.dev",
            "password": "SecurePass99",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "user_id" in data
        assert data["message"] == "Account created successfully"

    async def test_register_missing_fields(self, client):
        """Missing required fields should return 400."""
        resp = await client.post("/auth/register", json={"name": "Bob"})
        assert resp.status_code == 400

    async def test_register_short_password(self, client):
        """Password under 8 characters should be rejected."""
        resp = await client.post("/auth/register", json={
            "name": "Charlie",
            "email": "charlie@paperkit.dev",
            "password": "short",
        })
        assert resp.status_code == 400
        assert "8 characters" in resp.json()["detail"]

    async def test_register_duplicate_email(self, client, seeded_user):
        """Registering with an existing email should return 409."""
        resp = await client.post("/auth/register", json={
            "name": "Duplicate",
            "email": "test@paperkit.dev",  # already seeded
            "password": "AnotherPass1!",
        })
        assert resp.status_code == 409

    async def test_register_email_case_insensitive(self, client):
        """Emails should be normalized to lowercase."""
        resp = await client.post("/auth/register", json={
            "name": "Eve",
            "email": "EVE@PaperKit.DEV",
            "password": "ValidPass12",
        })
        assert resp.status_code == 200
        # Registering the same email in different case should fail
        resp2 = await client.post("/auth/register", json={
            "name": "Eve Again",
            "email": "eve@paperkit.dev",
            "password": "ValidPass12",
        })
        assert resp2.status_code == 409


class TestLogin:
    """POST /auth/login (OAuth2 form)"""

    async def test_login_success(self, client, seeded_user):
        """Login with correct credentials should return access_token."""
        resp = await client.post("/auth/login", data={
            "username": "test@paperkit.dev",
            "password": "TestPassword123!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client, seeded_user):
        """Wrong password should return 401."""
        resp = await client.post("/auth/login", data={
            "username": "test@paperkit.dev",
            "password": "WrongPassword",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client):
        """Login with non-existent email should return 401."""
        resp = await client.post("/auth/login", data={
            "username": "nobody@paperkit.dev",
            "password": "SomePass123",
        })
        assert resp.status_code == 401

    async def test_login_case_insensitive_email(self, client, seeded_user):
        """Login should work regardless of email casing."""
        resp = await client.post("/auth/login", data={
            "username": "TEST@PAPERKIT.DEV",
            "password": "TestPassword123!",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()


class TestGetMe:
    """GET /auth/me"""

    async def test_get_me_authenticated(self, client, seeded_user, auth_headers):
        """Authenticated user should receive their profile."""
        resp = await client.get("/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "test@paperkit.dev"
        assert data["name"] == "Test User"
        assert "id" in data
        assert "preferences" in data

    async def test_get_me_unauthenticated(self, client):
        """Request without token should return 401."""
        resp = await client.get("/auth/me")
        assert resp.status_code == 401

    async def test_get_me_invalid_token(self, client):
        """Request with invalid token should return 401."""
        resp = await client.get("/auth/me", headers={
            "Authorization": "Bearer invalid-garbage-token"
        })
        assert resp.status_code == 401

    async def test_get_me_expired_token(self, client, seeded_user):
        """An expired token should return 401."""
        from datetime import timedelta
        token = create_access_token(
            {"sub": str(seeded_user["_id"])},
            expires_delta=timedelta(seconds=-10),
        )
        resp = await client.get("/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 401


class TestUpdateProfile:
    """PUT /auth/me"""

    async def test_update_name(self, client, seeded_user, auth_headers):
        """Updating name should persist and return new value."""
        resp = await client.put("/auth/me", json={"name": "New Name"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    async def test_update_empty_name_rejected(self, client, seeded_user, auth_headers):
        """Empty name should return 400."""
        resp = await client.put("/auth/me", json={"name": "   "}, headers=auth_headers)
        assert resp.status_code == 400

    async def test_update_preferences(self, client, seeded_user, auth_headers):
        """Updating preferences should merge with existing ones."""
        resp = await client.put("/auth/me", json={
            "preferences": {"dark_mode": True}
        }, headers=auth_headers)
        assert resp.status_code == 200
        prefs = resp.json()["preferences"]
        assert prefs["dark_mode"] is True
        # Other preferences should remain unchanged
        assert prefs["default_view"] == "list"

    async def test_update_password(self, client, seeded_user, auth_headers):
        """Changing password should succeed and new password should work for login."""
        resp = await client.put("/auth/me", json={
            "password": "NewSecure99!"
        }, headers=auth_headers)
        assert resp.status_code == 200

        # Login with new password
        resp2 = await client.post("/auth/login", data={
            "username": "test@paperkit.dev",
            "password": "NewSecure99!",
        })
        assert resp2.status_code == 200

    async def test_update_password_too_short(self, client, seeded_user, auth_headers):
        """Password under 8 characters should be rejected."""
        resp = await client.put("/auth/me", json={"password": "short"}, headers=auth_headers)
        assert resp.status_code == 400


class TestDeleteAccount:
    """DELETE /auth/delete-account"""

    async def test_delete_account(self, client, seeded_user, auth_headers):
        """Deleting account should succeed and user should no longer exist."""
        resp = await client.delete("/auth/delete-account", headers=auth_headers)
        assert resp.status_code == 200

        # Verify user can no longer access /me
        resp2 = await client.get("/auth/me", headers=auth_headers)
        assert resp2.status_code == 401
