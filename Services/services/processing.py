"""PDF processing service using PyMuPDF (fitz) + LibreOffice + Tesseract"""
import io
import os
import uuid
import subprocess
import tempfile
from typing import Optional
import fitz  # PyMuPDF


def merge_pdfs(pdf_bytes_list: list[bytes], page_size: str = "original", margin_type: str = "none") -> bytes:
    """Merge multiple PDFs into one, scaling pages to target size and applying margins."""
    merged = fitz.open()
    
    # Define sizes in points (1 pt = 1/72 inch)
    SIZE_MAP = {
        "a4": (595.0, 842.0),
        "letter": (612.0, 792.0),
        "legal": (612.0, 1008.0),
        "a3": (842.0, 1190.0),
    }
    
    # Margin mapping in points
    MARGIN_MAP = {
        "none": 0.0,
        "small": 12.0,
        "normal": 24.0,
        "large": 36.0,
    }
    
    margin_points = MARGIN_MAP.get(margin_type, 0.0)
    
    for pdf_bytes in pdf_bytes_list:
        src = fitz.open("pdf", pdf_bytes)
        for page_idx in range(src.page_count):
            src_page = src[page_idx]
            src_rect = src_page.rect
            
            # Determine target dimensions
            if page_size in SIZE_MAP:
                tgt_w, tgt_h = SIZE_MAP[page_size]
            else:
                tgt_w, tgt_h = src_rect.width, src_rect.height
                
            # Create a new page in merged doc
            new_page = merged.new_page(width=tgt_w, height=tgt_h)
            
            # Calculate target rectangle for drawing the source page (accounting for margins)
            content_w = tgt_w - (2 * margin_points)
            content_h = tgt_h - (2 * margin_points)
            
            if content_w <= 0 or content_h <= 0:
                content_w, content_h = tgt_w, tgt_h
                m_x, m_y = 0.0, 0.0
            else:
                m_x = margin_points
                m_y = margin_points
            
            target_rect = fitz.Rect(m_x, m_y, m_x + content_w, m_y + content_h)
            
            # Draw the source page content onto the target rect
            new_page.show_pdf_page(target_rect, src, page_idx, keep_proportion=True)
            
        src.close()
        
    out = io.BytesIO()
    merged.save(out)
    merged.close()
    return out.getvalue()


def split_pdf(pdf_bytes: bytes, mode: str, **kwargs) -> list[bytes]:
    """Split a PDF. Returns list of PDF byte strings."""
    doc = fitz.open("pdf", pdf_bytes)
    results = []

    if mode == "range":
        # page_range like "1-3,5,7-9" (1-indexed)
        page_range_str = kwargs.get("page_range", "")
        pages = _parse_page_range(page_range_str, doc.page_count)
        new_doc = fitz.open()
        for p in pages:
            new_doc.insert_pdf(doc, from_page=p, to_page=p)
        buf = io.BytesIO()
        new_doc.save(buf)
        results = [buf.getvalue()]

    elif mode == "every":
        n = int(kwargs.get("every_n", 1))
        for start in range(0, doc.page_count, n):
            end = min(start + n - 1, doc.page_count - 1)
            new_doc = fitz.open()
            new_doc.insert_pdf(doc, from_page=start, to_page=end)
            buf = io.BytesIO()
            new_doc.save(buf)
            results.append(buf.getvalue())

    elif mode == "extract":
        pages = _parse_page_range(kwargs.get("pages", ""), doc.page_count)
        new_doc = fitz.open()
        for p in pages:
            new_doc.insert_pdf(doc, from_page=p, to_page=p)
        buf = io.BytesIO()
        new_doc.save(buf)
        results = [buf.getvalue()]

    doc.close()
    return results


