"""AI service — backend-mediated Gemini calls. API key never reaches the frontend."""
from config import get_settings
import google.generativeai as genai

settings = get_settings()

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

MODEL_NAME = "gemini-1.5-flash-latest"


def _get_model():
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return genai.GenerativeModel(MODEL_NAME)


async def summarize_pdf(text: str, language: str = "English") -> str:
    """Summarize PDF text using Gemini."""
    model = _get_model()
    prompt = f"""Please provide a concise, well-structured summary of the following document in {language}.
Focus on the key points, main ideas, and important details.

Document:
{text[:12000]}"""
    response = model.generate_content(prompt)
    return response.text


async def ask_pdf(text: str, question: str) -> str:
    """Answer a question about a PDF using Gemini."""
    model = _get_model()
    prompt = f"""Based on the following document, please answer this question accurately and concisely:

Question: {question}

Document:
{text[:12000]}

If the answer is not in the document, say so clearly."""
    response = model.generate_content(prompt)
    return response.text


async def translate_pdf(text: str, target_language: str) -> str:
    """Translate PDF text using Gemini."""
    model = _get_model()
    prompt = f"""Translate the following text to {target_language}. 
Preserve the formatting, structure, and tone as much as possible.

Text:
{text[:12000]}"""
    response = model.generate_content(prompt)
    return response.text


async def pdf_to_markdown(text: str) -> str:
    """Convert PDF text to clean Markdown using Gemini."""
    model = _get_model()
    prompt = f"""Convert the following document text to clean, well-structured Markdown format.
Use appropriate headings, lists, bold/italic text, and tables where relevant.

Document:
{text[:12000]}"""
    response = model.generate_content(prompt)
    return response.text


async def extract_tables(text: str) -> str:
    """Extract tables from PDF text as Markdown tables using Gemini."""
    model = _get_model()
    prompt = f"""Extract all tables from the following document and format them as Markdown tables.
If there are no tables, say "No tables found in this document."

Document:
{text[:12000]}"""
    response = model.generate_content(prompt)
    return response.text
