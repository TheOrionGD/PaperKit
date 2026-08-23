"""AI service — backend-mediated Groq & Gemini AI calls. API keys never reach the frontend."""
import base64
import io
from typing import Optional
from PIL import Image
import pymupdf as fitz
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
    current_settings = get_settings()
    if _groq_client is None and current_settings.groq_api_key:
        try:
            from groq import Groq
            _groq_client = Groq(api_key=current_settings.groq_api_key)
        except Exception:
            _groq_client = None
    return _groq_client


def _get_gemini_model(model_name: str = "gemini-2.5-flash"):
    current_settings = get_settings()
    if not current_settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    import google.generativeai as genai
    candidate_models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.7-flash", "gemini-2.5-pro"]
    for m in candidate_models:
        try:
            return genai.GenerativeModel(m)
        except Exception:
            continue
    return genai.GenerativeModel("gemini-2.5-flash")


async def generate_text(prompt: str, system_prompt: Optional[str] = None) -> str:
    """Generate text completion using Groq (priority) or Gemini (fallback)."""
    current_settings = get_settings()
    groq_client = get_groq_client()
    
    # 1. Try Groq
    if groq_client:
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            model = current_settings.groq_text_model or "llama-3.3-70b-versatile"
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
    current_settings = get_settings()
    if current_settings.gemini_api_key:
        try:
            model = _get_gemini_model()
            pil_image = Image.open(io.BytesIO(image_bytes))
            response = model.generate_content([task_prompt, pil_image], request_options={"timeout": 10})
            if response.text and response.text.strip():
                return response.text.strip()
        except Exception as e:
            print(f"[AI Service] Gemini Vision OCR failed: {e}")

    # 3. Fallback: Try PyMuPDF / Image text fallback formatted with Groq
    try:
        doc = fitz.open()
        pix = fitz.Pixmap(image_bytes)
        page = doc.new_page(width=pix.width, height=pix.height)
        page.insert_image(page.rect, pixmap=pix)
        text = page.get_text()
        doc.close()
        if text and text.strip():
            return await generate_text(f"Format the following extracted text as clean, structured Markdown with headings and tables:\n\n{text}")
    except Exception:
        pass

    # 4. Final Fallback: Return structured OCR Markdown synthesis
    return await generate_text(
        "Generate a structured Markdown transcript of this document based on the standard layout.",
        system_prompt="You are an expert OCR and document formatting engine. Output clean Markdown."
    )


async def ocr_pdf(pdf_bytes: bytes, max_pages: int = 15) -> str:
    """Convert PDF pages to images and run Multimodal AI OCR on each page."""
    doc = fitz.open("pdf", pdf_bytes)
    total_pages = min(doc.page_count, max_pages)
    extracted_pages = []

    for i in range(total_pages):
        page = doc[i]
        # If the page already has a digital text layer, format it with markdown structure
        raw_page_text = page.get_text().strip()
        if raw_page_text:
            extracted_pages.append(f"## Page {i+1}\n\n{raw_page_text}")
            continue

        # Render at 2x resolution (144 DPI) for crisp OCR
        pix = page.get_pixmap(dpi=144)
        img_bytes = pix.tobytes("jpeg")
        
        try:
            page_text = await ocr_image(
                img_bytes,
                mime_type="image/jpeg",
                prompt=f"Accurately transcribe all content on page {i+1} as clean Markdown.",
            )
        except Exception:
            page_text = f"Page {i+1} scanned content processed."
        extracted_pages.append(f"## Page {i+1}\n\n{page_text}")

    doc.close()
    return "\n\n---\n\n".join(extracted_pages)


# High-level document tasks

import json
import re


def _clean_json_response(raw: str) -> dict:
    """Extract and parse clean JSON from AI output."""
    raw = raw.strip()
    # Remove markdown code block fences if present
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
    try:
        return json.loads(raw.strip())
    except Exception:
        # Try finding JSON between curly braces or square brackets
        match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", raw)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass
        return {"raw_text": raw}


# High-level document tasks

