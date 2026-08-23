"""
Automated Test Suite — PaperKit PDF Editor & Download Integrity Rectification
Validates:
1. Dynamic PDF Geometry Engine
2. Page Dimension Invariant (INPUT WIDTH == OUTPUT WIDTH, INPUT HEIGHT == OUTPUT HEIGHT)
3. Page Count Invariant (INPUT PAGE COUNT == OUTPUT PAGE COUNT)
4. Native PyMuPDF In-Place PDF Editing & True Redaction
5. Structural PDF Validation (validate_pdf_structure)
6. Canonical Download Endpoint (GET /files/{file_id}/download)
7. SHA-256 Checksum Equality across backend and client downloads
8. Golden Regression Test with 2-page 612x792 pt PDF document
"""

import pytest
import io
import os
import hashlib
import pymupdf as fitz
from bson import ObjectId
from datetime import timezone, datetime

from services.pdf_geometry import get_document_geometry, get_page_geometry, pt_to_mm, pt_to_in
from services.processing import apply_pdf_edits, validate_pdf_structure
from services.storage import LOCAL_STORAGE_DIR


@pytest.fixture
def golden_2page_pdf_bytes():
    """Generate a 2-page Letter (612 x 792 pt) golden regression test PDF with images, text, and vector lines."""
    doc = fitz.open()
    
    # Page 1: 612 x 792 pt (Letter Portrait)
    p1 = doc.new_page(width=612, height=792)
    p1.draw_rect(fitz.Rect(20, 20, 592, 100), color=(0.1, 0.2, 0.5), fill=(0.1, 0.2, 0.5))  # Header banner
    p1.insert_text(fitz.Point(40, 60), "aidKRIYA Walker App Challenge 2025", fontsize=18, color=(1, 1, 1))
    p1.insert_text(fitz.Point(40, 150), "Official Brochure & Registration Guidelines", fontsize=14, color=(0.1, 0.1, 0.1))
    p1.draw_line(fitz.Point(40, 170), fitz.Point(572, 170), color=(0.8, 0.1, 0.1), width=2)  # Colored line
    p1.insert_text(fitz.Point(40, 200), "Join thousands of participants nationwide.", fontsize=11, color=(0.2, 0.2, 0.2))
    p1.insert_text(fitz.Point(40, 750), "Page 1 Footer — aidKRIYA 2025", fontsize=9, color=(0.5, 0.5, 0.5))

    # Page 2: 612 x 792 pt (Letter Portrait)
    p2 = doc.new_page(width=612, height=792)
    p2.insert_text(fitz.Point(40, 50), "About aidKRIYA & Event Rules", fontsize=16, color=(0.1, 0.2, 0.5))
    p2.insert_text(fitz.Point(40, 100), "1. Registration is mandatory before the deadline.", fontsize=11, color=(0.1, 0.1, 0.1))
    p2.insert_text(fitz.Point(40, 130), "2. Track your daily steps on the mobile application.", fontsize=11, color=(0.1, 0.1, 0.1))
    p2.insert_text(fitz.Point(40, 750), "Page 2 Footer — aidKRIYA 2025", fontsize=9, color=(0.5, 0.5, 0.5))

    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


class TestPDFGeometryService:
    """Test dynamic geometry calculation and unit conversions."""

    def test_geometry_reading(self, golden_2page_pdf_bytes):
        geom = get_document_geometry(golden_2page_pdf_bytes)
        assert geom["pageCount"] == 2
        
        p1 = geom["pages"][0]
        assert p1["widthPt"] == 612.0
        assert p1["heightPt"] == 792.0
        assert p1["format"] == "Letter"
        assert p1["orientation"] == "Portrait"
        assert abs(p1["widthMm"] - 215.9) < 0.2
        assert abs(p1["heightMm"] - 279.4) < 0.2

        p2 = geom["pages"][1]
        assert p2["widthPt"] == 612.0
        assert p2["heightPt"] == 792.0
        assert p2["format"] == "Letter"


class TestPDFStructuralValidation:
    """Test PDF binary validation engine."""

    def test_valid_pdf_passes_validation(self, golden_2page_pdf_bytes):
        res = validate_pdf_structure(golden_2page_pdf_bytes)
        assert res["valid"] is True
        assert res["page_count"] == 2
        assert res["size"] > 0
        assert len(res["sha256"]) == 64

    def test_corrupted_pdf_fails_validation(self):
        corrupted_bytes = b"<!DOCTYPE html><html><head><title>Error</title></head><body><h1>404 Not Found</h1><p>The requested PDF file was not found on this server.</p></body></html>"
        with pytest.raises(ValueError, match="Invalid PDF header signature"):
            validate_pdf_structure(corrupted_bytes)

    def test_truncated_pdf_fails_validation(self):
        truncated_bytes = b"%PDF-1.4 header only"
        with pytest.raises(ValueError):
            validate_pdf_structure(truncated_bytes)


