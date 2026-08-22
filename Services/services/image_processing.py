"""Image processing service using Pillow.

Supports: convert, resize, crop, rotate, flip, brightness, contrast,
          saturation, sharpness, background_removal, watermark, vectorize.
"""
from __future__ import annotations

import io
import os
import subprocess
import tempfile
from typing import Callable

from PIL import Image, ImageEnhance, ImageDraw, ImageFont


# ── Public processors (each returns bytes of the result image) ────────────────

def convert_image(img_bytes: bytes, target_format: str, progress_cb: Callable = None) -> bytes:
    """Convert image to target format (jpeg, png, webp, bmp, gif, tiff)."""
    _progress(progress_cb, 30)
    img = _open(img_bytes)
    fmt = target_format.upper()
    if fmt == "JPG":
        fmt = "JPEG"
    if img.mode in ("RGBA", "LA", "P") and fmt == "JPEG":
        img = img.convert("RGB")
    _progress(progress_cb, 70)
    buf = io.BytesIO()
    img.save(buf, format=fmt, quality=92)
    _progress(progress_cb, 95)
    return buf.getvalue()


def resize_image(img_bytes: bytes, width: int, height: int, keep_aspect: bool = True, progress_cb: Callable = None) -> bytes:
    """Resize image to target dimensions."""
    _progress(progress_cb, 30)
    img = _open(img_bytes)
    if keep_aspect:
        img.thumbnail((width, height), Image.LANCZOS)
    else:
        img = img.resize((width, height), Image.LANCZOS)
    _progress(progress_cb, 80)
    return _save_as_original(img, img_bytes, progress_cb)


def crop_image(img_bytes: bytes, left: int, top: int, right: int, bottom: int, progress_cb: Callable = None) -> bytes:
    """Crop image to bounding box."""
    _progress(progress_cb, 30)
    img = _open(img_bytes)
    img = img.crop((left, top, right, bottom))
    _progress(progress_cb, 80)
    return _save_as_original(img, img_bytes, progress_cb)


def rotate_image(img_bytes: bytes, degrees: float, expand: bool = True, progress_cb: Callable = None) -> bytes:
    """Rotate image by degrees (counter-clockwise)."""
    _progress(progress_cb, 30)
    img = _open(img_bytes)
    img = img.rotate(degrees, expand=expand, resample=Image.BICUBIC)
    _progress(progress_cb, 80)
    return _save_as_original(img, img_bytes, progress_cb)


def flip_image(img_bytes: bytes, direction: str = "horizontal", progress_cb: Callable = None) -> bytes:
    """Flip image horizontally or vertically."""
    _progress(progress_cb, 30)
    img = _open(img_bytes)
    if direction == "horizontal":
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    else:
        img = img.transpose(Image.FLIP_TOP_BOTTOM)
    _progress(progress_cb, 80)
    return _save_as_original(img, img_bytes, progress_cb)


def adjust_brightness(img_bytes: bytes, factor: float, progress_cb: Callable = None) -> bytes:
    """Adjust brightness. factor 1.0 = original."""
    return _enhance(img_bytes, ImageEnhance.Brightness, factor, progress_cb)


def adjust_contrast(img_bytes: bytes, factor: float, progress_cb: Callable = None) -> bytes:
    """Adjust contrast. factor 1.0 = original."""
    return _enhance(img_bytes, ImageEnhance.Contrast, factor, progress_cb)


def adjust_saturation(img_bytes: bytes, factor: float, progress_cb: Callable = None) -> bytes:
    """Adjust color saturation. factor 1.0 = original."""
    return _enhance(img_bytes, ImageEnhance.Color, factor, progress_cb)


def adjust_sharpness(img_bytes: bytes, factor: float, progress_cb: Callable = None) -> bytes:
    """Adjust sharpness. factor 1.0 = original."""
    return _enhance(img_bytes, ImageEnhance.Sharpness, factor, progress_cb)


def remove_background(img_bytes: bytes, progress_cb: Callable = None) -> bytes:
    """Remove image background. Uses rembg if available, else threshold method."""
    _progress(progress_cb, 20)
    try:
        from rembg import remove as rembg_remove
        _progress(progress_cb, 50)
        result = rembg_remove(img_bytes)
        _progress(progress_cb, 90)
        return result
    except ImportError:
        # Fallback: simple threshold-based removal
        return _remove_background_threshold(img_bytes, progress_cb)


