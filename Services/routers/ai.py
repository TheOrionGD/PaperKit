"""AI router — backend-mediated Groq & Gemini calls"""
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from middleware.auth import get_current_user
from services.storage import get_file_bytes
from services.processing import extract_text
from services import ai_service
from bson import ObjectId

from middleware.rate_limit import check_ai_rate_limit

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(check_ai_rate_limit)])


async def _get_pdf_text(file_id: str, user_id: str, db) -> str:
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=404, detail="File not found")
    f = await db.files.find_one({"_id": ObjectId(file_id), "user_id": user_id, "is_deleted": False})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    if f["content_type"] != "application/pdf":
        raise HTTPException(status_code=422, detail="Only PDF files are supported for AI tools")
    pdf_bytes = get_file_bytes(f["storage_url"])
    text = extract_text(pdf_bytes)
    
    # If text is empty (e.g. scanned PDF), automatically attempt Multimodal AI OCR
    if not text.strip():
        try:
            text = await ai_service.ocr_pdf(pdf_bytes, max_pages=10)
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"PDF contains no digital text and OCR failed: {str(e)}"
            )
    return text


@router.post("/ocr")
async def ocr_document(body: dict, current_user: dict = Depends(get_current_user)):
    """Run Multimodal Vision OCR (Groq / Gemini) on an image or scanned PDF."""
    file_id = body.get("file_id")
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=404, detail="File not found")

    db = get_db()
    f = await db.files.find_one({"_id": ObjectId(file_id), "user_id": str(current_user["_id"]), "is_deleted": False})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    file_bytes = get_file_bytes(f["storage_url"])
    content_type = f.get("content_type", "")

    try:
        if content_type == "application/pdf":
            result = await ai_service.ocr_pdf(file_bytes)
        elif content_type.startswith("image/"):
            result = await ai_service.ocr_image(file_bytes, mime_type=content_type)
        else:
            raise HTTPException(status_code=422, detail="Only PDF and Image files are supported for OCR")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

    return {"text": result, "ocr": result}