def compress_pdf(pdf_bytes: bytes, quality: str = "balanced") -> bytes:
    """Compress PDF using PyMuPDF garbage collection and image downsampling."""
    doc = fitz.open("pdf", pdf_bytes)

    if quality in ("balanced", "small"):
        from PIL import Image as PILImage
        max_size = 1000 if quality == "balanced" else 600
        jpg_quality = 75 if quality == "balanced" else 50
        
        for page in doc:
            for img in page.get_images():
                xref = img[0]
                try:
                    base_image = doc.extract_image(xref)
                    if base_image:
                        image_bytes = base_image["image"]
                        img_pil = PILImage.open(io.BytesIO(image_bytes))
                        
                        # Downscale if dimensions exceed threshold
                        if img_pil.width > max_size or img_pil.height > max_size:
                            img_pil.thumbnail((max_size, max_size))
                            
                        out_bytes = io.BytesIO()
                        # Convert to RGB if in RGBA mode for JPEG format compatibility
                        if img_pil.mode in ("RGBA", "P"):
                            img_pil = img_pil.convert("RGB")
                        img_pil.save(out_bytes, format="JPEG", quality=jpg_quality)
                        doc.update_stream(xref, out_bytes.getvalue())
                except Exception:
                    pass

    deflate_images = True
    deflate_fonts = True
    garbage = 4  # maximum cleanup

    if quality == "high":
        garbage = 2
        deflate_images = False

    buf = io.BytesIO()
    doc.save(
        buf,
        garbage=garbage,
        deflate=True,
        deflate_images=deflate_images,
        deflate_fonts=deflate_fonts,
        clean=True,
    )
    doc.close()
    return buf.getvalue()


def get_page_count(pdf_bytes: bytes) -> int:
    doc = fitz.open("pdf", pdf_bytes)
    count = doc.page_count
    doc.close()
    return count


def convert_with_libreoffice(input_bytes: bytes, input_ext: str, output_ext: str, libreoffice_path: str = "libreoffice") -> bytes:
    """Convert document using LibreOffice headless."""
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, f"input.{input_ext}")
        with open(input_path, "wb") as f:
            f.write(input_bytes)

        cmd = [
            libreoffice_path, "--headless"
        ]
        if input_ext.lower() == "pdf":
            cmd.extend(["--infilter=writer_pdf_import"])
        
        cmd.extend([
            "--convert-to", output_ext,
            "--outdir", tmpdir, input_path,
        ])
        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if result.returncode != 0:
            raise RuntimeError(f"LibreOffice error: {result.stderr.decode()}")

        output_path = os.path.join(tmpdir, f"input.{output_ext}")
        if not os.path.exists(output_path):
            # LibreOffice may use different output names
            files = [f for f in os.listdir(tmpdir) if f.endswith(f".{output_ext}")]
            if not files:
                raise RuntimeError("LibreOffice produced no output")
            output_path = os.path.join(tmpdir, files[0])

        with open(output_path, "rb") as f:
            return f.read()


def pdf_to_images(pdf_bytes: bytes, dpi: int = 150) -> list[bytes]:
    """Convert PDF pages to JPEG images."""
    doc = fitz.open("pdf", pdf_bytes)
    images = []
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    for page in doc:
        pix = page.get_pixmap(matrix=mat)
        images.append(pix.tobytes("jpeg"))
    doc.close()
    return images


def images_to_pdf(image_bytes_list: list[bytes]) -> bytes:
    """Convert images to a PDF."""
    doc = fitz.open()
    for img_bytes in image_bytes_list:
        pix = fitz.Pixmap(img_bytes)
        page = doc.new_page(width=pix.width, height=pix.height)
        rect = fitz.Rect(0, 0, pix.width, pix.height)
        page.insert_image(rect, pixmap=pix)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def rotate_pdf(pdf_bytes: bytes, degrees: int, pages: Optional[list[int]] = None) -> bytes:
    """Rotate pages in a PDF."""
    doc = fitz.open("pdf", pdf_bytes)
    target_pages = pages if pages else list(range(doc.page_count))
    for i in target_pages:
        if 0 <= i < doc.page_count:
            doc[i].set_rotation(degrees)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def add_watermark(pdf_bytes: bytes, text: str, opacity: float = 0.3) -> bytes:
    """Add a text watermark to all pages."""
    doc = fitz.open("pdf", pdf_bytes)
    for page in doc:
        rect = page.rect
        page.insert_text(
            fitz.Point(rect.width / 4, rect.height / 2),
            text,
            fontsize=48,
            color=(0.5, 0.5, 0.5),
            fill_opacity=opacity,
        )
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def extract_text(pdf_bytes: bytes) -> str:
    """Extract all text from a PDF."""
    doc = fitz.open("pdf", pdf_bytes)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text