def add_watermark(img_bytes: bytes, text: str = "", watermark_image_bytes: bytes = None,
                  opacity: float = 0.4, position: str = "center", progress_cb: Callable = None) -> bytes:
    """Add text or image watermark."""
    _progress(progress_cb, 30)
    img = _open(img_bytes).convert("RGBA")
    w, h = img.size

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))

    if watermark_image_bytes:
        wm = _open(watermark_image_bytes).convert("RGBA")
        # Scale watermark to ~30% of image width
        wm_w = int(w * 0.3)
        wm_h = int(wm.height * wm_w / wm.width)
        wm = wm.resize((wm_w, wm_h), Image.LANCZOS)
        alpha = wm.split()[3]
        alpha = alpha.point(lambda p: int(p * opacity))
        wm.putalpha(alpha)
        pos = _get_position(position, w, h, wm_w, wm_h)
        overlay.paste(wm, pos, wm)
    else:
        draw = ImageDraw.Draw(overlay)
        font_size = max(20, w // 15)
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except OSError:
            font = ImageFont.load_default(size=font_size)
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        pos = _get_position(position, w, h, tw, th)
        fill_alpha = int(255 * opacity)
        draw.text(pos, text, font=font, fill=(255, 255, 255, fill_alpha))

    _progress(progress_cb, 70)
    out = Image.alpha_composite(img, overlay).convert("RGB")
    return _save_as_original(out, img_bytes, progress_cb)


def vectorize_image(img_bytes: bytes, progress_cb: Callable = None) -> bytes:
    """Convert raster image to SVG using vtracer CLI (falls back to potrace)."""
    _progress(progress_cb, 20)
    with tempfile.TemporaryDirectory() as tmpdir:
        in_path  = os.path.join(tmpdir, "input.png")
        out_path = os.path.join(tmpdir, "output.svg")

        # Convert to PNG first
        img = _open(img_bytes).convert("RGB")
        img.save(in_path, format="PNG")

        _progress(progress_cb, 40)

        # Try vtracer first
        try:
            result = subprocess.run(
                ["vtracer", "--input", in_path, "--output", out_path],
                capture_output=True, timeout=60,
            )
            if result.returncode == 0 and os.path.exists(out_path):
                _progress(progress_cb, 90)
                with open(out_path, "rb") as f:
                    return f.read()
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        # Try potrace fallback
        try:
            bmp_path = os.path.join(tmpdir, "input.bmp")
            img_gray = img.convert("L").convert("1")
            img_gray.save(bmp_path, format="BMP")
            result = subprocess.run(
                ["potrace", "--svg", "-o", out_path, bmp_path],
                capture_output=True, timeout=60,
            )
            if result.returncode == 0 and os.path.exists(out_path):
                _progress(progress_cb, 90)
                with open(out_path, "rb") as f:
                    return f.read()
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        # Last resort: return a minimal SVG wrapping the PNG as a base64 data URI
        import base64
        img_b64 = base64.b64encode(img_bytes).decode()
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'width="{img.width}" height="{img.height}">'
            f'<image href="data:image/png;base64,{img_b64}" '
            f'width="{img.width}" height="{img.height}"/>'
            f'</svg>'
        )
        _progress(progress_cb, 90)
        return svg.encode("utf-8")


# ── Private helpers ───────────────────────────────────────────────────────────

def _open(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data))


def _progress(cb: Callable | None, pct: int):
    if cb:
        cb(pct)


def _enhance(img_bytes: bytes, Enhancer, factor: float, progress_cb: Callable) -> bytes:
    _progress(progress_cb, 30)
    img = _open(img_bytes)
    img = Enhancer(img).enhance(factor)
    _progress(progress_cb, 80)
    return _save_as_original(img, img_bytes, progress_cb)


def _save_as_original(img: Image.Image, original_bytes: bytes, progress_cb: Callable = None) -> bytes:
    """Save using original format if detectable, else JPEG."""
    fmt = "JPEG"
    try:
        original = Image.open(io.BytesIO(original_bytes))
        fmt = original.format or "JPEG"
    except Exception:
        pass
    if fmt in ("", None):
        fmt = "JPEG"
    if img.mode in ("RGBA", "LA", "P") and fmt == "JPEG":
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format=fmt, quality=92)
    _progress(progress_cb, 95)
    return buf.getvalue()


