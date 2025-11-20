from flask import Flask, request, jsonify
import cv2
import numpy as np
import torch
from werkzeug.utils import secure_filename
import os
import traceback

# CRNN imports
from models.crnn_model import CRNN
from utils.image_processor import preprocess_image_hls
from utils.decoder import ctc_greedy_decode

# OCR imports
from utils.ocr_processor import OCRProcessor
from utils.plate_transformer import get_perspective_transform, enhance_for_ocr

# YOLO imports
from utils.yolo_detector import get_box
from ultralytics import YOLO
import ultralytics

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16 MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Status codes
STATUS_CODES = {
    0: "Success",
    1: "No file uploaded",
    2: "Invalid file format",
    3: "File too large",
    4: "No plate detected in image",
    5: "Plate detection failed",
    6: "Text recognition failed",
    7: "Invalid or corrupted image",
    8: "Model not loaded",
    9: "Perspective transform failed"
}

# Global variables for models
yolo_model = None
crnn_model = None
ocr_processor = None
device = None


def print_versions():
    """Prints key software versions for debugging."""
    try:
        print(f"Ultralytics YOLO Version: {ultralytics.__version__}")
    except Exception as e:
        print(f"Could not check Ultralytics version: {e}")
    try:
        print(f"PyTorch Version: {torch.__version__}")
    except:
        pass


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def initialize_models():
    """Initialize YOLO, CRNN, and OCR models"""
    global yolo_model, crnn_model, ocr_processor, device

    print_versions()

    try:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {device}")

        # Load YOLO model
        yolo_path = 'models/car-plate-best.pt'
        if not os.path.exists(yolo_path):
            print(f"Warning: YOLO model not found at {yolo_path}")
            return False

        print("-" * 50)
        print(f"Attempting to load YOLO model from path: {yolo_path}")
        yolo_model = YOLO(yolo_path, task='detect')
        print("YOLO model loaded successfully!")

        if hasattr(yolo_model, 'ckpt_path'):
            print(f"YOLO Model Checkpoint Path: {yolo_model.ckpt_path}")
        print("-" * 50)

        # Load CRNN model
        crnn_path = 'models/crnn_epoch_60.pth'
        if not os.path.exists(crnn_path):
            print(f"Warning: CRNN model not found at {crnn_path}")
            print("CRNN endpoint will be unavailable")
        else:
            print("Attempting to load CRNN model...")
            crnn_model = CRNN(img_height=128, num_channels=3, hidden_size=256).to(device)
            crnn_model.load_state_dict(torch.load(crnn_path, map_location=device))
            crnn_model.eval()
            print("CRNN model loaded successfully")

        # Initialize EasyOCR
        print("Initializing EasyOCR processor...")
        ocr_processor = OCRProcessor(languages=['en'])
        print("EasyOCR initialized successfully")

        return True
    except Exception as e:
        print("-" * 50)
        print(f"FATAL ERROR during model initialization: {str(e)}")
        print("--- FULL TRACEBACK ---")
        traceback.print_exc()
        print("-" * 50)
        return False


def calculate_confidence(logits):
    """Calculate confidence score from model logits"""
    import torch.nn.functional as F

    probs = F.softmax(logits, dim=2)
    max_probs, _ = torch.max(probs, dim=2)
    confidence = torch.mean(max_probs).item()
    return round(confidence, 2)


