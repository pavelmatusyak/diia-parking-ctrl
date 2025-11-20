import cv2
import numpy as np
from ultralytics import YOLO


def get_box(img_bgr: np.ndarray, model: YOLO, conf: float = 0.25):
    """
    Detect license plate in image using YOLO model

    Args:
        img_bgr: Image in OpenCV format (BGR, np.ndarray)
        model: YOLO model object from ultralytics
        conf: Minimum confidence threshold for detection

    Returns:
        Tuple of:
        - cropped_plate: Cropped plate image (BGR, np.ndarray) or None
        - bbox: Bounding box coordinates (x1, y1, x2, y2) or None
    """
    # Run YOLO detection
    results = model.predict(
        source=img_bgr,
        imgsz=640,
        conf=conf,
        verbose=False
    )

    if len(results) == 0:
        return None, None

    res = results[0]
    if res.boxes is None or len(res.boxes) == 0:
        return None, None

    # Get bounding boxes in (x1, y1, x2, y2) format
    boxes_xyxy = res.boxes.xyxy.cpu().numpy()  # shape: [N, 4]

    # Select the largest box by area
    max_area = 0
    best_box = None

    for box in boxes_xyxy:
        x1, y1, x2, y2 = box
        w = max(0, x2 - x1)
        h = max(0, y2 - y1)
        area = w * h

        if area > max_area:
            max_area = area
            best_box = (int(x1), int(y1), int(x2), int(y2))

    if best_box is None:
        return None, None

    x1, y1, x2, y2 = best_box

    # Clip coordinates to image boundaries
    h_img, w_img = img_bgr.shape[:2]
    x1 = max(0, min(x1, w_img - 1))
    x2 = max(0, min(x2, w_img))
    y1 = max(0, min(y1, h_img - 1))
    y2 = max(0, min(y2, h_img))

    # Crop the plate region
    cropped = img_bgr[y1:y2, x1:x2].copy()

    return cropped, best_box


def get_all_plates(img_bgr: np.ndarray, model: YOLO, conf: float = 0.25):
    """
    Detect all license plates in image

    Args:
        img_bgr: Image in OpenCV format (BGR, np.ndarray)
        model: YOLO model object
        conf: Minimum confidence threshold

    Returns:
        List of tuples, each containing:
        - cropped_plate: Cropped plate image
        - bbox: Bounding box (x1, y1, x2, y2)
        - confidence: Detection confidence score
    """
    results = model.predict(
        source=img_bgr,
        imgsz=640,
        conf=conf,
        verbose=False
    )

    if len(results) == 0:
        return []

    res = results[0]
    if res.boxes is None or len(res.boxes) == 0:
        return []

    plates = []
    boxes_xyxy = res.boxes.xyxy.cpu().numpy()
    confidences = res.boxes.conf.cpu().numpy()

    h_img, w_img = img_bgr.shape[:2]

    for box, conf_score in zip(boxes_xyxy, confidences):
        x1, y1, x2, y2 = box

        # Clip coordinates
        x1 = max(0, min(int(x1), w_img - 1))
        x2 = max(0, min(int(x2), w_img))
        y1 = max(0, min(int(y1), h_img - 1))
        y2 = max(0, min(int(y2), h_img))

        # Crop plate
        cropped = img_bgr[y1:y2, x1:x2].copy()

        plates.append((
            cropped,
            (x1, y1, x2, y2),
            float(conf_score)
        ))

    # Sort by confidence (highest first)
    plates.sort(key=lambda x: x[2], reverse=True)

    return plates


def draw_detections(img_bgr: np.ndarray, detections: list, texts: list = None):
    """
    Draw bounding boxes and text on image

    Args:
        img_bgr: Original image
        detections: List of (cropped_img, bbox, confidence) tuples
        texts: Optional list of recognized texts for each detection

    Returns:
        Image with drawn detections
    """
    img_copy = img_bgr.copy()

    for i, (_, bbox, conf) in enumerate(detections):
        x1, y1, x2, y2 = bbox

        # Draw rectangle
        cv2.rectangle(img_copy, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # Prepare label
        label = f"Plate: {conf:.2f}"
        if texts and i < len(texts):
            label = f"{texts[i]} ({conf:.2f})"

        # Draw label background
        (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
        cv2.rectangle(img_copy, (x1, y1 - 20), (x1 + w, y1), (0, 255, 0), -1)

        # Draw text
        cv2.putText(
            img_copy,
            label,
            (x1, y1 - 5),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 0, 0),
            1
        )

    return img_copy