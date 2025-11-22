import cv2
import numpy as np
from ultralytics import YOLO

BBOX_FORMAT = "xywh"

try:
    # Use 'yolov8s-seg.pt' for the segmentation version of YOLOv8-small
    MODEL_PATH = 'yolov8s-seg.pt'
    MODEL = YOLO(MODEL_PATH)
    print(f"Loaded YOLOv8-Seg model from: {MODEL_PATH}")
except Exception as e:
    print(f"Error loading YOLO model: {e}")
    MODEL = None


def run_yolov8_seg_on_frame_1(img):
    """
    Args:
        image_path_1 (str): Path to the first image.

    Returns:
        tuple or None: (car_bbox, car_segmentation_mask),
                       or None if no car is detected.
    """
    if MODEL is None:
        print("Model failed to load. Cannot run inference.")
        return None

    H, W, _ = img.shape

    try:
        # 2. Run 'model(image)'
        # Setting verbose=False to keep the output clean
        results = MODEL(img, classes=[2, 5, 7], conf=0.25, iou=0.7, verbose=False)
        # COCO class IDs for vehicles: 'car' (2), 'bus' (5), 'truck' (7)

        # Ensure results and masks exist
        if not results or not results[0].masks:
            print("No segmentation masks found.")
            return None

        # Process the first result object (assuming batch size 1)
        result = results[0]

        # Filter detections for the largest 'car' (or vehicle)
        largest_car_area = 0
        target_box = None
        target_mask = None

        # Iterate through all detected objects
        for box, mask_data in zip(result.boxes, result.masks):
            # The ultralytics box format is: [x1, y1, x2, y2, confidence, class_id]
            # The class_id is the last element
            class_id = int(box.cls.cpu().numpy()[0])

            # Use COCO ID for 'car' (2) or any other vehicle type
            if class_id in [2, 5, 7]:
                # Calculate box area to find the largest vehicle
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                current_area = (x2 - x1) * (y2 - y1)

                if current_area > largest_car_area:
                    largest_car_area = current_area

                    # Extract the bounding box (x, y, width, height)
                    x, y, w, h = box.xywh[0].cpu().numpy().astype(int)
                    target_box = (x - w // 2, y - h // 2, w, h)

                    # Extract the precise segmentation mask
                    # mask_data.data holds the tensor of masks (1 mask per detection)
                    # We unsqueeze it to make it (1, H, W) for proper resizing/conversion
                    mask_tensor = mask_data.data

                    # Reshape to (H, W), move to CPU, convert to numpy, and resize to the original image size
                    # The resize is crucial because the mask tensor is typically smaller (e.g., 160x160)
                    mask_np = mask_tensor.cpu().numpy().squeeze()
                    target_mask_resized = cv2.resize(
                        mask_np, (W, H), interpolation=cv2.INTER_LINEAR
                    )

                    # Convert to binary mask (0 or 255) and ensure dtype is uint8
                    target_mask = (target_mask_resized > 0.5).astype(np.uint8) * 255

        if target_box and target_mask is not None:
            print(f"Largest car detected. BBox: {target_box}")
            # Target mask is already a binary numpy array (H, W)
            return target_box, target_mask
        else:
            print("No car or relevant vehicle detected.")
            return None

    except Exception as e:
        print(f"An error occurred during YOLO inference: {e}")
        return None

def detect_car_motion_by_error(img_1, img_2, car_mask_1, error_threshold=15.0,
                               loss_threshold_percent=30.0):
    """
    Detects car motion by analyzing the tracking error and feature loss rate
    on the car itself, independent of background motion.

    Args:
        img_1, img_2
        car_mask_1 (np.ndarray): Binary segmentation mask.
        error_threshold (float): Max acceptable average tracking error.
        loss_threshold_percent (float): Max acceptable percentage of lost features.

    Returns:
        tuple: (bool, float, float) -
               (True if moving, average tracking error, feature loss percentage)
    """

    if img_1 is None or img_2 is None: return False, 0.0, 0.0

    # Enforce identical dimensions (still necessary for LK)
    h1, w1, _ = img_1.shape
    img_2 = cv2.resize(img_2, (w1, h1), interpolation=cv2.INTER_LINEAR)
    car_mask_1 = cv2.resize(car_mask_1, (w1, h1), interpolation=cv2.INTER_NEAREST)

    old_gray = cv2.cvtColor(img_1, cv2.COLOR_BGR2GRAY)
    frame_gray = cv2.cvtColor(img_2, cv2.COLOR_BGR2GRAY)

    # Parameters for features and LK
    feature_params = dict(maxCorners=250, qualityLevel=0.01, minDistance=5, blockSize=5)  # More features, lower quality
    lk_params = dict(winSize=(15, 15), maxLevel=3,
                     criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 20, 0.01))  # Stricter criteria

    # --- 1. Track Car Features ---
    p0_car = cv2.goodFeaturesToTrack(old_gray, mask=car_mask_1, **feature_params)

    if p0_car is None or len(p0_car) < 10:
        return False, 0.0, 0.0

    p1_car, st_car, err_car = cv2.calcOpticalFlowPyrLK(old_gray, frame_gray, p0_car, None, **lk_params)

    total_features = len(p0_car)

    # --- 2. Calculate Metrics ---

    # Filter points that were successfully tracked (st == 1)
    tracked_err = err_car[st_car == 1]

    # Average Error
    avg_error = np.mean(tracked_err) if len(tracked_err) > 0 else 0.0

    # Feature Loss Rate
    lost_features = total_features - np.sum(st_car)
    loss_percent = (lost_features / total_features) * 100

    # --- 3. Decision ---
    is_moving_by_error = avg_error > error_threshold
    is_moving_by_loss = loss_percent > loss_threshold_percent

    is_moving = is_moving_by_error or is_moving_by_loss

    return is_moving, avg_error, loss_percent