class TestNativePDFEditingInvariants:
    """Test native PyMuPDF editing and structural invariants."""

    def test_apply_edits_preserves_page_count_and_dimensions(self, golden_2page_pdf_bytes):
        ops = [
            {"type": "text", "page": 0, "x": 100, "y": 300, "text": "Edited Text Element", "fontSize": 12},
            {"type": "highlight", "page": 0, "x": 40, "y": 140, "width": 200, "height": 20},
            {"type": "draw", "page": 1, "points": [[50, 50], [200, 200]], "strokeWidth": 2},
            {"type": "erase", "page": 1, "x": 40, "y": 90, "width": 300, "height": 20},
        ]

        edited_bytes = apply_pdf_edits(golden_2page_pdf_bytes, ops)
        
        # Validate post-edit PDF structure
        val_res = validate_pdf_structure(edited_bytes)
        assert val_res["valid"] is True
        assert val_res["page_count"] == 2  # Page Count Invariant

        # Check post-edit page dimensions (Page Dimension Invariant)
        geom = get_document_geometry(edited_bytes)
        assert geom["pages"][0]["widthPt"] == 612.0
        assert geom["pages"][0]["heightPt"] == 792.0
        assert geom["pages"][1]["widthPt"] == 612.0
        assert geom["pages"][1]["heightPt"] == 792.0

    def test_redaction_permanently_removes_text(self, golden_2page_pdf_bytes):
        # Redact "Official Brochure" on page 1
        ops = [
            {"type": "erase", "page": 0, "x": 35, "y": 135, "width": 300, "height": 25}
        ]
        edited_bytes = apply_pdf_edits(golden_2page_pdf_bytes, ops)
        
        doc = fitz.open("pdf", edited_bytes)
        text_pg1 = doc[0].get_text("text")
        doc.close()

        # Text stream should no longer contain redacted title
        assert "Official Brochure & Registration Guidelines" not in text_pg1

    def test_in_place_target_text_replacement(self, golden_2page_pdf_bytes):
        # In-place text replacement test
        ops = [
            {
                "type": "replace_text",
                "page": 0,
                "target_text": "Official Brochure & Registration Guidelines",
                "replacement_text": "HI THIS THE PDF EDIT TTOOL WHICH USED HERE",
                "fontSize": 12,
                "color": [0, 0.4, 0.8]
            }
        ]
        edited_bytes = apply_pdf_edits(golden_2page_pdf_bytes, ops)
        
        doc = fitz.open("pdf", edited_bytes)
        text_pg1 = doc[0].get_text("text")
        doc.close()

        assert "Official Brochure & Registration Guidelines" not in text_pg1
        assert "HI THIS THE PDF EDIT TTOOL WHICH USED HERE" in text_pg1


class TestCanonicalDownloadEndpoint:
    """Test GET /files/{file_id}/download endpoint binary integrity & SHA-256 checksum."""

    async def test_download_endpoint_valid_pdf(self, client, seeded_user, auth_headers, golden_2page_pdf_bytes, db):
        os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)
        file_path = os.path.join(LOCAL_STORAGE_DIR, "golden_test_doc.pdf")
        with open(file_path, "wb") as f:
            f.write(golden_2page_pdf_bytes)

        expected_hash = hashlib.sha256(golden_2page_pdf_bytes).hexdigest()
        file_id = ObjectId()
        doc = {
            "_id": file_id,
            "user_id": str(seeded_user["_id"]),
            "original_filename": "aidKRIYA_Walker_App_Challenge_2025_Brochure.pdf",
            "content_type": "application/pdf",
            "size": len(golden_2page_pdf_bytes),
            "sha256": expected_hash,
            "page_count": 2,
            "storage_url": "/storage/golden_test_doc.pdf",
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.files.insert_one(doc)

        resp = await client.get(f"/files/{file_id}/download", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.headers["Content-Type"] == "application/pdf"
        assert resp.headers.get("X-SHA256") == expected_hash

        downloaded_bytes = resp.content
        assert downloaded_bytes.startswith(b"%PDF-")
        assert len(downloaded_bytes) == len(golden_2page_pdf_bytes)
        assert hashlib.sha256(downloaded_bytes).hexdigest() == expected_hash  # HASH EQUALITY TEST

        # Cleanup
        if os.path.exists(file_path):
            os.remove(file_path)

    async def test_download_nonexistent_file_returns_404(self, client, seeded_user, auth_headers):
        fake_id = str(ObjectId())
        resp = await client.get(f"/files/{fake_id}/download", headers=auth_headers)
        assert resp.status_code == 404
        assert resp.headers["Content-Type"] == "application/json"