def _get_position(position: str, w: int, h: int, el_w: int, el_h: int) -> tuple:
    pad = 20
    positions = {
        "center":        ((w - el_w) // 2, (h - el_h) // 2),
        "top-left":      (pad, pad),
        "top-right":     (w - el_w - pad, pad),
        "bottom-left":   (pad, h - el_h - pad),
        "bottom-right":  (w - el_w - pad, h - el_h - pad),
    }
    return positions.get(position, positions["center"])


def _remove_background_threshold(img_bytes: bytes, progress_cb: Callable) -> bytes:
    """Simple background removal using corner color sampling + flood fill."""
    _progress(progress_cb, 30)
    img = _open(img_bytes).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    # Sample corners to determine background color
    corners = [
        pixels[0, 0][:3],
        pixels[w - 1, 0][:3],
        pixels[0, h - 1][:3],
        pixels[w - 1, h - 1][:3],
    ]
    bg_r = sum(c[0] for c in corners) // 4
    bg_g = sum(c[1] for c in corners) // 4
    bg_b = sum(c[2] for c in corners) // 4

    threshold = 40
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            dist = ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5
            if dist < threshold:
                pixels[x, y] = (r, g, b, 0)

    _progress(progress_cb, 85)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ── Job handler (registered in job_service) ───────────────────────────────────

def handle_image_job(doc: dict, progress_cb: Callable) -> list[dict]:
    """Entry point called by the job worker.
    doc contains: operation, inputAssets, parameters, userId
    Returns list of output asset dicts.
    """
    import asyncio
    from services.storage import upload_file_sync

    params = doc.get("parameters", {})
    assets = doc.get("inputAssets", [])
    if not assets:
        raise ValueError("No input assets")

    operation = doc.get("operation", "")
    sub_op = operation.split(".")[-1]  # e.g. "image.convert" → "convert"

    # Load first input
    from services.storage import get_file_bytes
    img_bytes = get_file_bytes(assets[0]["storageUrl"])
    source_filename = assets[0].get("filename", "image.jpg")
    stem = source_filename.rsplit(".", 1)[0]

    # Dispatch
    if sub_op == "convert":
        target_fmt = params.get("format", "jpeg")
        result = convert_image(img_bytes, target_fmt, progress_cb)
        out_filename = f"{stem}_converted.{target_fmt.lower().replace('jpeg','jpg')}"
        mime = f"image/{target_fmt.lower()}"

    elif sub_op == "resize":
        result = resize_image(
            img_bytes,
            width=int(params.get("width", 800)),
            height=int(params.get("height", 600)),
            keep_aspect=bool(params.get("keep_aspect", True)),
            progress_cb=progress_cb,
        )
        out_filename = f"{stem}_resized.jpg"
        mime = "image/jpeg"

    elif sub_op == "crop":
        result = crop_image(
            img_bytes,
            left=int(params.get("left", 0)),
            top=int(params.get("top", 0)),
            right=int(params.get("right", 100)),
            bottom=int(params.get("bottom", 100)),
            progress_cb=progress_cb,
        )
        out_filename = f"{stem}_cropped.jpg"
        mime = "image/jpeg"

    elif sub_op == "rotate":
        result = rotate_image(
            img_bytes,
            degrees=float(params.get("degrees", 90)),
            expand=bool(params.get("expand", True)),
            progress_cb=progress_cb,
        )
        out_filename = f"{stem}_rotated.jpg"
        mime = "image/jpeg"

    elif sub_op == "flip":
        result = flip_image(
            img_bytes,
            direction=params.get("direction", "horizontal"),
            progress_cb=progress_cb,
        )
        out_filename = f"{stem}_flipped.jpg"
        mime = "image/jpeg"

    elif sub_op == "brightness":
        result = adjust_brightness(img_bytes, float(params.get("factor", 1.2)), progress_cb)
        out_filename = f"{stem}_brightness.jpg"
        mime = "image/jpeg"

    elif sub_op == "contrast":
        result = adjust_contrast(img_bytes, float(params.get("factor", 1.2)), progress_cb)
        out_filename = f"{stem}_contrast.jpg"
        mime = "image/jpeg"

    elif sub_op == "saturation":
        result = adjust_saturation(img_bytes, float(params.get("factor", 1.2)), progress_cb)
        out_filename = f"{stem}_saturation.jpg"
        mime = "image/jpeg"

    elif sub_op == "sharpness":
        result = adjust_sharpness(img_bytes, float(params.get("factor", 2.0)), progress_cb)
        out_filename = f"{stem}_sharp.jpg"
        mime = "image/jpeg"

    elif sub_op == "background_removal":
        result = remove_background(img_bytes, progress_cb)
        out_filename = f"{stem}_nobg.png"
        mime = "image/png"

    elif sub_op == "watermark":
        wm_img_bytes = None
        if len(assets) > 1:
            wm_img_bytes = get_file_bytes(assets[1]["storageUrl"])
        result = add_watermark(
            img_bytes,
            text=params.get("text", ""),
            watermark_image_bytes=wm_img_bytes,
            opacity=float(params.get("opacity", 0.4)),
            position=params.get("position", "center"),
            progress_cb=progress_cb,
        )
        out_filename = f"{stem}_watermarked.jpg"
        mime = "image/jpeg"

    elif sub_op == "vectorize":
        result = vectorize_image(img_bytes, progress_cb)
        out_filename = f"{stem}.svg"
        mime = "image/svg+xml"

    else:
        raise ValueError(f"Unknown image sub-operation: {sub_op}")

    # Save result
    storage = upload_file_sync(result, out_filename, mime)
    progress_cb(98)

    # Save to DB files collection (sync version)
    
    return [{
        "filename": out_filename,
        "storageUrl": storage["storage_url"],
        "contentType": mime,
        "size": len(result),
    }]


