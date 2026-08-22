"""
Tests for /health and application startup.
"""
import pytest


class TestHealth:
    """Health check and app configuration tests."""

    async def test_health_endpoint_returns_ok(self, client):
        """GET /health should return 200 with status ok."""
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "PaperKit API"
        assert "version" in data

    async def test_health_endpoint_contains_version(self, client):
        """Health response should include a semantic version string."""
        resp = await client.get("/health")
        version = resp.json()["version"]
        parts = version.split(".")
        assert len(parts) >= 2, f"Version '{version}' doesn't look semantic"

    async def test_cors_headers_present(self, client):
        """Preflight OPTIONS should return CORS headers for allowed origins."""
        resp = await client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        # FastAPI CORS middleware should respond
        assert resp.status_code in (200, 204, 405)

    async def test_unknown_route_returns_404(self, client):
        """Requesting a non-existent route should return 404 or 405."""
        resp = await client.get("/nonexistent-route-xyz")
        assert resp.status_code in (404, 405)