def organize_pdf_pages(pdf_bytes: bytes, pages_config: list[dict]) -> bytes:
    """Rotate, reorder, and remove pages in a single workflow."""
    doc = fitz.open("pdf", pdf_bytes)
    new_doc = fitz.open()
    for item in pages_config:
        idx = int(item["index"])
        rotation = int(item.get("rotation", 0))
        if 0 <= idx < doc.page_count:
            # Insert page from source doc
            new_doc.insert_pdf(doc, from_page=idx, to_page=idx)
            # Apply rotation if specified
            if rotation:
                new_page = new_doc[-1]
                new_page.set_rotation((new_page.rotation + rotation) % 360)
    buf = io.BytesIO()
    new_doc.save(buf)
    new_doc.close()
    doc.close()
    return buf.getvalue()


# ── Private helpers ────────────────────────────────────────────────────────────

def _parse_page_range(range_str: str, total: int) -> list[int]:
    """Parse '1-3,5,7' into [0,1,2,4,6] (0-indexed)."""
    pages = set()
    for part in range_str.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            for p in range(int(a) - 1, int(b)):
                if 0 <= p < total:
                    pages.add(p)
        elif part.isdigit():
            p = int(part) - 1
            if 0 <= p < total:
                pages.add(p)
    return sorted(pages)


# ── Python Conversion Fallbacks ───────────────────────────────────────────────

def pdf_to_txt(pdf_bytes: bytes) -> bytes:
    """Convert PDF to plain text."""
    text = extract_text(pdf_bytes)
    return text.encode("utf-8")


def pdf_to_html(pdf_bytes: bytes) -> bytes:
    """Convert PDF to raw HTML representation."""
    doc = fitz.open("pdf", pdf_bytes)
    html = "<html><head><meta charset='utf-8'><style>body { font-family: sans-serif; padding: 20px; } .page { margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 20px; }</style></head><body>"
    for i, page in enumerate(doc):
        html += f"<div class='page'><h3>Page {i+1}</h3>"
        html += page.get_text("html")
        html += "</div>"
    html += "</body></html>"
    doc.close()
    return html.encode("utf-8")


def pdf_to_word_fallback(pdf_bytes: bytes) -> bytes:
    """Fallback PDF to Word DOCX converter."""
    from docx import Document
    doc = fitz.open("pdf", pdf_bytes)
    docx_doc = Document()
    for page in doc:
        text = page.get_text("text")
        for line in text.split("\n"):
            if line.strip():
                docx_doc.add_paragraph(line)
    buf = io.BytesIO()
    docx_doc.save(buf)
    doc.close()
    return buf.getvalue()


def pdf_to_excel_fallback(pdf_bytes: bytes) -> bytes:
    """Fallback PDF to Excel XLSX converter using PyMuPDF page.find_tables()."""
    import openpyxl
    doc = fitz.open("pdf", pdf_bytes)
    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # remove default sheet
    
    for page_idx, page in enumerate(doc):
        ws = wb.create_sheet(title=f"Page {page_idx+1}")
        try:
            tables = page.find_tables()
            row_offset = 1
            for t in tables:
                data = t.extract()
                for r in data:
                    for col_idx, val in enumerate(r):
                        ws.cell(row=row_offset, column=col_idx+1, value=val)
                    row_offset += 1
                row_offset += 2  # space between tables
        except Exception:
            # Fallback to lines if table parsing fails
            text = page.get_text("text")
            for r_idx, line in enumerate(text.split("\n")):
                if line.strip():
                    ws.cell(row=r_idx+1, column=1, value=line)
            
    if not wb.sheetnames:
        ws = wb.create_sheet(title="Sheet 1")
        ws.cell(row=1, column=1, value="No tables found")
        
    buf = io.BytesIO()
    wb.save(buf)
    doc.close()
    return buf.getvalue()


