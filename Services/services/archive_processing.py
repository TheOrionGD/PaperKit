"""Archive processing service.

Supports:
  extract: zip, rar, 7z
  create:  zip
"""
from __future__ import annotations

import io
import os
import zipfile
import tempfile
from typing import Callable


# ── ZIP ───────────────────────────────────────────────────────────────────────

def extract_zip(zip_bytes: bytes, progress_cb: Callable = None) -> list[tuple[str, bytes]]:
    """Extract ZIP. Returns list of (filename, file_bytes)."""
    _progress(progress_cb, 20)
    results = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        names = zf.namelist()
        total = len(names) or 1
        for i, name in enumerate(names):
            if name.endswith("/"):
                continue  # skip directories
            data = zf.read(name)
            results.append((name, data))
            if progress_cb:
                progress_cb(20 + int((i + 1) / total * 70))
    _progress(progress_cb, 92)
    return results


def create_zip(file_pairs: list[tuple[str, bytes]], progress_cb: Callable = None) -> bytes:
    """Create ZIP from list of (filename, file_bytes)."""
    _progress(progress_cb, 10)
    buf = io.BytesIO()
    total = len(file_pairs) or 1
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for i, (name, data) in enumerate(file_pairs):
            zf.writestr(name, data)
            if progress_cb:
                progress_cb(10 + int((i + 1) / total * 80))
    _progress(progress_cb, 92)
    return buf.getvalue()


# ── RAR ───────────────────────────────────────────────────────────────────────

def extract_rar(rar_bytes: bytes, progress_cb: Callable = None) -> list[tuple[str, bytes]]:
    """Extract RAR archive. Requires rarfile + unrar binary."""
    try:
        import rarfile
    except ImportError:
        raise RuntimeError("rarfile package not installed. Run: pip install rarfile")

    _progress(progress_cb, 20)
    results = []
    with tempfile.TemporaryDirectory() as d:
        rar_path = os.path.join(d, "archive.rar")
        with open(rar_path, "wb") as f:
            f.write(rar_bytes)

        with rarfile.RarFile(rar_path) as rf:
            names = [n for n in rf.namelist() if not n.endswith("/")]
            total = len(names) or 1
            for i, name in enumerate(names):
                data = rf.read(name)
                results.append((name, data))
                if progress_cb:
                    progress_cb(20 + int((i + 1) / total * 70))

    _progress(progress_cb, 92)
    return results


# ── 7Z ────────────────────────────────────────────────────────────────────────

def extract_7z(archive_bytes: bytes, progress_cb: Callable = None) -> list[tuple[str, bytes]]:
    """Extract 7Z archive. Requires py7zr."""
    try:
        import py7zr
    except ImportError:
        raise RuntimeError("py7zr package not installed. Run: pip install py7zr")

    _progress(progress_cb, 20)
    results = []
    with tempfile.TemporaryDirectory() as d:
        archive_path = os.path.join(d, "archive.7z")
        with open(archive_path, "wb") as f:
            f.write(archive_bytes)

        with py7zr.SevenZipFile(archive_path, mode="r") as sz:
            all_files = sz.getnames()
            extracted = sz.read(all_files)  # {name: BytesIO}
            total = len(extracted) or 1
            for i, (name, bio) in enumerate(extracted.items()):
                results.append((name, bio.read()))
                if progress_cb:
                    progress_cb(20 + int((i + 1) / total * 70))

    _progress(progress_cb, 92)
    return results


# ── Helpers ───────────────────────────────────────────────────────────────────

def _progress(cb: Callable | None, pct: int):
    if cb:
        cb(pct)


def _detect_format(filename: str, data: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in ("zip",):
        return "zip"
    if ext in ("rar",):
        return "rar"
    if ext in ("7z",):
        return "7z"
    # Magic bytes
    if data[:4] == b"PK\x03\x04":
        return "zip"
    if data[:7] == b"Rar!\x1a\x07\x00" or data[:7] == b"Rar!\x1a\x07\x01":
        return "rar"
    if data[:6] == b"7z\xbc\xaf'\x1c":
        return "7z"
    return "zip"


# ── Job handler ───────────────────────────────────────────────────────────────

def handle_archive_job(doc: dict, progress_cb: Callable) -> list[dict]:
    from services.storage import get_file_bytes, upload_file_sync
    
    import mimetypes

    params  = doc.get("parameters", {})
    assets  = doc.get("inputAssets", [])
    sub_op  = doc.get("operation", "").split(".")[-1]
    user_id = doc.get("userId", "")

    if not assets:
        raise ValueError("No input assets")

    output_assets = []

    if sub_op == "create_zip":
        # Multiple input files → one ZIP
        file_pairs = []
        total = len(assets)
        for i, asset in enumerate(assets):
            fb = get_file_bytes(asset["storageUrl"])
            file_pairs.append((asset.get("filename", f"file_{i}"), fb))
            if progress_cb:
                progress_cb(10 + int((i + 1) / total * 40))

        result    = create_zip(file_pairs, progress_cb)
        stem      = assets[0].get("filename", "archive").rsplit(".", 1)[0]
        fname     = f"{stem}_archive.zip"
        storage   = upload_file_sync(result, fname, "application/zip")
        output_assets.append({
            "filename": fname,
            "storageUrl": storage["storage_url"],
            "contentType": "application/zip",
            "size": len(result),
        })

    else:
        # Extract archive
        archive_bytes   = get_file_bytes(assets[0]["storageUrl"])
        archive_fname   = assets[0].get("filename", "archive.zip")
        fmt             = _detect_format(archive_fname, archive_bytes)

        if fmt == "zip":
            extracted = extract_zip(archive_bytes, progress_cb)
        elif fmt == "rar":
            extracted = extract_rar(archive_bytes, progress_cb)
        elif fmt == "7z":
            extracted = extract_7z(archive_bytes, progress_cb)
        else:
            raise ValueError(f"Unsupported archive format: {fmt}")

        total = len(extracted) or 1
        for i, (name, data) in enumerate(extracted):
            basename = os.path.basename(name) or name
            mime_type, _ = mimetypes.guess_type(basename)
            mime_type = mime_type or "application/octet-stream"
            storage   = upload_file_sync(data, basename, mime_type)
            output_assets.append({
                "filename": basename,
                "storageUrl": storage["storage_url"],
                "contentType": mime_type,
                "size": len(data),
            })
            if progress_cb:
                progress_cb(92 + int((i + 1) / total * 6))

    progress_cb(98)
    return output_assets
