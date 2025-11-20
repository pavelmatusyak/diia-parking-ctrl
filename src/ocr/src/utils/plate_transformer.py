import cv2
import numpy as np
from itertools import combinations
from typing import Optional, Tuple


def enhance_white_and_desaturate_colors(img_bgr: np.ndarray) -> np.ndarray:
    """
    Enhance white/light-gray areas and darken saturated colors.

    Args:
        img_bgr: BGR image

    Returns:
        Enhanced grayscale image
    """
    # Convert to HLS
    img_hls = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HLS)
    H, L, S = cv2.split(img_hls)

    # Normalize L and S to [0.0, 1.0]
    L_norm = L.astype(np.float32) / 255.0
    S_norm = S.astype(np.float32) / 255.0

    # Calculate new luminosity: L_new = L_norm * (1 - S_norm * W)
    # W is the darkening weight for saturated colors
    W = 0.5
    L_new_norm = L_norm * (1.0 - S_norm * W)

    # Scale back to [0, 255]
    L_new = np.clip(L_new_norm * 255.0, 0, 255).astype(np.uint8)

    return L_new


def preprocess_plate(
        img_bgr,
        scale=1.0,
        alpha=1.8,
        beta=-100,
        blur_type="bilateral",
        blur_k=13,
        use_clahe=True,
        clahe_clip=5.5,
        clahe_grid=13,
        thresh_mode="otsu",
        block_size=35,
        C=4,
        global_thr=64,
        morph_mode="open",
        morph_k=1,
        morph_iter=1,
        invert=False,
):
    """
    Comprehensive plate preprocessing pipeline

    Args:
        img_bgr: Input BGR image
        scale: Scale factor
        alpha: Contrast multiplier
        beta: Brightness adjustment
        blur_type: "none", "gaussian", "median", or "bilateral"
        blur_k: Blur kernel size (must be odd)
        use_clahe: Apply CLAHE
        clahe_clip: CLAHE clip limit
        clahe_grid: CLAHE tile grid size
        thresh_mode: "none", "otsu", "adaptive", or "global"
        block_size: Block size for adaptive threshold (must be odd)
        C: Constant for adaptive threshold
        global_thr: Threshold value for global thresholding
        morph_mode: "none", "open", "close", "erode", or "dilate"
        morph_k: Morphology kernel size
        morph_iter: Morphology iterations
        invert: Invert threshold result

    Returns:
        Tuple of (gray, processed, thresh)
    """
    img = img_bgr.copy()

    # Scale
    if scale != 1.0:
        img = cv2.resize(
            img,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_LINEAR if scale > 1 else cv2.INTER_AREA,
        )

    # Contrast/Brightness
    img = cv2.convertScaleAbs(img, alpha=float(alpha), beta=float(beta))

    # Grayscale with color enhancement
    gray = enhance_white_and_desaturate_colors(img)

    # CLAHE
    if use_clahe:
        clahe = cv2.createCLAHE(
            clipLimit=float(clahe_clip),
            tileGridSize=(int(clahe_grid), int(clahe_grid))
        )
        gray = clahe.apply(gray)

    # Contrast/Brightness again
    processed = cv2.convertScaleAbs(gray, alpha=float(alpha), beta=float(beta))

    # Blur
    k = int(blur_k)
    if k % 2 == 0:
        k += 1
    if blur_type == "gaussian" and k > 1:
        processed = cv2.GaussianBlur(processed, (k, k), 0)
    elif blur_type == "median" and k > 1:
        processed = cv2.medianBlur(processed, k)
    elif blur_type == "bilateral" and k > 1:
        processed = cv2.bilateralFilter(processed, k, 75, 75)

    # Threshold
    thresh = None
    tm = thresh_mode.lower()
    if tm != "none":
        if tm == "otsu":
            _, thresh = cv2.threshold(
                processed, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )
        elif tm == "adaptive":
            bs = int(block_size)
            if bs % 2 == 0:
                bs += 1
            thresh = cv2.adaptiveThreshold(
                processed,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                bs,
                int(C),
            )
        elif tm == "global":
            thr = int(global_thr)
            _, thresh = cv2.threshold(processed, thr, 255, cv2.THRESH_BINARY)

        # Invert
        if thresh is not None and invert:
            thresh = cv2.bitwise_not(thresh)

        # Morphology
        mm = morph_mode.lower()
        if mm != "none" and morph_k > 0:
            mk = int(morph_k)
            if mk < 1:
                mk = 1
            kernel = np.ones((mk, mk), np.uint8)
            it = int(morph_iter)

            if mm == "open":
                thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=it)
            elif mm == "close":
                thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=it)
            elif mm == "erode":
                thresh = cv2.erode(thresh, kernel, iterations=it)
            elif mm == "dilate":
                thresh = cv2.dilate(thresh, kernel, iterations=it)

    return gray, processed, thresh


def preprocess_for_corners(plate_bgr):
    """
    Preprocess plate image specifically for corner detection

    Args:
        plate_bgr: BGR plate image

    Returns:
        Thresholded binary image
    """
    gray, proc, thr = preprocess_plate(
        plate_bgr,
        scale=2.0,
        alpha=1.3,
        beta=-75,
        blur_type="bilateral",
        blur_k=11,
        use_clahe=True,
        clahe_clip=2.0,
        clahe_grid=8,
        thresh_mode="otsu",
        invert=False,
    )
    return thr


