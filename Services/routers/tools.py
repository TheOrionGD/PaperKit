"""Tools routers — merge, split, compress, convert, scanner"""
import base64
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from middleware.auth import get_current_user
from services.storage import upload_file, get_file_bytes
from services.processing import (
    merge_pdfs, split_pdf, compress_pdf,
    convert_with_libreoffice, rotate_pdf, add_watermark, pdf_to_images, images_to_pdf,
    organize_pdf_pages, get_page_count,
    pdf_to_txt, pdf_to_html, pdf_to_word_fallback, pdf_to_excel_fallback, pdf_to_ppt_fallback,
    word_to_pdf_fallback, excel_to_pdf_fallback, ppt_to_pdf_fallback,
    apply_pdf_edits,
)
from services.scanner import detect_document_corners, warp_perspective_and_enhance
from config import get_settings
from bson import ObjectId
from datetime import timezone, datetime
import io

settings = get_settings()
router = APIRouter(prefix="/tools", tags=["tools"])


async def _get_file_bytes(file_id: str, user_id: str, db) -> tuple[bytes, dict]:
    """Fetch file bytes + metadata for authenticated user."""
    f = await db.files.find_one({"_id": ObjectId(file_id), "user_id": user_id, "is_deleted": False})
    if not f:
        raise HTTPException(status_code=404, detail=f"File {file_id} not found")
    return get_file_bytes(f["storage_url"]), f


