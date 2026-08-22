"""AI router — backend-mediated Gemini calls"""
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
    if not text.strip():
        raise HTTPException(status_code=422, detail="PDF contains no extractable text. Try OCR first.")
    return text


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