def process_plate_image_crnn(image_path):
    """
    Process uploaded image using YOLO + CRNN pipeline

    Returns:
        dict: Result dictionary with status, code, plate, confidence, and bbox
    """
    try:
        # Read image
        img = cv2.imread(image_path)

        if img is None:
            return {
                "status": "ERROR",
                "code": 7,
                "message": STATUS_CODES[7],
                "plate": None,
                "confidence": 0.0,
                "bbox": None
            }

        # Detect plate using YOLO
        plate_img, bbox = get_box(img, yolo_model, conf=0.25)

        if plate_img is None or bbox is None:
            return {
                "status": "ERROR",
                "code": 4,
                "message": STATUS_CODES[4],
                "plate": None,
                "confidence": 0.0,
                "bbox": None
            }

        # Recognize text using CRNN
        with torch.no_grad():
            x = preprocess_image_hls(plate_img, device)
            logits = crnn_model(x)

            # Decode text
            text = ctc_greedy_decode(logits)[0]

            # Calculate confidence
            confidence = calculate_confidence(logits)

            # Clean up text
            text = text.replace("_", "")

            if len(text) == 0:
                return {
                    "status": "ERROR",
                    "code": 6,
                    "message": STATUS_CODES[6],
                    "plate": None,
                    "confidence": 0.0,
                    "bbox": {"x1": bbox[0], "y1": bbox[1], "x2": bbox[2], "y2": bbox[3]}
                }

            return {
                "status": "OK",
                "code": 0,
                "message": STATUS_CODES[0],
                "plate": text,
                "confidence": confidence,
                "bbox": {"x1": bbox[0], "y1": bbox[1], "x2": bbox[2], "y2": bbox[3]}
            }

    except Exception as e:
        print(f"Error processing image with CRNN: {str(e)}")
        traceback.print_exc()
        return {
            "status": "ERROR",
            "code": 5,
            "message": f"{STATUS_CODES[5]}: {str(e)}",
            "plate": None,
            "confidence": 0.0,
            "bbox": None
        }


def process_plate_image_ocr(image_path):
    """
    Process uploaded image using YOLO + EasyOCR pipeline

    Returns:
        dict: Result dictionary with status, code, plate, confidence, and bbox
    """
    try:
        # Read image
        img = cv2.imread(image_path)

        if img is None:
            return {
                "status": "ERROR",
                "code": 7,
                "message": STATUS_CODES[7],
                "plate": None,
                "confidence": 0.0,
                "bbox": None
            }

        # Detect plate using YOLO
        plate_img, bbox = get_box(img, yolo_model, conf=0.25)

        if plate_img is None or bbox is None:
            return {
                "status": "ERROR",
                "code": 4,
                "message": STATUS_CODES[4],
                "plate": None,
                "confidence": 0.0,
                "bbox": None
            }

        # Apply perspective transformation
        transformed = get_perspective_transform(plate_img)

        if transformed is None:
            # Fallback to original plate if transform fails
            print("Perspective transform failed, using original plate")
            transformed = plate_img

        # Enhance for OCR
        enhanced = enhance_for_ocr(transformed)

        # Recognize text using EasyOCR
        text, confidence = ocr_processor.read_text_with_confidence(enhanced)

        if len(text) == 0:
            return {
                "status": "ERROR",
                "code": 6,
                "message": STATUS_CODES[6],
                "plate": None,
                "confidence": 0.0,
                "bbox": {"x1": bbox[0], "y1": bbox[1], "x2": bbox[2], "y2": bbox[3]}
            }

        return {
            "status": "OK",
            "code": 0,
            "message": STATUS_CODES[0],
            "plate": text,
            "confidence": round(confidence, 2),
            "bbox": {"x1": bbox[0], "y1": bbox[1], "x2": bbox[2], "y2": bbox[3]}
        }

    except Exception as e:
        print(f"Error processing image with OCR: {str(e)}")
        traceback.print_exc()
        return {
            "status": "ERROR",
            "code": 5,
            "message": f"{STATUS_CODES[5]}: {str(e)}",
            "plate": None,
            "confidence": 0.0,
            "bbox": None
        }


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    models_loaded = yolo_model is not None and ocr_processor is not None
    crnn_available = crnn_model is not None

    return jsonify({
        "status": "OK" if models_loaded else "ERROR",
        "yolo_loaded": yolo_model is not None,
        "crnn_loaded": crnn_available,
        "ocr_loaded": ocr_processor is not None,
        "device": str(device) if device else "unknown"
    })