def get_plate_corners_from_contour(c: np.ndarray) -> Optional[np.ndarray]:
    """
    Extract 8 corners from contour approximation

    Args:
        c: Contour from findContours

    Returns:
        Corners array of shape (8, 2) or None if not found
    """
    peri = cv2.arcLength(c, True)
    eps = 0.01 * peri

    corners = None
    for _ in range(20):
        approx = cv2.approxPolyDP(c, eps, True)
        n = len(approx)
        if n == 8:
            corners = approx.reshape(8, 2).astype("float32")
            break
        # Too many points → increase eps
        if n > 8:
            eps *= 1.2
        # Too few points → decrease eps
        elif n < 8:
            eps *= 0.8
        else:
            break

    return corners


def combinate(poly: np.ndarray) -> list:
    """
    Generate all possible quadrilaterals from an 8-vertex polygon

    Args:
        poly: Array of 8 vertices, shape (8, 2)

    Returns:
        List of all possible 4-vertex combinations
    """
    n_vertices = 8
    k_select = 4
    vertices = poly
    indices = list(range(n_vertices))
    quad_indices_combinations = list(combinations(indices, k_select))

    all_quadrilaterals = []
    for indices in quad_indices_combinations:
        quadrilateral = poly[list(indices)]
        all_quadrilaterals.append(quadrilateral)

    return all_quadrilaterals


def polygon_area(pts: np.ndarray) -> float:
    """
    Calculate polygon area using shoelace formula

    Args:
        pts: Points array of shape (4, 2)

    Returns:
        Area in pixels
    """
    x = pts[:, 0]
    y = pts[:, 1]
    return 0.5 * abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def quad_from_poly_max_area(poly: np.ndarray) -> np.ndarray:
    """
    Find the quadrilateral with maximum area from 8-vertex polygon

    Args:
        poly: 8-vertex polygon, shape (8, 2)

    Returns:
        Best 4 corners as (4, 2) float32 array
    """
    combs = combinate(poly)
    best_area = -1
    best_quad = None

    for points in combs:
        area = polygon_area(points)
        if area > best_area:
            best_area = area
            best_quad = points

    return best_quad.astype(np.float32)


def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Order 4 points in clockwise order: TL, TR, BR, BL

    Args:
        pts: 4 points, shape (4, 2)

    Returns:
        Ordered points
    """
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # TL
    rect[2] = pts[np.argmax(s)]  # BR
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # TR
    rect[3] = pts[np.argmax(diff)]  # BL
    return rect


def warp_plate(plate_bgr: np.ndarray, corners: np.ndarray) -> np.ndarray:
    """
    Apply perspective transform to straighten plate

    Args:
        plate_bgr: BGR plate image
        corners: 4 corner points

    Returns:
        Warped/straightened plate image
    """
    rect = order_points(corners)
    (tl, tr, br, bl) = rect

    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = int(max(widthA, widthB))

    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = int(max(heightA, heightB))

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(plate_bgr, M, (maxWidth, maxHeight))
    return warped


def expand_corners(corners: np.ndarray, expand_px: int = 15) -> np.ndarray:
    """
    Expand rectangle by adding margin on all sides

    Args:
        corners: 4 corner points
        expand_px: Number of pixels to expand

    Returns:
        Expanded corners
    """
    rect = order_points(corners)
    tl, tr, br, bl = rect

    def expand_point(p, d1, d2):
        v1 = d1 / (np.linalg.norm(d1) + 1e-6)
        v2 = d2 / (np.linalg.norm(d2) + 1e-6)
        return p - v1 * expand_px - v2 * expand_px

    new_tl = expand_point(tl, tr - tl, bl - tl)
    new_tr = expand_point(tr, br - tr, tl - tr)
    new_br = expand_point(br, bl - br, tr - br)
    new_bl = expand_point(bl, tl - bl, br - bl)

    return np.array([new_tl, new_tr, new_br, new_bl], dtype="float32")


def get_perspective_transform(plate_bgr: np.ndarray) -> Optional[np.ndarray]:
    """
    Apply full perspective correction pipeline to license plate

    Args:
        plate_bgr: Cropped BGR plate image from YOLO

    Returns:
        Perspective-corrected plate image or None if failed
    """
    try:
        # Initial upscaling
        plate_bgr = cv2.resize(
            plate_bgr,
            None,
            fx=2,
            fy=2,
            interpolation=cv2.INTER_LINEAR,
        )

        # Preprocess for corner detection
        thresh = preprocess_for_corners(plate_bgr)

        # Another upscale
        plate_bgr = cv2.resize(
            plate_bgr,
            None,
            fx=2,
            fy=2,
            interpolation=cv2.INTER_LINEAR,
        )

        # Find contours
        cnts, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not cnts:
            return None

        c = max(cnts, key=cv2.contourArea)
        c = cv2.convexHull(c)  # Smooth out any concavities

        # Get 8 corners and find best 4-corner quad
        poly_8 = get_plate_corners_from_contour(c)
        if poly_8 is None:
            return None

        corners = quad_from_poly_max_area(poly_8)

        # Expand corners slightly and warp
        expanded = expand_corners(corners, expand_px=15)
        warped = warp_plate(plate_bgr, expanded)

        # Enforce aspect ratio 4.5:1 (typical license plate)
        h = warped.shape[0]
        target_aspect = 4.5
        w = int(h * target_aspect)
        warped = cv2.resize(warped, (w, h), interpolation=cv2.INTER_LINEAR)

        return warped
    except Exception as e:
        print(f"Perspective transform failed: {e}")
        return None


def enhance_for_ocr(image: np.ndarray) -> np.ndarray:
    """
    Final enhancement before OCR

    Args:
        image: BGR image

    Returns:
        Enhanced BGR image
    """
    enhanced = cv2.convertScaleAbs(image, alpha=1.2)
    return enhanced