def pdf_to_ppt_fallback(pdf_bytes: bytes) -> bytes:
    """Fallback PDF to PowerPoint PPTX converter."""
    from pptx import Presentation
    from pptx.util import Inches
    doc = fitz.open("pdf", pdf_bytes)
    prs = Presentation()
    blank_slide_layout = prs.slide_layouts[6]  # blank layout
    
    for page in doc:
        slide = prs.slides.add_slide(blank_slide_layout)
        text = page.get_text("text")
        if text.strip():
            txBox = slide.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(9), Inches(6.5))
            tf = txBox.text_frame
            tf.word_wrap = True
            tf.text = text
            
    buf = io.BytesIO()
    prs.save(buf)
    doc.close()
    return buf.getvalue()


def word_to_pdf_fallback(word_bytes: bytes) -> bytes:
    """Fallback DOCX to PDF converter."""
    from docx import Document
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    
    doc_stream = io.BytesIO(word_bytes)
    docx_doc = Document(doc_stream)
    
    pdf_stream = io.BytesIO()
    pdf_doc = SimpleDocTemplate(pdf_stream, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    for para in docx_doc.paragraphs:
        if para.text.strip():
            story.append(Paragraph(para.text, styles['Normal']))
            story.append(Spacer(1, 10))
            
    pdf_doc.build(story)
    return pdf_stream.getvalue()


def excel_to_pdf_fallback(excel_bytes: bytes) -> bytes:
    """Fallback XLSX to PDF converter."""
    import openpyxl
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, PageBreak, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors
    
    wb_stream = io.BytesIO(excel_bytes)
    wb = openpyxl.load_workbook(wb_stream, read_only=True)
    
    pdf_stream = io.BytesIO()
    pdf_doc = SimpleDocTemplate(pdf_stream, pagesize=landscape(letter))
    styles = getSampleStyleSheet()
    story = []
    
    for sheet in wb.worksheets:
        story.append(Paragraph(f"Sheet: {sheet.title}", styles['Heading1']))
        story.append(Spacer(1, 15))
        
        table_data = []
        # read max 100 rows and 15 columns for preview/fallback conversion
        for row in sheet.iter_rows(max_row=100, max_col=15, values_only=True):
            if any(cell is not None for cell in row):
                row_data = [str(cell) if cell is not None else "" for cell in row]
                table_data.append(row_data)
                
        if table_data:
            t = Table(table_data)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.grey),
                ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0,0), (-1,0), 8),
                ('GRID', (0,0), (-1,-1), 1, colors.black),
            ]))
            story.append(t)
        else:
            story.append(Paragraph("Empty sheet", styles['Normal']))
            
        story.append(PageBreak())
        
    pdf_doc.build(story)
    return pdf_stream.getvalue()


