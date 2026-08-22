"""Scanner service — OpenCV processing for document detection, cropping, perspective correction, and image enhancements"""
import cv2
import numpy as np


def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Orders coordinates: [top-left, top-right, bottom-right, bottom-left].
    pts is a numpy array of shape (4, 2).
    """
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)

    rect = np.zeros((4, 2), dtype="float32")
    rect[0] = pts[np.argmin(s)]       # top-left
    rect[2] = pts[np.argmax(s)]       # bottom-right
    rect[1] = pts[np.argmin(diff)]    # top-right
    rect[3] = pts[np.argmax(diff)]    # bottom-left
    return rect


def detect_document_corners(image_bytes: bytes) -> list[dict]:
    """
    Detects the 4 corners of a document in the image using OpenCV.
    Returns relative percentage coordinates (x, y in [0.0, 1.0]).
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")

    h, w = img.shape[:2]

    # Preprocessing
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Edge detection
    edged = cv2.Canny(blurred, 75, 200)

    # Find contours
    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    doc_contour = None
    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)

        if len(approx) == 4:
            doc_contour = approx
            break

    # Fallback to 10% margins if no quadrilateral is detected
    if doc_contour is None:
        pts = np.array([
            [w * 0.1, h * 0.1],
            [w * 0.9, h * 0.1],
            [w * 0.9, h * 0.9],
            [w * 0.1, h * 0.9]
        ], dtype="float32")
    else:
        pts = doc_contour.reshape(4, 2).astype("float32")

    ordered = order_points(pts)

    # Return as relative coordinates [0, 1]
    return [
        {"x": float(p[0] / w), "y": float(p[1] / h)}
        for p in ordered
    ]


def warp_perspective_and_enhance(image_bytes: bytes, corners: list[dict], mode: str) -> bytes:
    """
    Warps perspective of the document using specified corners and applies mode filters.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")

    h, w = img.shape[:2]

    # Scale percentage corners to absolute pixel coordinates
    pts = np.zeros((4, 2), dtype="float32")
    for i, c in enumerate(corners):
        pts[i] = [c["x"] * w, c["y"] * h]

    # Sort corners: top-left, top-right, bottom-right, bottom-left
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Calculate width of new image
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    # Calculate height of new image
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))

    # Guard against zero dimensions
    maxWidth = max(maxWidth, 100)
    maxHeight = max(maxHeight, 100)

    # Destination points for warping
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")

    # Warp perspective
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(img, M, (maxWidth, maxHeight))

    # Apply mode-based processing
    if mode == "document":
        # Grayscale + adaptive Gaussian thresholding for clean black-on-white text
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        processed = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 10
        )
    elif mode == "receipt":
        # Pure binary Otsu thresholding for high contrast
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        _, processed = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    elif mode == "id-card":
        # Force crop to standard ID card aspect ratio (1:1.58)
        target_h = int(maxWidth / 1.58)
        if target_h > 0:
            warped = cv2.resize(warped, (maxWidth, target_h), interpolation=cv2.INTER_CUBIC)
        # Enhance details using CLAHE on LAB luminance
        lab = cv2.cvtColor(warped, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl, a, b))
        processed = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    elif mode == "book":
        # Brighten pages using Gamma correction (Gamma = 1.5)
        gamma = 1.5
        invGamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
        processed = cv2.LUT(warped, table)
    else:
        processed = warped

    # Encode processed image back to JPEG bytes
    _, encoded = cv2.imencode(".jpg", processed)
    return encoded.tobytes()