async def _save_result(result_bytes: bytes, filename: str, content_type: str, user_id: str, db) -> str:
    """Save processing result to storage and DB."""
    storage = await upload_file(result_bytes, filename, content_type)
    
    # Calculate page count for output PDF if application/pdf
    page_count = None
    if content_type == "application/pdf":
        try:
            page_count = get_page_count(result_bytes)
        except Exception:
            pass
            
    doc = {
        "user_id": user_id,
        "original_filename": filename,
        "content_type": content_type,
        "size": len(result_bytes),
        "page_count": page_count,
        "storage_url": storage["storage_url"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.files.insert_one(doc)
    return storage["storage_url"]


async def _log_history(
    user_id: str,
    tool_id: str,
    action: str,
    input_files: list[str],
    output_url: str,
    parameters: dict,
    db,
    *,
    started_at: datetime = None,
    duration_ms: int = None,
    error: str = None,
    status: str = "completed",
):
    """Save user processing history record to MongoDB with full timing & status."""
    out_file = await db.files.find_one({"user_id": user_id, "storage_url": output_url, "is_deleted": False})
    out_file_info = {
        "id":          str(out_file["_id"]) if out_file else "",
        "filename":    out_file["original_filename"] if out_file else output_url.split("/")[-1],
        "size":        out_file["size"] if out_file else 0,
        "storage_url": output_url,
    }

    completed_at = datetime.now(timezone.utc)
    history_doc = {
        "user_id":      user_id,
        "tool_id":      tool_id,
        "action":       action,
        "input_files":  input_files,
        "output_file":  out_file_info,
        "parameters":   parameters,
        "status":       status,
        "started_at":   started_at,
        "completed_at": completed_at,
        "duration_ms":  duration_ms,
        "error":        error,
        "created_at":   datetime.now(timezone.utc),
    }
    await db.history.insert_one(history_doc)


# ── Merge ──────────────────────────────────────────────────────────────────────

@router.post("/merge")
async def merge(body: dict, current_user: dict = Depends(get_current_user)):
    file_ids = body.get("file_ids", [])
    options = body.get("options", {})
    page_size = options.get("page_size", "original")
    margin = options.get("margin", "none")
    
    if len(file_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 files required")

    db = get_db()
    user_id = str(current_user["_id"])
    pdf_bytes_list = []
    input_filenames = []
    
    for fid in file_ids:
        data, meta = await _get_file_bytes(fid, user_id, db)
        pdf_bytes_list.append(data)
        input_filenames.append(meta.get("original_filename", "file.pdf"))

    result = merge_pdfs(pdf_bytes_list, page_size=page_size, margin_type=margin)
    output_filename = "merged.pdf"
    if input_filenames:
        base_stem = input_filenames[0].rsplit(".", 1)[0]
        output_filename = f"{base_stem}_merged.pdf"
        
    url = await _save_result(result, output_filename, "application/pdf", user_id, db)
    await _log_history(user_id, "merge-pdf", f"Merged {len(file_ids)} files into {output_filename}", input_filenames, url, {"page_size": page_size, "margin": margin}, db)
    
    return {"download_url": url, "size": len(result)}


@router.post("/organize")
async def organize(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    pages = body.get("pages", [])  # list of {"index": int, "rotation": int}
    tool_id = body.get("tool_id", "organize-pages")
    
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id is required")
    if not pages:
        raise HTTPException(status_code=400, detail="pages sequence is required")

    db = get_db()
    user_id = str(current_user["_id"])
    src_bytes, meta = await _get_file_bytes(file_id, user_id, db)

    result = organize_pdf_pages(src_bytes, pages)
    
    old_filename = meta.get("original_filename", "file.pdf")
    stem = old_filename.rsplit(".", 1)[0]
    output_filename = f"{stem}_organized.pdf"
    
    url = await _save_result(result, output_filename, "application/pdf", user_id, db)
    await _log_history(user_id, tool_id, f"Organized pages of {old_filename}", [old_filename], url, {"pages_count": len(pages)}, db)
    
    return {"download_url": url, "size": len(result)}


# ── Split ──────────────────────────────────────────────────────────────────────

@router.post("/split")
async def split(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    mode = body.get("mode", "range")
    tool_id = body.get("tool_id", "split-pdf") # can be extract-pages, split-pdf
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")

    db = get_db()
    user_id = str(current_user["_id"])
    pdf_bytes, meta = await _get_file_bytes(file_id, user_id, db)

    kwargs = {k: v for k, v in body.items() if k not in ("file_id", "mode", "tool_id")}
    parts = split_pdf(pdf_bytes, mode, **kwargs)

    original_name = meta.get("original_filename", "file.pdf")
    stem = original_name.rsplit(".", 1)[0]

    if len(parts) == 1:
        url = await _save_result(parts[0], f"{stem}_split.pdf", "application/pdf", user_id, db)
        await _log_history(user_id, tool_id, f"Split {original_name}", [original_name], url, {"mode": mode}, db)
        return {"download_url": url, "parts": 1}

    urls = []
    for i, part in enumerate(parts):
        url = await _save_result(part, f"{stem}_split_part_{i+1}.pdf", "application/pdf", user_id, db)
        urls.append(url)
    
    # Log history for first part
    if urls:
        await _log_history(user_id, tool_id, f"Split {original_name} into {len(parts)} parts", [original_name], urls[0], {"mode": mode, "parts": len(parts)}, db)
        
    return {"download_urls": urls, "parts": len(parts)}


# ── Compress ───────────────────────────────────────────────────────────────────

@router.post("/compress")
async def compress(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    quality = body.get("quality", "balanced")
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")

    db = get_db()
    user_id = str(current_user["_id"])
    pdf_bytes, meta = await _get_file_bytes(file_id, user_id, db)

    result = compress_pdf(pdf_bytes, quality)
    original_name = meta.get("original_filename", "file.pdf")
    stem = original_name.rsplit(".", 1)[0]
    url = await _save_result(result, f"{stem}_compressed.pdf", "application/pdf", user_id, db)
    await _log_history(
        user_id, 
        "compress-pdf", 
        f"Compressed {original_name} ({quality})", 
        [original_name], 
        url, 
        {"quality": quality, "original_size": len(pdf_bytes), "compressed_size": len(result)}, 
        db
    )
    return {"download_url": url, "original_size": len(pdf_bytes), "compressed_size": len(result)}


# ── Convert ────────────────────────────────────────────────────────────────────

EXT_MAP = {
    "word": "docx", "excel": "xlsx", "ppt": "pptx",
    "txt": "txt", "html": "html", "markdown": "md",
    "pdf": "pdf", "image": "jpg",
}

MIME_MAP = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "txt": "text/plain",
    "html": "text/html",
    "md": "text/markdown",
    "jpg": "image/jpeg",
}


@router.post("/convert")
async def convert(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    from_fmt = body.get("from_format", "pdf")
    to_fmt = body.get("to_format", "word")
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")

    db = get_db()
    user_id = str(current_user["_id"])
    src_bytes, meta = await _get_file_bytes(file_id, user_id, db)

    to_ext = EXT_MAP.get(to_fmt, to_fmt)
    from_ext = EXT_MAP.get(from_fmt, from_fmt)
    
    # Check if we should use LibreOffice
    lo_available = False
    if settings.libreoffice_path:
        import shutil
        import os
        if os.path.isabs(settings.libreoffice_path):
            lo_available = os.path.exists(settings.libreoffice_path)
        else:
            lo_available = shutil.which(settings.libreoffice_path) is not None

    try:
        # Route conversions
        if from_fmt == "pdf":
            if to_fmt == "image":
                images = pdf_to_images(src_bytes)
                if not images:
                    raise HTTPException(status_code=422, detail="Could not convert to images")
                result_bytes = images[0]  # Return first page image
            elif to_fmt == "txt":
                result_bytes = pdf_to_txt(src_bytes)
            elif to_fmt == "html":
                result_bytes = pdf_to_html(src_bytes)
            elif to_fmt == "markdown":
                # AI-powered or fallback Markdown
                if settings.gemini_api_key:
                    from services import ai_service
                    from services.processing import extract_text
                    pdf_text = extract_text(src_bytes)
                    if not pdf_text.strip():
                        raise HTTPException(status_code=422, detail="PDF has no extractable text.")
                    md_text = await ai_service.pdf_to_markdown(pdf_text)
                    result_bytes = md_text.encode("utf-8")
                else:
                    # Simple text extraction formatted as text
                    result_bytes = pdf_to_txt(src_bytes)
            elif to_fmt == "word":
                if lo_available:
                    result_bytes = convert_with_libreoffice(src_bytes, "pdf", "docx", settings.libreoffice_path)
                else:
                    result_bytes = pdf_to_word_fallback(src_bytes)
            elif to_fmt == "excel":
                if lo_available:
                    result_bytes = convert_with_libreoffice(src_bytes, "pdf", "xlsx", settings.libreoffice_path)
                else:
                    result_bytes = pdf_to_excel_fallback(src_bytes)
            elif to_fmt == "ppt":
                if lo_available:
                    result_bytes = convert_with_libreoffice(src_bytes, "pdf", "pptx", settings.libreoffice_path)
                else:
                    result_bytes = pdf_to_ppt_fallback(src_bytes)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported target format {to_fmt}")

        elif to_fmt == "pdf":
            if from_fmt == "image":
                result_bytes = images_to_pdf([src_bytes])
            elif from_fmt == "word":
                if lo_available:
                    result_bytes = convert_with_libreoffice(src_bytes, "docx", "pdf", settings.libreoffice_path)
                else:
                    result_bytes = word_to_pdf_fallback(src_bytes)
            elif from_fmt == "excel":
                if lo_available:
                    result_bytes = convert_with_libreoffice(src_bytes, "xlsx", "pdf", settings.libreoffice_path)
                else:
                    result_bytes = excel_to_pdf_fallback(src_bytes)
            elif from_fmt == "ppt":
                if lo_available:
                    result_bytes = convert_with_libreoffice(src_bytes, "pptx", "pdf", settings.libreoffice_path)
                else:
                    result_bytes = ppt_to_pdf_fallback(src_bytes)
            elif from_fmt == "txt":
                # Convert TXT to PDF fallback
                from reportlab.lib.pagesizes import letter
                from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
                from reportlab.lib.styles import getSampleStyleSheet
                pdf_stream = io.BytesIO()
                pdf_doc = SimpleDocTemplate(pdf_stream, pagesize=letter)
                styles = getSampleStyleSheet()
                story = []
                txt_content = src_bytes.decode("utf-8", errors="ignore")
                for line in txt_content.split("\n"):
                    story.append(Paragraph(line if line.strip() else "&nbsp;", styles['Normal']))
                pdf_doc.build(story)
                result_bytes = pdf_stream.getvalue()
            elif from_fmt == "html":
                # Convert HTML to PDF fallback
                from reportlab.lib.pagesizes import letter
                from reportlab.platypus import SimpleDocTemplate, Paragraph
                from reportlab.lib.styles import getSampleStyleSheet
                pdf_stream = io.BytesIO()
                pdf_doc = SimpleDocTemplate(pdf_stream, pagesize=letter)
                styles = getSampleStyleSheet()
                story = []
                html_content = src_bytes.decode("utf-8", errors="ignore")
                import re
                clean_text = re.sub('<[^<]+?>', '', html_content)
                for line in clean_text.split("\n"):
                    story.append(Paragraph(line if line.strip() else "&nbsp;", styles['Normal']))
                pdf_doc.build(story)
                result_bytes = pdf_stream.getvalue()
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported source format {from_fmt}")
        else:
            raise HTTPException(status_code=400, detail="Conversion must involve PDF as source or destination")

    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Conversion failed: {str(e)}")

    mime = MIME_MAP.get(to_ext, "application/octet-stream")
    stem = meta.get("original_filename", "file").rsplit(".", 1)[0]
    url = await _save_result(result_bytes, f"{stem}.{to_ext}", mime, user_id, db)
    
    tool_id = f"{from_fmt}-to-{to_fmt}"
    await _log_history(
        user_id, 
        tool_id, 
        f"Converted {meta.get('original_filename')} to {to_fmt.upper()}", 
        [meta.get("original_filename")], 
        url, 
        {"from_format": from_fmt, "to_format": to_fmt}, 
        db
    )
    return {"download_url": url, "size": len(result_bytes)}


# ── Rotate ─────────────────────────────────────────────────────────────────────

@router.post("/rotate")
async def rotate(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    degrees = int(body.get("degrees", 90))
    pages = body.get("pages")  # None = all pages
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")

    db = get_db()
    user_id = str(current_user["_id"])
    pdf_bytes, meta = await _get_file_bytes(file_id, user_id, db)

    result = rotate_pdf(pdf_bytes, degrees, pages)
    stem = meta.get("original_filename", "file.pdf").rsplit(".", 1)[0]
    url = await _save_result(result, f"{stem}_rotated.pdf", "application/pdf", user_id, db)
    await _log_history(
        user_id, 
        "rotate-pdf", 
        f"Rotated pages of {meta.get('original_filename')} by {degrees}°", 
        [meta.get('original_filename')], 
        url, 
        {"degrees": degrees, "pages": pages}, 
        db
    )
    return {"download_url": url}


# ── Watermark ──────────────────────────────────────────────────────────────────

@router.post("/watermark")
async def watermark(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    text = body.get("text", "CONFIDENTIAL")
    opacity = float(body.get("opacity", 0.3))
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")

    db = get_db()
    user_id = str(current_user["_id"])
    pdf_bytes, meta = await _get_file_bytes(file_id, user_id, db)

    result = add_watermark(pdf_bytes, text, opacity)
    stem = meta.get("original_filename", "file.pdf").rsplit(".", 1)[0]
    url = await _save_result(result, f"{stem}_watermarked.pdf", "application/pdf", user_id, db)
    await _log_history(
        user_id, 
        "watermark", 
        f"Added watermark '{text}' to {meta.get('original_filename')}", 
        [meta.get('original_filename')], 
        url, 
        {"text": text, "opacity": opacity}, 
        db
    )
    return {"download_url": url}


# ── Edit PDF ───────────────────────────────────────────────────────────────────

@router.post("/edit/apply")
async def edit_apply(body: dict, current_user: dict = Depends(get_current_user)):
    """Apply annotation/edit operations to a PDF and return a new saved PDF."""
    file_id = body.get("file_id")
    operations = body.get("operations", [])

    if not file_id:
        raise HTTPException(status_code=400, detail="file_id is required")
    if not operations:
        raise HTTPException(status_code=400, detail="operations list is required")

    db = get_db()
    user_id = str(current_user["_id"])
    pdf_bytes, meta = await _get_file_bytes(file_id, user_id, db)

    try:
        result = apply_pdf_edits(pdf_bytes, operations)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to apply edits: {str(e)}")

    old_filename = meta.get("original_filename", "file.pdf")
    stem = old_filename.rsplit(".", 1)[0]
    output_filename = f"{stem}_edited.pdf"

    url = await _save_result(result, output_filename, "application/pdf", user_id, db)
    await _log_history(
        user_id,
        "edit-pdf",
        f"Edited {old_filename} ({len(operations)} operation(s))",
        [old_filename],
        url,
        {"operation_count": len(operations)},
        db,
    )
    return {"download_url": url, "size": len(result)}


@router.get("/history")
async def get_history(
    limit: int = 50,
    skip: int = 0,
    tool_id: str = None,
    status: str = None,
    current_user: dict = Depends(get_current_user),
):
    db      = get_db()
    user_id = str(current_user["_id"])
    cursor  = db.history.find({"user_id": user_id}).sort([("created_at", -1)]).skip(skip).limit(limit)
    items   = []
    async for h in cursor:
        # Filter server-side if query params given (mock DB doesn't support complex queries)
        if tool_id and h.get("tool_id") != tool_id:
            continue
        if status and h.get("status") != status:
            continue

        def _fmt(v):
            if isinstance(v, datetime):
                return v.isoformat()
            return v

        items.append({
            "id":           str(h["_id"]),
            "tool_id":      h.get("tool_id", ""),
            "action":       h.get("action", ""),
            "operation":    h.get("tool_id", ""),
            "input_files":  h.get("input_files", []),
            "output_file":  h.get("output_file"),
            "parameters":   h.get("parameters", {}),
            "status":       h.get("status", "completed"),
            "duration_ms":  h.get("duration_ms"),
            "error":        h.get("error"),
            "created_at":   _fmt(h.get("created_at")),
            "started_at":   _fmt(h.get("started_at")),
            "completed_at": _fmt(h.get("completed_at")),
        })
    return items


import shutil

@router.get("/registry")
async def get_tools_registry():
    ai_available = bool(settings.gemini_api_key)
    lo_available = False
    if settings.libreoffice_path:
        lo_available = shutil.which(settings.libreoffice_path) is not None
        
    tools = [
        # Organize Category
        {
            "toolId": "merge-pdf",
            "name": "Merge PDF",
            "description": "Combine multiple PDF files into one document.",
            "icon": "merge-pdf",
            "category": "Organize PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/merge",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["multi-file-merge", "page-reorder"]
        },
        {
            "toolId": "split-pdf",
            "name": "Split PDF",
            "description": "Extract specific page ranges or split each page into separate PDFs.",
            "icon": "split-pdf",
            "category": "Organize PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/split",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["split-by-range", "split-by-n-pages", "extract-pages"]
        },
        {
            "toolId": "extract-pages",
            "name": "Extract Pages",
            "description": "Extract specific pages from a PDF document.",
            "icon": "extract-pages",
            "category": "Organize PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/extract-pages",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["page-extraction"]
        },
        {
            "toolId": "remove-pages",
            "name": "Remove Pages",
            "description": "Remove unwanted pages from your PDF file.",
            "icon": "remove-pages",
            "category": "Organize PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/remove-pages",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["page-deletion"]
        },
        {
            "toolId": "reorder-pages",
            "name": "Reorder Pages",
            "description": "Drag and drop to rearrange PDF page order.",
            "icon": "reorder-pages",
            "category": "Organize PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/reorder-pages",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["page-reordering"]
        },
        {
            "toolId": "rotate-pdf",
            "name": "Rotate PDF",
            "description": "Rotate PDF pages clockwise or counter-clockwise.",
            "icon": "rotate-pdf",
            "category": "Organize PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/rotate",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["rotate-all-pages", "rotate-specific-pages"]
        },
        # Convert to PDF Category
        {
            "toolId": "word-to-pdf",
            "name": "Word to PDF",
            "description": "Convert DOCX/DOC files to PDF.",
            "icon": "word-to-pdf",
            "category": "Convert to PDF",
            "supportedFormats": [".doc", ".docx"],
            "route": "/tools/convert?from=word&to=pdf",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["batch-convert", "high-fidelity-layout"]
        },
        {
            "toolId": "excel-to-pdf",
            "name": "Excel to PDF",
            "description": "Convert XLSX/XLS files to PDF.",
            "icon": "excel-to-pdf",
            "category": "Convert to PDF",
            "supportedFormats": [".xls", ".xlsx"],
            "route": "/tools/convert?from=excel&to=pdf",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["sheet-paging", "formula-rendering"]
        },
        {
            "toolId": "ppt-to-pdf",
            "name": "PPT to PDF",
            "description": "Convert PPTX/PPT files to PDF.",
            "icon": "ppt-to-pdf",
            "category": "Convert to PDF",
            "supportedFormats": [".ppt", ".pptx"],
            "route": "/tools/convert?from=ppt&to=pdf",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["slide-scaling", "notes-rendering"]
        },
        {
            "toolId": "image-to-pdf",
            "name": "Image to PDF",
            "description": "Convert JPEG, PNG, or WEBP images to PDF.",
            "icon": "image-to-pdf",
            "category": "Convert to PDF",
            "supportedFormats": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
            "route": "/tools/convert?from=image&to=pdf",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["multi-image-pdf", "auto-rotation"]
        },
        {
            "toolId": "txt-to-pdf",
            "name": "TXT to PDF",
            "description": "Convert plain text files to PDF.",
            "icon": "txt-to-pdf",
            "category": "Convert to PDF",
            "supportedFormats": [".txt"],
            "route": "/tools/convert?from=txt&to=pdf",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["utf8-encoding", "font-customization"]
        },
        {
            "toolId": "html-to-pdf",
            "name": "HTML to PDF",
            "description": "Convert HTML documents to PDF.",
            "icon": "html-to-pdf",
            "category": "Convert to PDF",
            "supportedFormats": [".html", ".htm"],
            "route": "/tools/convert?from=html&to=pdf",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["layout-preservation"]
        },
        # Convert from PDF Category
        {
            "toolId": "pdf-to-word",
            "name": "PDF to Word",
            "description": "Convert PDF files back to editable Word documents.",
            "icon": "pdf-to-word",
            "category": "Convert from PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/convert?from=pdf&to=word",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["layout-preservation", "text-extraction", "ocr"]
        },
        {
            "toolId": "pdf-to-excel",
            "name": "PDF to Excel",
            "description": "Convert PDF tables into XLSX format.",
            "icon": "pdf-to-excel",
            "category": "Convert from PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/convert?from=pdf&to=excel",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["table-detection", "multi-sheet-output", "ocr"]
        },
        {
            "toolId": "pdf-to-ppt",
            "name": "PDF to PPT",
            "description": "Convert PDF files back to PowerPoint presentations.",
            "icon": "pdf-to-ppt",
            "category": "Convert from PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/convert?from=pdf&to=ppt",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["layout-preservation", "slide-generation"]
        },
        {
            "toolId": "pdf-to-image",
            "name": "PDF to Image",
            "description": "Extract pages from a PDF as separate images.",
            "icon": "pdf-to-image",
            "category": "Convert from PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/convert?from=pdf&to=image",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["dpi-selection", "jpeg-png-formats"]
        },
        {
            "toolId": "pdf-to-txt",
            "name": "PDF to TXT",
            "description": "Extract raw text from PDF files.",
            "icon": "pdf-to-txt",
            "category": "Convert from PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/convert?from=pdf&to=txt",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["text-extraction"]
        },
        {
            "toolId": "pdf-to-html",
            "name": "PDF to HTML",
            "description": "Convert PDF layout to raw HTML.",
            "icon": "pdf-to-html",
            "category": "Convert from PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/convert?from=pdf&to=html",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["layout-preservation"]
        },
        {
            "toolId": "pdf-to-markdown",
            "name": "PDF to Markdown",
            "description": "Convert PDF text structure to Markdown formatted text.",
            "icon": "pdf-to-markdown",
            "category": "Convert from PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/convert?from=pdf&to=markdown",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["ai-assisted", "semantic-formatting"]
        },
        # Optimize PDF Category
        {
            "toolId": "compress-pdf",
            "name": "Compress PDF",
            "description": "Reduce file size of your PDF while retaining quality.",
            "icon": "compress-pdf",
            "category": "Optimize PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/compress",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["multiple-compression-profiles", "compression-estimation"]
        },
        {
            "toolId": "scan-to-pdf",
            "name": "Scan to PDF",
            "description": "Scan documents using your camera and save directly as PDF.",
            "icon": "scan-to-pdf",
            "category": "Optimize PDF",
            "supportedFormats": [],
            "route": "/scanner?mode=pdf",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["camera-scan", "pdf-output"]
        },
        {
            "toolId": "edit-pdf",
            "name": "Edit PDF",
            "description": "Add, remove, or modify content within a PDF.",
            "icon": "edit-pdf",
            "category": "Optimize PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/edit",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["text-annotations", "drawing-shapes", "signatures"]
        },
        {
            "toolId": "watermark",
            "name": "Watermark",
            "description": "Overlay a text or image watermark onto PDF pages.",
            "icon": "watermark",
            "category": "Optimize PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/watermark",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["text-watermarks", "opacity-settings", "custom-rotation"]
        },
        {
            "toolId": "organize-pages",
            "name": "Organize Pages",
            "description": "Rotate, reorder, and remove pages in your PDF.",
            "icon": "organize-pages",
            "category": "Optimize PDF",
            "supportedFormats": [".pdf"],
            "route": "/tools/organize-pages",
            "availability": {"available": True, "reason": ""},
            "capabilities": ["visual-management", "drag-reorder", "delete-pages", "rotate-pages"]
        },
        # AI Tools Category
        {
            "toolId": "summarize-pdf",
            "name": "Summarize PDF",
            "description": "Generate a concise summary of a PDF's contents using AI.",
            "icon": "summarize-pdf",
            "category": "AI Tools",
            "supportedFormats": [".pdf"],
            "route": "/ai/summarize",
            "availability": {"available": ai_available, "reason": "" if ai_available else "Gemini API key is not configured on the server"},
            "capabilities": ["key-insights", "multi-lingual-summary"]
        },
        {
            "toolId": "ask-pdf",
            "name": "Ask PDF",
            "description": "Interact with your PDF via an AI-powered conversational agent.",
            "icon": "ask-pdf",
            "category": "AI Tools",
            "supportedFormats": [".pdf"],
            "route": "/ai/ask",
            "availability": {"available": ai_available, "reason": "" if ai_available else "Gemini API key is not configured on the server"},
            "capabilities": ["semantic-search", "citation-reference"]
        },
        {
            "toolId": "translate-pdf",
            "name": "Translate PDF",
            "description": "Translate the content of your PDF to another language using AI.",
            "icon": "translate-pdf",
            "category": "AI Tools",
            "supportedFormats": [".pdf"],
            "route": "/ai/translate",
            "availability": {"available": ai_available, "reason": "" if ai_available else "Gemini API key is not configured on the server"},
            "capabilities": ["auto-language-detection", "preserves-original-layout"]
        },
        {
            "toolId": "extract-tables",
            "name": "Extract Tables",
            "description": "Automatically detect and extract tables from a PDF using AI.",
            "icon": "extract-tables",
            "category": "AI Tools",
            "supportedFormats": [".pdf"],
            "route": "/ai/extract-tables",
            "availability": {"available": ai_available, "reason": "" if ai_available else "Gemini API key is not configured on the server"},
            "capabilities": ["smart-detection", "csv-download"]
        },
        # Image Tools Category
        {"toolId": "image-convert",    "name": "Convert Image",       "description": "Convert between JPEG, PNG, WebP, BMP, TIFF, GIF.",   "icon": "image-convert",    "category": "Image Tools", "supportedFormats": [".jpg",".jpeg",".png",".webp",".bmp",".tiff",".gif"], "route": "/tools/images?op=convert",            "availability": {"available": True, "reason": ""}, "capabilities": ["format-conversion"]},
        {"toolId": "image-resize",     "name": "Resize Image",        "description": "Resize images to exact or proportional dimensions.", "icon": "image-resize",     "category": "Image Tools", "supportedFormats": [".jpg",".jpeg",".png",".webp",".bmp",".tiff"],        "route": "/tools/images?op=resize",             "availability": {"available": True, "reason": ""}, "capabilities": ["keep-aspect-ratio"]},
        {"toolId": "image-crop",       "name": "Crop Image",          "description": "Crop image to a specific region.",                  "icon": "image-crop",       "category": "Image Tools", "supportedFormats": [".jpg",".jpeg",".png",".webp",".bmp"],                "route": "/tools/images?op=crop",               "availability": {"available": True, "reason": ""}, "capabilities": ["precise-crop"]},
        {"toolId": "image-rotate",     "name": "Rotate Image",        "description": "Rotate image by any angle.",                       "icon": "image-rotate",     "category": "Image Tools", "supportedFormats": [".jpg",".jpeg",".png",".webp",".bmp"],                "route": "/tools/images?op=rotate",             "availability": {"available": True, "reason": ""}, "capabilities": ["arbitrary-angle"]},
        {"toolId": "image-flip",       "name": "Flip Image",          "description": "Flip image horizontally or vertically.",           "icon": "image-flip",       "category": "Image Tools", "supportedFormats": [".jpg",".jpeg",".png",".webp",".bmp"],                "route": "/tools/images?op=flip",               "availability": {"available": True, "reason": ""}, "capabilities": ["horizontal","vertical"]},
        {"toolId": "image-brightness", "name": "Adjust Brightness",   "description": "Brighten or darken your images.",                  "icon": "image-brightness", "category": "Image Tools", "supportedFormats": [".jpg",".jpeg",".png",".webp",".bmp"],                "route": "/tools/images?op=brightness",         "availability": {"available": True, "reason": ""}, "capabilities": ["brightness-control"]},
        {"toolId": "image-contrast",   "name": "Adjust Contrast",     "description": "Fine-tune image contrast.",                        "icon": "image-contrast",   "category": "Image Tools", "supportedFormats": [".jpg",".jpeg",".png",".webp",".bmp"],                "route": "/tools/images?op=contrast",           "availability": {"available": True, "reason": ""}, "capabilities": ["contrast-control"]},
        {"toolId": "image-saturation", "name": "Adjust Saturation",   "description": "Boost or reduce color saturation.",                "icon": "image-saturation", "category": "Image Tools", "supportedFormats": [".jpg",".jpeg",".png",".webp",".bmp"],                "route": "/tools/images?op=saturation",         "availability": {"available": True, "reason": ""}, "capabilities": ["color-control"]},
        {"toolId": "image-sharpness",  "name": "Sharpen Image",       "description": "Sharpen or blur images.",                          "icon": "image-sharpness",  "category": "Image Tools", "supportedFormats": [".jpg",".jpeg",".png",".webp",".bmp"],                "route": "/tools/images?op=sharpness",          "availability": {"available": True, "reason": ""}, "capabilities": ["sharpen","blur"]},
        {"toolId": "image-bg-remove",  "name": "Remove Background",   "description": "Automatically remove image background.",           "icon": "image-bg-remove",  "category": "Image Tools", "supportedFormats": [".jpg",".jpeg",".png",".webp"],                       "route": "/tools/images?op=background_removal", "availability": {"available": True, "reason": ""}, "capabilities": ["ai-removal","threshold-removal"]},
        {"toolId": "image-watermark",  "name": "Watermark Image",     "description": "Add text or image watermarks to photos.",          "icon": "image-watermark",  "category": "Image Tools", "supportedFormats": [".jpg",".jpeg",".png",".webp"],                       "route": "/tools/images?op=watermark",          "availability": {"available": True, "reason": ""}, "capabilities": ["text-watermark","image-watermark"]},
        {"toolId": "image-vectorize",  "name": "Vectorize Image",     "description": "Convert raster images to SVG vectors.",            "icon": "image-vectorize",  "category": "Image Tools", "supportedFormats": [".jpg",".jpeg",".png",".bmp"],                        "route": "/tools/images?op=vectorize",          "availability": {"available": True, "reason": ""}, "capabilities": ["svg-output"]},
        # Video Tools Category
        {"toolId": "video-convert",        "name": "Convert Video",       "description": "Convert between MP4, AVI, MKV, MOV, WebM.",     "icon": "video-convert",        "category": "Video Tools", "supportedFormats": [".mp4",".avi",".mkv",".mov",".webm"],    "route": "/tools/video?op=convert",        "availability": {"available": True, "reason": ""}, "capabilities": ["format-conversion"]},
        {"toolId": "video-transcode",      "name": "Transcode Video",     "description": "Re-encode with custom codecs and quality.",     "icon": "video-transcode",      "category": "Video Tools", "supportedFormats": [".mp4",".avi",".mkv",".mov"],            "route": "/tools/video?op=transcode",      "availability": {"available": True, "reason": ""}, "capabilities": ["codec-selection","crf-control"]},
        {"toolId": "video-trim",           "name": "Trim Video",          "description": "Cut video to a specific time range.",           "icon": "video-trim",           "category": "Video Tools", "supportedFormats": [".mp4",".avi",".mkv",".mov",".webm"],    "route": "/tools/video?op=trim",           "availability": {"available": True, "reason": ""}, "capabilities": ["precise-trim"]},
        {"toolId": "video-merge",          "name": "Merge Videos",        "description": "Concatenate multiple videos into one.",         "icon": "video-merge",          "category": "Video Tools", "supportedFormats": [".mp4",".avi",".mkv",".mov"],            "route": "/tools/video?op=merge",          "availability": {"available": True, "reason": ""}, "capabilities": ["multi-file-merge"]},
        {"toolId": "video-extract-audio",  "name": "Extract Audio",       "description": "Extract audio track from video.",              "icon": "video-extract-audio",  "category": "Video Tools", "supportedFormats": [".mp4",".avi",".mkv",".mov",".webm"],    "route": "/tools/video?op=extract_audio",  "availability": {"available": True, "reason": ""}, "capabilities": ["mp3-output","aac-output"]},
        {"toolId": "video-normalize",      "name": "Normalize Audio",     "description": "Normalize audio loudness in video/audio.",     "icon": "video-normalize",      "category": "Video Tools", "supportedFormats": [".mp4",".mp3",".wav",".aac"],            "route": "/tools/video?op=normalize_audio","availability": {"available": True, "reason": ""}, "capabilities": ["loudnorm-filter"]},
        {"toolId": "video-frames",         "name": "Extract Frames",      "description": "Extract frames from video as images.",         "icon": "video-frames",         "category": "Video Tools", "supportedFormats": [".mp4",".avi",".mkv",".mov",".webm"],    "route": "/tools/video?op=extract_frames", "availability": {"available": True, "reason": ""}, "capabilities": ["fps-control","max-frames"]},
        {"toolId": "video-to-video",       "name": "Frames to Video",     "description": "Assemble image frames into a video.",          "icon": "video-to-video",       "category": "Video Tools", "supportedFormats": [".jpg",".jpeg",".png"],                  "route": "/tools/video?op=frames_to_video","availability": {"available": True, "reason": ""}, "capabilities": ["custom-fps"]},
        {"toolId": "video-to-gif",         "name": "Frames to GIF",       "description": "Create an animated GIF from image frames.",    "icon": "video-to-gif",         "category": "Video Tools", "supportedFormats": [".jpg",".jpeg",".png"],                  "route": "/tools/video?op=frames_to_gif",  "availability": {"available": True, "reason": ""}, "capabilities": ["gif-output","palette-optimization"]},
        # Archive Tools Category
        {"toolId": "archive-extract", "name": "Extract Archive", "description": "Extract ZIP, RAR, or 7Z archives.", "icon": "archive-extract", "category": "Archive Tools", "supportedFormats": [".zip",".rar",".7z"], "route": "/tools/archive?op=extract",    "availability": {"available": True, "reason": ""}, "capabilities": ["zip","rar","7z"]},
        {"toolId": "archive-zip",     "name": "Create ZIP",     "description": "Compress multiple files into a ZIP.", "icon": "archive-zip",     "category": "Archive Tools", "supportedFormats": ["*"],                  "route": "/tools/archive?op=create_zip", "availability": {"available": True, "reason": ""}, "capabilities": ["deflate-compression"]},
    ]
    return tools


# ── Smart Scanner ──────────────────────────────────────────────────────────────

@router.post("/detect-document")
async def detect_document(body: dict, current_user: dict = Depends(get_current_user)):
    image_b64 = body.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="image (base64 string) is required")

    try:
        # Strip header if present e.g. "data:image/jpeg;base64,..."
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        img_bytes = base64.b64decode(image_b64)
        corners = detect_document_corners(img_bytes)
        return {"corners": corners}
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to detect document: {str(e)}")


@router.post("/process-scan")
async def process_scan(body: dict, current_user: dict = Depends(get_current_user)):
    image_b64 = body.get("image")
    corners = body.get("corners")
    mode = body.get("mode", "document")
    filename = body.get("filename", "scan.jpg")

    if not image_b64:
        raise HTTPException(status_code=400, detail="image (base64 string) is required")
    if not corners or len(corners) != 4:
        raise HTTPException(status_code=400, detail="corners must contain exactly 4 points")

    try:
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        img_bytes = base64.b64decode(image_b64)
        
        # Run real OpenCV perspective warping & enhance
        result_bytes = warp_perspective_and_enhance(img_bytes, corners, mode)
        
        # Save results as a real asset
        db = get_db()
        user_id = str(current_user["_id"])
        url = await _save_result(result_bytes, filename, "image/jpeg", user_id, db)
        
        # Get the newly inserted file doc to return full details
        file_doc = await db.files.find_one({
            "user_id": user_id,
            "storage_url": url,
            "is_deleted": False
        })
        
        if not file_doc:
            raise HTTPException(status_code=500, detail="Saved scan file could not be retrieved")

        return {
            "_id": str(file_doc["_id"]),
            "original_filename": file_doc["original_filename"],
            "content_type": file_doc["content_type"],
            "size": file_doc["size"],
            "created_at": file_doc["created_at"].isoformat() if isinstance(file_doc["created_at"], datetime) else str(file_doc["created_at"]),
            "storage_url": file_doc["storage_url"],
            "thumbnail_url": file_doc["storage_url"]
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to process scan: {str(e)}")
