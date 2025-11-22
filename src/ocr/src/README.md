# ALPR Flask API - Automatic License Plate Recognition

A Flask-based REST API for automatic license plate recognition with **two recognition engines**:
1. **YOLO + CRNN** - Deep learning approach with CTC decoder
2. **YOLO + EasyOCR** - Computer vision approach with perspective correction (Default)

## Features

- 🚗 License plate detection using YOLOv8
- 🔤 Dual text recognition methods:
  - **CRNN with CTC decoder** - Custom trained model
  - **EasyOCR** - Pre-trained OCR with perspective correction
- 🔄 Automatic perspective transformation for skewed plates
- 🎯 Confidence scoring for predictions
- 🛡️ Input validation and error handling
- 📊 Detailed status codes and error messages

## Project Structure

```
alpr_flask_app/
├── app.py                     # Enhanced Flask application with both endpoints
├── models/
│   ├── __init__.py
│   ├── crnn_model.py          # CRNN model architecture
│   ├── car-plate-best.pt      # YOLO weights 
│   └── crnn_epoch_60.pth      # CRNN weights 
├── utils/
│   ├── __init__.py
│   ├── image_processor.py     # Image preprocessing for CRNN
│   ├── decoder.py             # CTC decoder
│   ├── yolo_detector.py       # YOLO detection utilities
│   ├── ocr_processor.py       # EasyOCR wrapper 
│   └── plate_transformer.py   # Perspective correction 
├── uploads/                   # Temporary upload directory
├── requirements.txt
├── Dockerfile 
└── README.md
```

## Installation

### 1. Clone or copy the project files

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Add model weights

Place your trained model weights in the `models/` directory:
- `models/car-plate-best.pt` - YOLO plate detection model
- `models/crnn.pth` - CRNN text recognition model

## Usage

### Starting the server

```bash
python app.py
```

The server will start on `http://0.0.0.0:5000`

### API Endpoints

#### 1. Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "OK",
  "yolo_loaded": true,
  "crnn_loaded": true,
  "ocr_loaded": true,
  "device": "cuda"
}
```

#### 2. Recognize License Plate
```bash
POST /recognize_ocr
Content-Type: multipart/form-data
```

This endpoint uses **YOLO + EasyOCR** with perspective correction for best accuracy.

**Pipeline:**
1. YOLO detects the license plate
2. Perspective transformation straightens the plate
3. Image enhancement improves contrast
4. EasyOCR recognizes the text

Parameters:
- `image`: Image file (PNG, JPG, JPEG, BMP)

Example using curl:
```bash
curl -X POST -F "image=@path/to/car_image.jpg" http://localhost:5000/recognize_crnn
```

Example using Python:
```python
import requests

url = 'http://localhost:5000/recognize_crnn'
files = {'image': open('car_image.jpg', 'rb')}
response = requests.post(url, files=files)
print(response.json())
```

3. Photo Check
POST /is_running

Receives two photos (photo1 and photo2) as multipart/form-data and returns a random boolean (true or false).

Response (success):
```json
{
  "result": true
}
```

Response (missing files):
```json
{
  "error": "Missing photo1 or photo2"
}
```

### Response Format

#### Success Response (200)
```json
{
  "status": "OK",
  "code": 0,
  "message": "Success",
  "plate": "XX0000XX",
  "confidence": 0.89,
  "bbox": {
    "x1": 245,
    "y1": 180,
    "x2": 580,
    "y2": 280
  }
}
```

#### Error Response (400/500)
```json
{
  "status": "ERROR",
  "code": 4,
  "message": "No plate detected in image",
  "plate": null,
  "confidence": 0.0
}
```

### Status Codes

| Code | Message | Description |
|------|---------|-------------|
| 0 | Success | Plate successfully recognized |
| 1 | No file uploaded | Request missing image file |
| 2 | Invalid file format | File extension not allowed |
| 3 | File too large | File exceeds 16MB limit |
| 4 | No plate detected | YOLO couldn't find a plate |
| 5 | Plate detection failed | Error during detection |
| 6 | Text recognition failed | OCR couldn't read text |
| 7 | Invalid/corrupted image | Image file corrupted |
| 8 | Model not loaded | Server models not initialized |


## Model Information

### YOLO Model
- Purpose: Detect license plate bounding boxes in images
- Input: RGB images of any size
- Output: Bounding box coordinates

### CRNN Model
- Purpose: Recognize text from cropped plate images
- Architecture: CNN + Bi-LSTM + CTC
- Input: 128x128 HLS images
- Output: Text sequence with confidence scores
- Alphabet: `0123456789ABCEHIKMOPTXYZ_`

## Development

### Running in debug mode

```python
# In app.py
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

## Image Processing Pipeline

### EasyOCR Pipeline (`/recognize_ocr`):
```
Input Image
    ↓
YOLO Detection → Crop Plate
    ↓
Upscale 2x
    ↓
Preprocessing (CLAHE, Contrast, Blur)
    ↓
Corner Detection
    ↓
Perspective Transform (Straighten)
    ↓
Aspect Ratio Correction (4.5:1)
    ↓
Contrast Enhancement
    ↓
EasyOCR Recognition
    ↓
Output Text + Confidence
```

### CRNN Pipeline (`/recognize_crnn`):
```
Input Image
    ↓
YOLO Detection → Crop Plate
    ↓
Convert to HLS Color Space
    ↓
Resize to 128x128
    ↓
Normalize
    ↓
CRNN Model
    ↓
CTC Greedy Decode
    ↓
Output Text + Confidence
```

## Development


### Testing with example images

```bash
# Test single image
curl -X POST -F "image=@test_image.jpg" http://localhost:5000/recognize_crnn

# Test two images
curl -X POST http://localhost:5000/is_running \
  -F "photo1=@/path/to/file1.jpg" \
  -F "photo2=@/path/to/file2.jpg"

# Test with Python script
python test_api.py
```

## Docker Deployment (Optional)


Build and run:
```bash
docker build -t alpr-api .
docker run -p 5000:5000 alpr-api
```

For debugging (to enter container on Windows purpose (for Linux debugging change ` to slash)):
```bash
docker run -d `                                                                           
   --name my-app-debug `
   -p 5000:5000 `
   alpr-api `
   tail -f /dev/null
```

```bash
docker exec -it <id> /bin/bash
```
