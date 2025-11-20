from flask import Flask, request, jsonify
import cv2
import numpy as np
import torch
from werkzeug.utils import secure_filename
import os
import traceback
from models.crnn_model import CRNN, NUM_CLASSES
from utils.image_processor import preprocess_image_hls
from utils.decoder import ctc_greedy_decode
from utils.yolo_detector import get_box
from ultralytics import YOLO
import ultralytics  # <-- Imported for version check

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
    8: "Model not loaded"
}

# Global variables for models
yolo_model = None
crnn_model = None
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
    """Initialize YOLO and CRNN models"""
    global yolo_model, crnn_model, device

    # Check and print versions first for better debugging context
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
        # Log the path being attempted to load
        print(f"Attempting to load YOLO model from path: {yolo_path}")
        # The error is highly likely to occur in the next line
        yolo_model = YOLO(yolo_path, task='detect')
        print("YOLO model loaded successfully!")

        # Explicitly check the loaded weights path property of the model
        if hasattr(yolo_model, 'ckpt_path'):
            print(f"YOLO Model Checkpoint Path (YOLO_PATH): {yolo_model.ckpt_path}")
        else:
            # Fallback for older/different versions of the model object
            print("YOLO Model loaded but 'ckpt_path' attribute is not available.")

        print("-" * 50)

        # Load CRNN model

        crnn_path = 'models/crnn_epoch_60.pth'
        if not os.path.exists(crnn_path):
            print(f"Warning: CRNN model not found at {crnn_path}")
            return False
        print("LINE 107: Attempting to load CRNN model...")
        crnn_model = CRNN(img_height=128, num_channels=3, hidden_size=256).to(device)
        crnn_model.load_state_dict(torch.load(crnn_path, map_location=device))
        crnn_model.eval()
        print("CRNN model loaded successfully")

        return True
    except Exception as e:
        # --- DEBUGGING CHANGE HERE ---
        print("-" * 50)
        print(f"FATAL ERROR during model initialization: {str(e)}")
        print("--- FULL TRACEBACK ---")
        traceback.print_exc()  # This will print the exact file and line number
        print("-" * 50)
        # --- END DEBUGGING CHANGE ---
        return False


def calculate_confidence(logits):
    """Calculate confidence score from model logits"""
    import torch.nn.functional as F

    # Get probabilities
    probs = F.softmax(logits, dim=2)  # (T, B, C)

    # Get max probability at each timestep
    max_probs, _ = torch.max(probs, dim=2)  # (T, B)

    # Average confidence across all timesteps
    confidence = torch.mean(max_probs).item()

    return round(confidence, 2)


def process_plate_image(image_path):
    """
    Process uploaded image and detect plate number

    Returns:
        dict: Result dictionary with status, code, plate, and confidence
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
                "confidence": 0.0
            }

        # Detect plate using YOLO
        plate_img, bbox = get_box(img, yolo_model, conf=0.25)

        if plate_img is None or bbox is None:
            return {
                "status": "ERROR",
                "code": 4,
                "message": STATUS_CODES[4],
                "plate": None,
                "confidence": 0.0
            }

        # Recognize text using CRNN
        with torch.no_grad():
            x = preprocess_image_hls(plate_img, device)
            logits = crnn_model(x)  # (T, 1, C)

            # Decode text
            text = ctc_greedy_decode(logits)[0]

            # Calculate confidence
            confidence = calculate_confidence(logits)

            # Clean up text (remove underscores which are fallback characters)
            text = text.replace("_", "")

            if len(text) == 0:
                return {
                    "status": "ERROR",
                    "code": 6,
                    "message": STATUS_CODES[6],
                    "plate": None,
                    "confidence": 0.0
                }

            return {
                "status": "OK",
                "code": 0,
                "message": STATUS_CODES[0],
                "plate": text,
                "confidence": confidence
            }

    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return {
            "status": "ERROR",
            "code": 5,
            "message": f"{STATUS_CODES[5]}: {str(e)}",
            "plate": None,
            "confidence": 0.0
        }


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    models_loaded = yolo_model is not None and crnn_model is not None
    return jsonify({
        "status": "OK" if models_loaded else "ERROR",
        "models_loaded": models_loaded,
        "device": str(device) if device else "unknown"
    })


@app.route('/recognize', methods=['POST'])
def recognize_plate():
    """
    Main endpoint for car plate recognition

    Expects:
        - multipart/form-data with 'image' field containing the image file

    Returns:
        JSON response with status, code, plate, and confidence
    """
    # Check if models are loaded
    if yolo_model is None or crnn_model is None:
        return jsonify({
            "status": "ERROR",
            "code": 8,
            "message": STATUS_CODES[8],
            "plate": None,
            "confidence": 0.0
        }), 503

    # Check if file is in request
    if 'image' not in request.files:
        return jsonify({
            "status": "ERROR",
            "code": 1,
            "message": STATUS_CODES[1],
            "plate": None,
            "confidence": 0.0
        }), 400

    file = request.files['image']

    # Check if file is selected
    if file.filename == '':
        return jsonify({
            "status": "ERROR",
            "code": 1,
            "message": STATUS_CODES[1],
            "plate": None,
            "confidence": 0.0
        }), 400

    # Check file extension
    if not allowed_file(file.filename):
        return jsonify({
            "status": "ERROR",
            "code": 2,
            "message": STATUS_CODES[2],
            "plate": None,
            "confidence": 0.0
        }), 400

    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Process image
        result = process_plate_image(filepath)

        # Clean up uploaded file
        try:
            os.remove(filepath)
        except:
            pass

        # Return appropriate status code
        http_status = 200 if result["status"] == "OK" else 400

        return jsonify(result), http_status

    except Exception as e:
        return jsonify({
            "status": "ERROR",
            "code": 5,
            "message": f"Server error: {str(e)}",
            "plate": None,
            "confidence": 0.0
        }), 500


@app.errorhandler(413)
def file_too_large(e):
    """Handle file too large error"""
    return jsonify({
        "status": "ERROR",
        "code": 3,
        "message": STATUS_CODES[3],
        "plate": None,
        "confidence": 0.0
    }), 413


if __name__ == '__main__':
    print("Initializing ALPR Flask Application...")

    # Initialize models
    if initialize_models():
        print("Models loaded successfully!")
        print("Starting Flask server...")
        app.run(host='0.0.0.0', port=5000, debug=False)
    else:
        print("ERROR: Failed to load models. Please check console for full traceback.")