def apply_pdf_edits(pdf_bytes: bytes, operations: list[dict]) -> bytes:
    """Apply annotation/edit operations to a PDF and return the modified PDF bytes.
    
    Supported operation types:
      text       — insert text at (x, y) on a page
      highlight  — yellow highlight rectangle
      draw       — freehand polyline stroke
      image      — insert base64-encoded image at a rectangle
      erase      — redact (permanently remove) content in a rectangle
      annotation — sticky-note annotation
    
    Each operation dict has:
      type   : str
      page   : int (0-indexed)
      x, y   : float  (PDF-space coordinates)
      width, height : float (for image/erase/highlight)
      points : list of [x,y] (for draw)
      text   : str (for text/annotation)
      color  : list [r,g,b] floats 0-1 (optional)
      fontSize: int (for text)
      strokeWidth: float (for draw)
      opacity: float (for highlight)
    """
    import base64 as _b64
    doc = fitz.open("pdf", pdf_bytes)

    # Separate erase ops (redactions) to apply first per-page
    redact_ops: dict[int, list[dict]] = {}
    other_ops: list[dict] = []
    for op in operations:
        if op.get("type") == "erase":
            pg = int(op.get("page", 0))
            redact_ops.setdefault(pg, []).append(op)
        else:
            other_ops.append(op)

    # Apply redactions first
    for pg_idx, ops in redact_ops.items():
        if pg_idx >= doc.page_count:
            continue
        page = doc[pg_idx]
        for op in ops:
            x, y = float(op.get("x", 0)), float(op.get("y", 0))
            w, h = float(op.get("width", 50)), float(op.get("height", 20))
            rect = fitz.Rect(x, y, x + w, y + h)
            page.add_redact_annot(rect)
        page.apply_redactions()

    # Apply all other operations
    for op in other_ops:
        op_type = op.get("type", "")
        pg_idx = int(op.get("page", 0))
        if pg_idx >= doc.page_count:
            continue
        page = doc[pg_idx]
        color = op.get("color", [0, 0, 0])
        if isinstance(color, list) and len(color) == 3:
            r, g, b = float(color[0]), float(color[1]), float(color[2])
        else:
            r, g, b = 0.0, 0.0, 0.0

        if op_type == "text":
            x, y = float(op.get("x", 50)), float(op.get("y", 50))
            text = op.get("text", "")
            font_size = int(op.get("fontSize", 12))
            page.insert_text(
                fitz.Point(x, y),
                text,
                fontsize=font_size,
                color=(r, g, b),
            )

        elif op_type == "highlight":
            x, y = float(op.get("x", 0)), float(op.get("y", 0))
            w, h = float(op.get("width", 80)), float(op.get("height", 16))
            opacity = float(op.get("opacity", 0.35))
            rect = fitz.Rect(x, y, x + w, y + h)
            annot = page.add_highlight_annot(rect)
            annot.set_colors(stroke=(1.0, 0.95, 0.0))
            annot.set_opacity(opacity)
            annot.update()

        elif op_type == "draw":
            points_raw = op.get("points", [])
            if len(points_raw) < 2:
                continue
            stroke_width = float(op.get("strokeWidth", 2))
            # Draw as a series of line segments
            for i in range(len(points_raw) - 1):
                p1 = fitz.Point(float(points_raw[i][0]), float(points_raw[i][1]))
                p2 = fitz.Point(float(points_raw[i + 1][0]), float(points_raw[i + 1][1]))
                page.draw_line(p1, p2, color=(r, g, b), width=stroke_width)

        elif op_type == "image":
            x, y = float(op.get("x", 0)), float(op.get("y", 0))
            w, h = float(op.get("width", 100)), float(op.get("height", 100))
            img_b64 = op.get("imageData", "")
            if img_b64:
                if "," in img_b64:
                    img_b64 = img_b64.split(",", 1)[1]
                try:
                    img_bytes = _b64.b64decode(img_b64)
                    rect = fitz.Rect(x, y, x + w, y + h)
                    page.insert_image(rect, stream=img_bytes)
                except Exception:
                    pass

        elif op_type == "annotation":
            x, y = float(op.get("x", 50)), float(op.get("y", 50))
            text = op.get("text", "Note")
            annot = page.add_text_annot(fitz.Point(x, y), text)
            annot.update()

    buf = io.BytesIO()
    doc.save(buf, garbage=3, deflate=True, clean=True)
    doc.close()
    return buf.getvalue()


def ppt_to_pdf_fallback(ppt_bytes: bytes) -> bytes:
    """Fallback PPTX to PDF converter."""
    from pptx import Presentation
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet
    
    ppt_stream = io.BytesIO(ppt_bytes)
    prs = Presentation(ppt_stream)
    
    pdf_stream = io.BytesIO()
    pdf_doc = SimpleDocTemplate(pdf_stream, pagesize=landscape(letter))
    styles = getSampleStyleSheet()
    story = []
    
    for slide_idx, slide in enumerate(prs.slides):
        story.append(Paragraph(f"Slide {slide_idx+1}", styles['Heading1']))
        story.append(Spacer(1, 15))
        
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                story.append(Paragraph(shape.text, styles['Normal']))
                story.append(Spacer(1, 10))
                
        story.append(PageBreak())
        
    pdf_doc.build(story)
    return pdf_stream.getvalue()
