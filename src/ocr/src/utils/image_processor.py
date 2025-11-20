import cv2
import numpy as np
import torch


def _cv2_to_tensor(img_bgr, target_size=(128, 128), device=None):
    """
    Convert OpenCV BGR image to normalized tensor

    Args:
        img_bgr: BGR numpy array (as from cv2.imread)
        target_size: Target size for resizing (width, height)
        device: PyTorch device (cpu or cuda)

    Returns:
        Tensor (1, 3, H, W) on specified device
    """
    # Resize
    img_resized = cv2.resize(img_bgr, target_size, interpolation=cv2.INTER_LINEAR)

    # BGR -> RGB
    img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)

    # Convert to float and normalize to [0, 1]
    img_rgb = img_rgb.astype(np.float32) / 255.0

    # Convert to tensor: (H, W, C) -> (C, H, W)
    tensor = torch.from_numpy(img_rgb).permute(2, 0, 1)  # (3, H, W)

    # Normalize: mean=0.5, std=0.5 for all channels
    tensor = (tensor - 0.5) / 0.5

    # Add batch dimension
    tensor = tensor.unsqueeze(0)  # (1, 3, H, W)

    if device is not None:
        tensor = tensor.to(device)

    return tensor


def preprocess_image(img_bgr, device=None):
    """
    Preprocess image in BGR color space

    Args:
        img_bgr: numpy array (H, W, 3) in BGR format (from cv2.imread)
        device: PyTorch device

    Returns:
        Torch tensor (1, 3, 128, 128) on device
    """
    return _cv2_to_tensor(img_bgr, target_size=(128, 128), device=device)


def preprocess_image_hls(img_bgr, device=None):
    """
    Preprocess image by converting to HLS color space first

    HLS (Hue, Lightness, Saturation) can be more robust to lighting variations
    which is useful for license plate recognition.

    Args:
        img_bgr: numpy array (H, W, 3) in BGR format
        device: PyTorch device

    Returns:
        Torch tensor (1, 3, 128, 128) on device
    """
    # Resize
    img_resized = cv2.resize(img_bgr, (128, 128), interpolation=cv2.INTER_LINEAR)

    # BGR -> HLS
    img_hls = cv2.cvtColor(img_resized, cv2.COLOR_BGR2HLS)

    # Convert to float and normalize to [0, 1]
    img_hls = img_hls.astype(np.float32) / 255.0

    # Convert to tensor: (H, W, C) -> (C, H, W)
    tensor = torch.from_numpy(img_hls).permute(2, 0, 1)  # (3, 128, 128)

    # Normalize: same normalization as RGB
    tensor = (tensor - 0.5) / 0.5

    # Add batch dimension
    tensor = tensor.unsqueeze(0)  # (1, 3, 128, 128)

    if device is not None:
        tensor = tensor.to(device)

    return tensor


def enhance_plate_image(img_bgr):
    """
    Apply image enhancement techniques to improve OCR accuracy

    Args:
        img_bgr: BGR image

    Returns:
        Enhanced BGR image
    """
    # Convert to grayscale
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    # Apply denoising
    denoised = cv2.fastNlMeansDenoising(thresh, None, 10, 7, 21)

    # Convert back to BGR
    result = cv2.cvtColor(denoised, cv2.COLOR_GRAY2BGR)

    return result