@app.route('/recognize_crnn', methods=['POST'])
def recognize_plate_crnn():
    """
    CRNN-based plate recognition endpoint

    Expects:
        - multipart/form-data with 'image' field containing the image file

    Returns:
        JSON response with status, code, plate, confidence, and bbox
    """
    # Check if CRNN model is loaded
    if yolo_model is None or crnn_model is None:
        return jsonify({
            "status": "ERROR",
            "code": 8,
            "message": "CRNN model not loaded",
            "plate": None,
            "confidence": 0.0,
            "bbox": None
        }), 503

    # Check if file is in request
    if 'image' not in request.files:
        return jsonify({
            "status": "ERROR",
            "code": 1,
            "message": STATUS_CODES[1],
            "plate": None,
            "confidence": 0.0,
            "bbox": None
        }), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({
            "status": "ERROR",
            "code": 1,
            "message": STATUS_CODES[1],
            "plate": None,
            "confidence": 0.0,
            "bbox": None
        }), 400

    if not allowed_file(file.filename):
        return jsonify({
            "status": "ERROR",
            "code": 2,
            "message": STATUS_CODES[2],
            "plate": None,
            "confidence": 0.0,
            "bbox": None
        }), 400

    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Process image
        result = process_plate_image_crnn(filepath)

        # Clean up uploaded file
        try:
            os.remove(filepath)
        except:
            pass

        http_status = 200 if result["status"] == "OK" else 400
        return jsonify(result), http_status

    except Exception as e:
        return jsonify({
            "status": "ERROR",
            "code": 5,
            "message": f"Server error: {str(e)}",
            "plate": None,
            "confidence": 0.0,
            "bbox": None
        }), 500


@app.route('/recognize', methods=['POST'])
@app.route('/recognize_ocr', methods=['POST'])
def recognize_plate_ocr():
    """
    EasyOCR-based plate recognition endpoint (default)

    Expects:
        - multipart/form-data with 'image' field containing the image file

    Returns:
        JSON response with status, code, plate, confidence, and bbox
    """
    # Check if models are loaded
    if yolo_model is None or ocr_processor is None:
        return jsonify({
            "status": "ERROR",
            "code": 8,
            "message": STATUS_CODES[8],
            "plate": None,
            "confidence": 0.0,
            "bbox": None
        }), 503

    # Check if file is in request
    if 'image' not in request.files:
        return jsonify({
            "status": "ERROR",
            "code": 1,
            "message": STATUS_CODES[1],
            "plate": None,
            "confidence": 0.0,
            "bbox": None
        }), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({
            "status": "ERROR",
            "code": 1,
            "message": STATUS_CODES[1],
            "plate": None,
            "confidence": 0.0,
            "bbox": None
        }), 400

    if not allowed_file(file.filename):
        return jsonify({
            "status": "ERROR",
            "code": 2,
            "message": STATUS_CODES[2],
            "plate": None,
            "confidence": 0.0,
            "bbox": None
        }), 400

    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Process image
        result = process_plate_image_ocr(filepath)

        # Clean up uploaded file
        try:
            os.remove(filepath)
        except:
            pass

        http_status = 200 if result["status"] == "OK" else 400
        return jsonify(result), http_status

    except Exception as e:
        return jsonify({
            "status": "ERROR",
            "code": 5,
            "message": f"Server error: {str(e)}",
            "plate": None,
            "confidence": 0.0,
            "bbox": None
        }), 500


@app.errorhandler(413)
def file_too_large(e):
    """Handle file too large error"""
    return jsonify({
        "status": "ERROR",
        "code": 3,
        "message": STATUS_CODES[3],
        "plate": None,
        "confidence": 0.0,
        "bbox": None
    }), 413


if __name__ == '__main__':
    print("Initializing Enhanced ALPR Flask Application...")

    # Initialize models
    if initialize_models():
        print("Models loaded successfully!")
        print("Starting Flask server...")
        app.run(host='0.0.0.0', port=5000, debug=False)
    else:
        print("ERROR: Failed to load models. Please check console for full traceback.")