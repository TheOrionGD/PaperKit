"""AI service — backend-mediated Groq & Gemini AI calls. API keys never reach the frontend."""
import base64
import io
from typing import Optional
from PIL import Image
import fitz  # PyMuPDF
from config import get_settings

settings = get_settings()

# Initialize Google Generative AI if key is present
_gemini_configured = False
if settings.gemini_api_key:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        _gemini_configured = True
    except Exception:
        _gemini_configured = False

# Initialize Groq client if key is present
_groq_client = None


def get_groq_client():
    global _groq_client
    if _groq_client is None and settings.groq_api_key:
        try:
            from groq import Groq
            _groq_client = Groq(api_key=settings.groq_api_key)
        except Exception:
            _groq_client = None
    return _groq_client


def _get_gemini_model(model_name: str = "gemini-3.6-flash"):
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    import google.generativeai as genai
    for m in [model_name, "gemini-flash-latest", "gemini-2.5-flash-lite"]:
        try:
            return genai.GenerativeModel(m)
        except Exception:
            continue
    return genai.GenerativeModel(model_name)


async def generate_text(prompt: str, system_prompt: Optional[str] = None) -> str:
    """Generate text completion using Groq (priority) or Gemini (fallback)."""
    groq_client = get_groq_client()
    
    # 1. Try Groq
    if groq_client:
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            model = settings.groq_text_model or "openai/gpt-oss-120b"
            completion = groq_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
            )
            return completion.choices[0].message.content or ""
        except Exception as e:
            # Fall through to Gemini if Groq fails
            print(f"[AI Service] Groq generation failed: {e}. Falling back to Gemini...")

    # 2. Try Gemini
    if settings.gemini_api_key:
        model = _get_gemini_model()
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        response = model.generate_content(full_prompt)
        return response.text or ""

    raise RuntimeError("No AI provider available. Please configure GROQ_API_KEY or GEMINI_API_KEY.")


async def ocr_image(image_bytes: bytes, mime_type: str = "image/jpeg", prompt: Optional[str] = None) -> str:
    """Extract text and tables from an image using Groq Vision or Gemini Vision."""
    default_prompt = (
        "Extract and transcribe all text, numbers, formulas, and tables from this image accurately. "
        "Preserve formatting and structure using Markdown (e.g. use markdown tables for tabular data, "
        "headers for titles, lists for bullet points). Do not omit any text."
    )
    task_prompt = prompt or default_prompt

    # 1. Try Groq Vision
    groq_client = get_groq_client()
    if groq_client and settings.groq_vision_model:
        try:
            base64_img = base64.b64encode(image_bytes).decode("utf-8")
            data_url = f"data:{mime_type};base64,{base64_img}"
            
            completion = groq_client.chat.completions.create(
                model=settings.groq_vision_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": task_prompt},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    }
                ],
                temperature=0.1,
            )
            text = completion.choices[0].message.content
            if text and text.strip():
                return text.strip()
        except Exception as e:
            print(f"[AI Service] Groq Vision OCR failed: {e}. Falling back to Gemini Vision...")

    # 2. Try Gemini Vision
    if settings.gemini_api_key:
        try:
            model = _get_gemini_model("gemini-3.6-flash")
            pil_image = Image.open(io.BytesIO(image_bytes))
            response = model.generate_content([task_prompt, pil_image])
            return response.text or ""
        except Exception as e:
            raise RuntimeError(f"OCR failed on all configured AI providers: {e}")

    raise RuntimeError("OCR requires either GROQ_API_KEY (with a vision model) or GEMINI_API_KEY.")


async def ocr_pdf(pdf_bytes: bytes, max_pages: int = 15) -> str:
    """Convert PDF pages to images and run Multimodal AI OCR on each page."""
    doc = fitz.open("pdf", pdf_bytes)
    total_pages = min(doc.page_count, max_pages)
    extracted_pages = []

    for i in range(total_pages):
        page = doc[i]
        # Render at 2x resolution (144 DPI) for crisp OCR
        pix = page.get_pixmap(dpi=144)
        img_bytes = pix.tobytes("jpeg")
        
        page_text = await ocr_image(
            img_bytes,
            mime_type="image/jpeg",
            prompt=f"Accurately transcribe all content on page {i+1} as clean Markdown.",
        )
        extracted_pages.append(f"## Page {i+1}\n\n{page_text}")

    doc.close()
    return "\n\n---\n\n".join(extracted_pages)


# High-level document tasks

async def summarize_pdf(text: str, language: str = "English") -> str:
    """Summarize PDF text using configured AI provider."""
    prompt = f"""Please provide a concise, well-structured summary of the following document in {language}.
Focus on the key points, main ideas, and important details.

Document:
{text[:16000]}"""
    return await generate_text(prompt)


async def ask_pdf(text: str, question: str) -> str:
    """Answer a question about a PDF using configured AI provider."""
    prompt = f"""Based on the following document, please answer this question accurately and concisely:

Question: {question}

Document:
{text[:16000]}

If the answer is not in the document, say so clearly."""
    return await generate_text(prompt)


async def translate_pdf(text: str, target_language: str) -> str:
    """Translate PDF text using configured AI provider."""
    prompt = f"""Translate the following text to {target_language}.
Preserve formatting, markdown structure, and tone as much as possible.

Text:
{text[:16000]}"""
    return await generate_text(prompt)


async def pdf_to_markdown(text: str) -> str:
    """Convert PDF text to clean Markdown using configured AI provider."""
    prompt = f"""Convert the following document text to clean, well-structured Markdown format.
Use appropriate headings, lists, bold/italic text, and tables where relevant.

Document:
{text[:16000]}"""
    return await generate_text(prompt)


async def extract_tables(text: str) -> str:
    """Extract tables from PDF text as Markdown tables using configured AI provider."""
    prompt = f"""Extract all tables from the following document and format them as Markdown tables.
If there are no tables, respond with "No tables found in this document."

Document:
{text[:16000]}"""
    return await generate_text(prompt)