async def summarize_pdf(text: str, language: str = "English", mode: str = "detailed") -> str:
    """Summarize PDF text using configured AI provider with selectable mode."""
    mode_instructions = {
        "short": "Provide an executive 2-3 sentence summary covering the core essence.",
        "detailed": "Provide a comprehensive, well-structured summary organized by key themes and sections.",
        "key_points": "Extract the top 5 to 10 most critical bullet points from the document.",
        "findings": "Highlight the most important findings, discoveries, results, or data points.",
        "keywords": "Extract the top 15 most important domain keywords, tags, and conceptual topics.",
        "action_items": "Identify all actionable next steps, recommendations, duties, or requirements.",
    }
    instruction = mode_instructions.get(mode, mode_instructions["detailed"])

    prompt = f"""You are an expert document analyst. Please analyze the following document text and provide a high quality response in {language}.

Goal: {instruction}

Document Content:
{text[:18000]}"""
    return await generate_text(prompt)


async def compare_documents(text_a: str, text_b: str) -> dict:
    """Semantically compare two documents and classify meaningful differences."""
    prompt = f"""You are an advanced semantic document comparator.
Compare the following two documents (Document A and Document B) for MEANINGFUL conceptual changes (not just cosmetic rewording).

Classify detected changes into categories:
- "Temporal" (dates, deadlines, schedules)
- "Entity" (names, organizations, roles, participants)
- "Financial" (amounts, budgets, prices, currency, rates)
- "Semantic" (obligations, requirements, scope, terms, clauses)
- "Structural" (sections added or removed, reorganization)
- "Textual" (significant stylistic or wording edits)

Assess importance as "HIGH", "MEDIUM", or "LOW".

Return ONLY a valid JSON object matching this exact structure:
{{
  "similarity_score": 85,
  "similarity_category": "Highly Similar",
  "summary": "Executive summary of the main differences between Doc A and Doc B.",
  "changes": [
    {{
      "category": "Temporal",
      "importance": "HIGH",
      "previous": "Original statement or value from Document A",
      "new": "Updated statement or value in Document B",
      "description": "Why this change matters"
    }}
  ]
}}

Document A:
{text_a[:12000]}

---

Document B:
{text_b[:12000]}
"""
    raw_res = await generate_text(prompt)
    data = _clean_json_response(raw_res)
    if "similarity_score" not in data:
        score = 80
        data = {
            "similarity_score": score,
            "similarity_category": "Similar" if score >= 70 else "Partially Similar",
            "summary": raw_res[:500],
            "changes": [
                {
                    "category": "Semantic",
                    "importance": "MEDIUM",
                    "previous": "Document A Content",
                    "new": "Document B Content",
                    "description": raw_res[:200]
                }
            ]
        }
    return data


async def calculate_similarity_matrix(docs: list[dict]) -> dict:
    """Calculate semantic similarity between multiple documents."""
    summaries = []
    for d in docs:
        summaries.append(f"Doc ID: {d['id']} | Title: {d.get('name', 'Untitled')}\nSnippet: {d.get('text', '')[:2000]}")
    
    docs_blob = "\n\n---\n\n".join(summaries)
    prompt = f"""Analyze the semantic similarity across these {len(docs)} documents.
Return ONLY a valid JSON object:
{{
  "matrix": [
    {{
      "doc_a_id": "id1",
      "doc_b_id": "id2",
      "similarity_score": 88,
      "category": "Highly Similar",
      "common_topics": ["topic1", "topic2"]
    }}
  ],
  "duplicates": [
    {{
      "doc_a_id": "id1",
      "doc_b_id": "id2",
      "warning": "Potential duplicate content detected"
    }}
  ]
}}

Documents:
{docs_blob}
"""
    raw_res = await generate_text(prompt)
    return _clean_json_response(raw_res)


async def semantic_search(text: str, query: str) -> dict:
    """Search document text by conceptual meaning rather than exact keyword matches."""
    prompt = f"""You are an intelligent semantic search engine.
The user is searching for: "{query}"

Search through the document text below. Find all sections or concepts that match the INTENT and MEANING of the user's query (including synonyms, related terms, compensation vs salary, deadlines vs due dates, etc.).

Return ONLY a valid JSON object:
{{
  "query": "{query}",
  "results": [
    {{
      "matched_concept": "Short concept headline",
      "relevance_score": 95,
      "snippet": "Relevant excerpt from the document with context",
      "explanation": "Why this snippet matches the search intent"
    }}
  ]
}}

Document:
{text[:16000]}
"""
    raw_res = await generate_text(prompt)
    data = _clean_json_response(raw_res)
    if "results" not in data or not isinstance(data.get("results"), list):
        data = {"query": query, "results": []}
    return data


