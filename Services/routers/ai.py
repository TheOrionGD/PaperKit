"""AI router — backend-mediated Groq & Gemini calls"""
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from middleware.auth import get_current_user
from services.storage import get_file_bytes
from services.processing import extract_text
from services import ai_service
from bson import ObjectId

router = APIRouter(prefix="/ai", tags=["ai"])


async def _get_pdf_text(file_id: str, user_id: str, db) -> str:
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
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")

    db = get_db()
    text = await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.summarize_pdf(text, language)
    return {"summary": result}


@router.post("/ask")
async def ask(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    question = body.get("question", "")
    if not file_id or not question:
        raise HTTPException(status_code=400, detail="file_id and question required")

    db = get_db()
    text = await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.ask_pdf(text, question)
    return {"answer": result}


@router.post("/translate")
async def translate(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    target_language = body.get("target_language", "Spanish")
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")

    db = get_db()
    text = await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.translate_pdf(text, target_language)
    return {"translation": result}


@router.post("/extract-tables")
async def extract_tables(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")

    db = get_db()
    text = await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.extract_tables(text)
    return {"tables": result}


@router.post("/pdf-to-markdown")
async def pdf_to_markdown_ai(body: dict, current_user: dict = Depends(get_current_user)):
    file_id = body.get("file_id")
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")

    db = get_db()
    text = await _get_pdf_text(file_id, str(current_user["_id"]), db)
    result = await ai_service.pdf_to_markdown(text)
    return {"markdown": result}