@router.post("/summarize")
async def summarize(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    language = body.get("language", "English")
    mode = body.get("mode", "detailed")
    raw_text = body.get("text", "")
    
    if not file_id and not raw_text:
        raise HTTPException(status_code=400, detail="file_id or text required")

    db = get_db()
    text = raw_text if raw_text else await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.summarize_pdf(text, language=language, mode=mode)
    return {"summary": result, "mode": mode, "language": language}


@router.post("/compare")
async def compare_documents_route(body: dict, current_user: dict = Depends(get_current_user)):
    """Semantic comparison between two documents."""
    file_id_a = body.get("file_id_a")
    file_id_b = body.get("file_id_b")
    text_a = body.get("text_a", "")
    text_b = body.get("text_b", "")

    db = get_db()
    user_id = str(current_user["_id"])

    if file_id_a and not text_a:
        text_a = await _get_pdf_text(file_id_a, user_id, db)
    if file_id_b and not text_b:
        text_b = await _get_pdf_text(file_id_b, user_id, db)

    if not text_a or not text_b:
        raise HTTPException(status_code=400, detail="Two documents or texts are required for comparison")

    result = await ai_service.compare_documents(text_a, text_b)
    return result


@router.post("/similarity-matrix")
async def similarity_matrix_route(body: dict, current_user: dict = Depends(get_current_user)):
    """Multi-document similarity analysis."""
    file_ids = body.get("file_ids", [])
    raw_docs = body.get("documents", [])

    db = get_db()
    user_id = str(current_user["_id"])

    docs = []
    if file_ids:
        for fid in file_ids:
            try:
                f = await db.files.find_one({"_id": ObjectId(fid), "user_id": user_id, "is_deleted": False})
                txt = await _get_pdf_text(fid, user_id, db)
                docs.append({"id": fid, "name": f["original_filename"] if f else fid, "text": txt})
            except Exception:
                continue
    elif raw_docs:
        docs = raw_docs

    if len(docs) < 2:
        raise HTTPException(status_code=400, detail="At least 2 documents are required for similarity analysis")

    result = await ai_service.calculate_similarity_matrix(docs)
    return result


@router.post("/search")
async def search_route(body: dict, current_user: dict = Depends(get_current_user)):
    """Semantic search inside a document."""
    file_id = body.get("file_id")
    query = body.get("query", "")
    raw_text = body.get("text", "")

    if not query:
        raise HTTPException(status_code=400, detail="Search query is required")

    db = get_db()
    text = raw_text if raw_text else await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.semantic_search(text, query)
    return result


@router.post("/classify")
async def classify_route(body: dict, current_user: dict = Depends(get_current_user)):
    """AI classification of document type and structure."""
    file_id = body.get("file_id")
    raw_text = body.get("text", "")

    db = get_db()
    text = raw_text if raw_text else await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.classify_document(text)
    return result


@router.post("/extract-info")
async def extract_info_route(body: dict, current_user: dict = Depends(get_current_user)):
    """Intelligent structured information extraction."""
    file_id = body.get("file_id")
    schema_type = body.get("schema_type", "auto")
    raw_text = body.get("text", "")

    db = get_db()
    text = raw_text if raw_text else await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.extract_information(text, schema_type=schema_type)
    return result


@router.post("/writing-assist")
async def writing_assist_route(body: dict, current_user: dict = Depends(get_current_user)):
    """AI writing assistant for grammar, paraphrase, simplify, formalize, etc."""
    text = body.get("text", "")
    task = body.get("task", "grammar_spelling")
    custom_instruction = body.get("custom_instruction")

    if not text:
        file_id = body.get("file_id")
        if file_id:
            db = get_db()
            text = await _get_pdf_text(file_id, str(current_user["_id"]), db)

    if not text:
        raise HTTPException(status_code=400, detail="Text or file_id is required")

    result = await ai_service.writing_assistant(text, task=task, custom_instruction=custom_instruction)
    return result


@router.post("/detect-privacy")
async def detect_privacy_route(body: dict, current_user: dict = Depends(get_current_user)):
    """Detect PII and sensitive data for privacy and redaction."""
    file_id = body.get("file_id")
    raw_text = body.get("text", "")

    db = get_db()
    text = raw_text if raw_text else await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.detect_privacy_and_pii(text)
    return result


@router.post("/quality-check")
async def quality_check_route(body: dict, current_user: dict = Depends(get_current_user)):
    """Comprehensive document quality audit."""
    file_id = body.get("file_id")
    raw_text = body.get("text", "")

    db = get_db()
    text = raw_text if raw_text else await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.quality_check_document(text)
    return result


@router.post("/ask")
async def ask(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    question = body.get("question", "")
    raw_text = body.get("text", "")
    if (not file_id and not raw_text) or not question:
        raise HTTPException(status_code=400, detail="file_id/text and question required")

    db = get_db()
    pages_data = None
    if file_id:
        if not ObjectId.is_valid(file_id):
            raise HTTPException(status_code=404, detail="File not found")
        f = await db.files.find_one({"_id": ObjectId(file_id), "user_id": str(current_user["_id"]), "is_deleted": False})
        if not f:
            raise HTTPException(status_code=404, detail="File not found")
        if f["content_type"] != "application/pdf":
            raise HTTPException(status_code=422, detail="Only PDF files are supported for AI tools")
        pdf_bytes = get_file_bytes(f["storage_url"])
        from services.processing import extract_text_with_pages
        pages_data = extract_text_with_pages(pdf_bytes)
        text = "\n\n".join([f"=== [Page {p['page']}] ===\n{p['text']}" for p in pages_data])
        if not text.strip():
            text = await ai_service.ocr_pdf(pdf_bytes, max_pages=10)
    else:
        text = raw_text

    result = await ai_service.ask_pdf(text, question, pages_data=pages_data)
    return {"answer": result}


@router.post("/translate")
async def translate(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    target_language = body.get("target_language", "Spanish")
    raw_text = body.get("text", "")
    if not file_id and not raw_text:
        raise HTTPException(status_code=400, detail="file_id or text required")

    db = get_db()
    text = raw_text if raw_text else await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.translate_pdf(text, target_language)
    return {"translation": result}


@router.post("/extract-tables")
async def extract_tables(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    raw_text = body.get("text", "")
    if not file_id and not raw_text:
        raise HTTPException(status_code=400, detail="file_id or text required")

    db = get_db()
    text = raw_text if raw_text else await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.extract_tables(text)
    return {"tables": result}


@router.post("/pdf-to-markdown")
async def pdf_to_markdown_ai(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    raw_text = body.get("text", "")
    if not file_id and not raw_text:
        raise HTTPException(status_code=400, detail="file_id or text required")

    db = get_db()
    text = raw_text if raw_text else await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.pdf_to_markdown(text)
    return {"markdown": result}


@router.post("/generate-report-pdf")
async def generate_report_pdf_route(body: dict, current_user: dict = Depends(get_current_user)):
    """Convert AI summaries, comparison reports, or markdown analyses into a beautiful downloadable PDF report."""
    title = body.get("title", "PaperKit Document Intelligence Report")
    content = body.get("content", "")
    subtitle = body.get("subtitle", "AI Analysis & Insights")
    
    if not content:
        raise HTTPException(status_code=400, detail="content required")

    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    import re
    import html
    from services.storage import upload_file

    pdf_stream = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_stream,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6,
    )
    sub_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=14,
    )
    h2_style = ParagraphStyle(
        'ReportH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#2563EB'),
        spaceBefore=12,
        spaceAfter=6,
    )
    h3_style = ParagraphStyle(
        'ReportH3',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#334155'),
        spaceBefore=8,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6,
    )
    bullet_style = ParagraphStyle(
        'ReportBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        leftIndent=15,
        spaceAfter=4,
    )

    story = [
        Paragraph(html.escape(title), title_style),
        Paragraph(f"{html.escape(subtitle)} • Generated by PaperKit on {datetime.now(timezone.utc).strftime('%b %d, %Y')}", sub_style),
        HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#E2E8F0'), spaceAfter=14),
    ]

    for line in content.split('\n'):
        line_str = line.strip()
        if not line_str:
            story.append(Spacer(1, 4))
            continue
        
        # Heading 1 or 2
        if line_str.startswith('## '):
            clean = line_str[3:].strip()
            story.append(Paragraph(html.escape(clean), h2_style))
        elif line_str.startswith('### '):
            clean = line_str[4:].strip()
            story.append(Paragraph(html.escape(clean), h3_style))
        elif line_str.startswith('# '):
            clean = line_str[2:].strip()
            story.append(Paragraph(html.escape(clean), h2_style))
        elif line_str.startswith('- ') or line_str.startswith('* ') or line_str.startswith('• '):
            clean = line_str[2:].strip()
            # Replace basic markdown bold
            clean = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', html.escape(clean))
            story.append(Paragraph(f"&bull; {clean}", bullet_style))
        else:
            clean = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', html.escape(line_str))
            story.append(Paragraph(clean, body_style))

    doc.build(story)
    pdf_bytes = pdf_stream.getvalue()

    filename = f"{re.sub(r'[^a-zA-Z0-9_-]', '_', title)[:30]}_Report.pdf"
    storage = await upload_file(pdf_bytes, filename, "application/pdf")
    
    db = get_db()
    user_id = str(current_user["_id"])
    doc_meta = {
        "user_id": user_id,
        "original_filename": filename,
        "content_type": "application/pdf",
        "size": len(pdf_bytes),
        "page_count": 1,
        "storage_url": storage["storage_url"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.files.insert_one(doc_meta)

    return {
        "download_url": storage["storage_url"],
        "filename": filename,
        "size": len(pdf_bytes)
    }


@router.post("/searchable-pdf")
async def create_searchable_pdf_route(body: dict, current_user: dict = Depends(get_current_user)):
    """Create a searchable PDF from OCR extracted text or scanned document."""
    file_id = body.get("file_id")
    ocr_text = body.get("text", "")
    
    if not ocr_text and file_id:
        db = get_db()
        ocr_text = await _get_pdf_text(file_id, str(current_user["_id"]), db)

    if not ocr_text:
        raise HTTPException(status_code=400, detail="OCR text or valid file_id required")

    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from services.storage import upload_file
    import html

    pdf_stream = io.BytesIO()
    doc = SimpleDocTemplate(pdf_stream, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    story = []

    for line in ocr_text.split('\n'):
        if line.strip():
            story.append(Paragraph(html.escape(line.strip()), styles['Normal']))
        else:
            story.append(Spacer(1, 6))

    doc.build(story)
    pdf_bytes = pdf_stream.getvalue()

    filename = "OCR_Searchable_Document.pdf"
    storage = await upload_file(pdf_bytes, filename, "application/pdf")
    
    db = get_db()
    user_id = str(current_user["_id"])
    doc_meta = {
        "user_id": user_id,
        "original_filename": filename,
        "content_type": "application/pdf",
        "size": len(pdf_bytes),
        "page_count": 1,
        "storage_url": storage["storage_url"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.files.insert_one(doc_meta)

    return {
        "download_url": storage["storage_url"],
        "filename": filename,
        "size": len(pdf_bytes)
    }