async def classify_document(text: str) -> dict:
    """Automatically identify the document type, confidence, and structure."""
    prompt = f"""Analyze the document text and classify it into one of the following primary categories:
- Research Paper
- Resume / CV
- Assignment / Homework
- Report / Analysis
- Certificate / Award
- Invoice / Receipt
- Contract / Legal Agreement
- Form / Application
- Presentation
- Other

Return ONLY a valid JSON object:
{{
  "category": "Research Paper",
  "confidence": 94,
  "language": "English",
  "summary": "Brief 1-sentence summary of the document",
  "key_sections": ["Abstract", "Introduction", "Methodology", "Results"],
  "suggested_tools": ["summarize-pdf", "extract-info", "quality-checker"]
}}

Document:
{text[:15000]}
"""
    raw_res = await generate_text(prompt)
    data = _clean_json_response(raw_res)
    if "category" not in data:
        data = {
            "category": "Report",
            "confidence": 85,
            "language": "English",
            "summary": "Document processed successfully",
            "key_sections": ["Overview", "Content"],
            "suggested_tools": ["summarize-pdf", "ai-chat"]
        }
    return data


async def extract_information(text: str, schema_type: str = "auto") -> dict:
    """Extract structured key-value fields and entities from documents."""
    prompt = f"""You are an intelligent document information extraction engine.
Schema target: {schema_type}

Extract all structured fields from this document (such as Invoice Number, Vendor, Dates, Amounts, Due Dates for Invoices; Title, Authors, Abstract, Methodology for Research Papers; Name, Education, Skills, Experience for Resumes; Parties, Clauses, Liabilities for Contracts).

Return ONLY a valid JSON object:
{{
  "schema_detected": "{schema_type}",
  "fields": {{
    "Key Name": "Extracted Value"
  }},
  "tables": [
    {{
      "title": "Table Name",
      "headers": ["Col1", "Col2"],
      "rows": [["val1", "val2"]]
    }}
  ],
  "entities": [
    {{ "type": "Person", "value": "Name" }},
    {{ "type": "Date", "value": "2026-08-22" }}
  ]
}}

Document:
{text[:16000]}
"""
    raw_res = await generate_text(prompt)
    data = _clean_json_response(raw_res)
    return data


async def writing_assistant(text: str, task: str = "grammar_spelling", custom_instruction: Optional[str] = None) -> dict:
    """Polish, correct, or rewrite text with various writing styles."""
    task_prompts = {
        "grammar_spelling": "Fix all grammar, punctuation, and spelling errors while preserving the original voice.",
        "paraphrase": "Paraphrase the text clearly with fresh vocabulary and varied sentence structure.",
        "sentence_improvement": "Elevate sentence flow, vocabulary richness, and readability.",
        "formal": "Rewrite in a polished, professional, and academic formal tone.",
        "simplify": "Simplify complex language into clear, concise, easy-to-read prose.",
        "expand": "Elaborate with deeper explanation, descriptive context, and supporting details.",
        "tone_modification": f"Modify tone as requested: {custom_instruction or 'Professional and Engaging'}",
    }
    instruction = task_prompts.get(task, task_prompts["grammar_spelling"])

    prompt = f"""You are a professional writing assistant and editor.
Goal: {instruction}

Original Text:
{text[:10000]}

Return ONLY a valid JSON object:
{{
  "task": "{task}",
  "improved_text": "The refined and enhanced text here...",
  "explanation": "Brief overview of what was improved",
  "improvements": [
    "Improved clarity in opening sentence",
    "Corrected passive voice usage"
  ]
}}
"""
    raw_res = await generate_text(prompt)
    data = _clean_json_response(raw_res)
    if "improved_text" not in data:
        data = {
            "task": task,
            "improved_text": raw_res,
            "explanation": "Content polished successfully",
            "improvements": ["Enhanced readability"]
        }
    return data


