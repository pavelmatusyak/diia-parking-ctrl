# ALPR Flask API - Automatic License Plate Recognition

A Flask-based REST API for automatic license plate recognition using YOLO for plate detection and CRNN for text recognition.

## Features

- 🚗 License plate detection using YOLOv8
- 🔤 Text recognition using CRNN with CTC decoder
- 🎯 Confidence scoring for predictions
- 🛡️ Input validation and error handling
- 📊 Detailed status codes and error messages
- 🚀 RESTful API design

## Project Structure

```
alpr_flask_app/
├── app.py                      # Main Flask application
├── models/
│   ├── __init__.py
│   ├── crnn_model.py          # CRNN model architecture
│   ├── car-plate-best.pt      # YOLO weights (not included)
│   └── crnn.pth               # CRNN weights (not included)
├── utils/
│   ├── __init__.py
│   ├── image_processor.py     # Image preprocessing utilities
│   ├── decoder.py             # CTC decoder
│   └── yolo_detector.py       # YOLO detection utilities
├── uploads/                    # Temporary upload directory
├── requirements.txt
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
  "models_loaded": true,
  "device": "cuda"
}
```

#### 2. Recognize License Plate
```bash
POST /recognize
Content-Type: multipart/form-data
```

Parameters:
- `image`: Image file (PNG, JPG, JPEG, BMP)

Example using curl:
```bash
curl -X POST -F "image=@path/to/car_image.jpg" http://localhost:5000/recognize
```

Example using Python:
```python
import requests

url = 'http://localhost:5000/recognize'
files = {'image': open('car_image.jpg', 'rb')}
response = requests.post(url, files=files)
print(response.json())
```

### Response Format

#### Success Response (200)
```json
{
  "status": "OK",
  "code": 0,
  "message": "Success",
  "plate": "XX0000XX",
  "confidence": 0.89
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

### Testing with example images

```bash
# Test single image
curl -X POST -F "image=@test_image.jpg" http://localhost:5000/recognize

# Test with Python script
python test_api.py
```

## Docker Deployment (Optional)


Build and run:
```bash
docker build -t alpr-api .
docker run -p 5000:5000 -v $(pwd)/models:/app/models alpr-api
```

For debugging (to enter container on Windows purpose (for Linux debugging change ` to slash)):
```bash
docker run -d `                                                                           
   --name my-app-debug-2 `
   -p 5000:5000 `
   alpr-api `
   tail -f /dev/null
```

```bash
docker exec -it <id> /bin/bash
```