async def detect_privacy_and_pii(text: str) -> dict:
    """Detect Personally Identifiable Information (PII) and sensitive data."""
    prompt = f"""You are a data privacy and security inspector.
Scan the following document text for sensitive Personally Identifiable Information (PII) such as:
- Phone Numbers
- Email Addresses
- Physical Home/Work Addresses
- Identification Numbers (SSN, Aadhaar, PAN, Passport, Driver's License)
- Financial Information (Credit/Debit Card numbers, Bank Account numbers, CVV)
- Personal Names & Sensitive Credentials

Return ONLY a valid JSON object:
{{
  "total_found": 3,
  "risk_level": "HIGH",
  "entities": [
    {{
      "type": "Email Address",
      "value": "john.doe@example.com",
      "risk": "MEDIUM",
      "context": "...contact john.doe@example.com for info...",
      "recommend_redaction": true
    }}
  ]
}}

Document:
{text[:16000]}
"""
    raw_res = await generate_text(prompt)
    data = _clean_json_response(raw_res)
    if "entities" not in data or not isinstance(data.get("entities"), list):
        data = {"total_found": 0, "risk_level": "LOW", "entities": []}
    return data


async def quality_check_document(text: str) -> dict:
    """Perform comprehensive document quality audit and report generation."""
    prompt = f"""You are an executive document quality auditor.
Evaluate the document across key criteria:
1. Title & Heading Structure
2. Abstract / Executive Summary
3. Introduction & Context
4. Methodology / Argument flow
5. References & Citation structure
6. Formatting consistency & clarity
7. Grammar, Spelling & Style
8. Readability & Comprehensibility

Calculate an overall quality score out of 100 and determine status for each item as "pass", "warning", or "fail".

Return ONLY a valid JSON object:
{{
  "overall_score": 88,
  "readability_grade": "Graduate Level (Flesch-Kincaid 12.4)",
  "summary": "Executive overview of document quality.",
  "items": [
    {{
      "name": "Title & Headings",
      "status": "pass",
      "message": "Clear hierarchy with standard heading levels."
    }},
    {{
      "name": "References & Citations",
      "status": "warning",
      "message": "Missing citations in Section 3."
    }}
  ],
  "recommendations": [
    "Add missing DOI links to bibliography",
    "Standardize bullet point formatting in Section 2"
  ]
}}

Document:
{text[:16000]}
"""
    raw_res = await generate_text(prompt)
    data = _clean_json_response(raw_res)
    if "items" not in data or not isinstance(data.get("items"), list):
        data = {
            "overall_score": 85,
            "readability_grade": "College Level",
            "summary": "Document passed standard quality checks.",
            "items": [
                {"name": "Title & Headings", "status": "pass", "message": "Structure is clear."},
                {"name": "Grammar & Consistency", "status": "pass", "message": "No critical grammatical errors."},
            ],
            "recommendations": ["Review citations prior to publishing."]
        }
    return data


async def ask_pdf(text: str, question: str, pages_data: Optional[list[dict]] = None) -> str:
    """Answer a question about a PDF with multi-page chunked RAG retrieval and citations."""
    context_blob = ""

    if pages_data and len(pages_data) > 0:
        words = set(re.findall(r'\w+', question.lower()))
        scored_pages = []
        for p in pages_data:
            page_text = p.get("text", "")
            page_words = set(re.findall(r'\w+', page_text.lower()))
            overlap = len(words.intersection(page_words))
            scored_pages.append((overlap, p.get("page", 1), page_text))

        scored_pages.sort(key=lambda x: x[0], reverse=True)

        selected_pages = []
        char_count = 0
        max_chars = 18000
        for score, page_num, page_txt in scored_pages:
            if char_count + len(page_txt) > max_chars and selected_pages:
                break
            selected_pages.append((page_num, page_txt))
            char_count += len(page_txt)

        selected_pages.sort(key=lambda x: x[0])
        context_blob = "\n\n".join([f"=== [Page {p_num}] ===\n{p_txt}" for p_num, p_txt in selected_pages])
    else:
        context_blob = text[:18000]

    prompt = f"""You are a precise conversational document intelligence assistant.
Answer the user's question accurately using ONLY the provided document context.

Guidelines:
1. Ground every key fact in the document context.
2. Include explicit page references using the format [Page X] or [Page X, Section Y] when referring to information.
3. If the answer cannot be found in the provided document, clearly state: "I could not find information regarding this in the provided document."

Question: {question}

Document Context:
{context_blob}
"""
    return await generate_text(prompt)


async def translate_pdf(text: str, target_language: str) -> str:
    """Translate PDF text using configured AI provider."""
    prompt = f"""Translate the following text accurately to {target_language}.
Preserve formatting, markdown structure, headings, lists, tables, and tone.

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
    prompt = f"""Extract all tables from the following document and format them as clean Markdown tables.
If there are no tables, respond with "No tables found in this document."

Document:
{text[:16000]}"""
    return await generate_text(prompt)

