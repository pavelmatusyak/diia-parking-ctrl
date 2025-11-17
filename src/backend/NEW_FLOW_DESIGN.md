# New Simplified Flow Design

## Overview

Removing chatbot approach in favor of simple REST API flow for parking violation reporting.

## Key Changes

### Remove
- ❌ OpenAI chatbot integration (interactors/chat.py, rotes/chat.py)
- ❌ Conversation and ConversationMessage models
- ❌ Recursive tool calling logic
- ❌ OpenAI dependency (if not used for OCR)

### Keep
- ✅ User, Violation, Photo, ViolationStatusHistory models
- ✅ S3/MinIO storage (storage.py)
- ✅ PDF generation (pdf_generator.py) - update for new flow
- ✅ PostgreSQL + Redis infrastructure
- ✅ JWT auth structure

### Add
- ➕ OCR service client (mock for now)
- ➕ New REST API endpoints for violation flow
- ➕ 5-minute timer tracking
- ➕ Secure S3 presigned URLs for PDF downloads

## New Flow

### 1. Create Violation (POST /api/v1/violations)

**Request:**
```json
{
  "latitude": 50.4501,
  "longitude": 30.5234,
  "address": "вул. Хрещатик, 1"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "draft",
  "latitude": 50.4501,
  "longitude": 30.5234,
  "address": "вул. Хрещатик, 1",
  "created_at": "2025-11-16T10:00:00Z"
}
```

### 2. Upload Photo + OCR Detection (POST /api/v1/violations/{id}/photos)

**Request:** `multipart/form-data`
- `file`: image file
- `photo_type`: "initial" | "verification" | "context"

**Backend Flow:**
1. Save photo to S3/MinIO
2. Call OCR service `/detect` with image
3. Store OCR results in Photo.ocr_results
4. Update Violation with license_plate if detected

**OCR Service Response:**
```json
{
  "status": "OK",
  "code": 0,
  "plate": "AA1234BB",
  "confidence": 0.89,
  "color": "red",
  "colorId": 4,
  "make": "bmw",
  "model": "x5",
  "violated": [2, 3]
}
```

**API Response:**
```json
{
  "id": "photo-uuid",
  "violation_id": "violation-uuid",
  "photo_type": "initial",
  "storage_url": "s3://...",
  "ocr_results": {
    "plate": "AA1234BB",
    "confidence": 0.89,
    "color": "red",
    "make": "bmw"
  },
  "uploaded_at": "2025-11-16T10:01:00Z"
}
```

**Error Response (OCR failed):**
```json
{
  "error": "OCR detection failed",
  "details": "Не вдалося розпізнати номерний знак. Спробуйте зробити чіткіше фото",
  "code": 1
}
```

### 3. Upload Road Sign Photo (POST /api/v1/violations/{id}/sign-photo)

**Request:** `multipart/form-data`
- `file`: image file

**Response:**
```json
{
  "id": "photo-uuid",
  "violation_id": "violation-uuid",
  "photo_type": "context",
  "storage_url": "s3://...",
  "uploaded_at": "2025-11-16T10:02:00Z"
}
```

**Note:** No OCR processing for sign photos.

### 4. Check 5-Minute Timer (GET /api/v1/violations/{id}/timer-status)

**Response (timer not started):**
```json
{
  "timer_required": false,
  "can_submit": true
}
```

**Response (timer in progress):**
```json
{
  "timer_required": true,
  "timer_started_at": "2025-11-16T10:02:00Z",
  "timer_expires_at": "2025-11-16T10:07:00Z",
  "seconds_remaining": 180,
  "can_submit": false
}
```

**Response (timer complete):**
```json
{
  "timer_required": true,
  "timer_started_at": "2025-11-16T10:02:00Z",
  "timer_expires_at": "2025-11-16T10:07:00Z",
  "seconds_remaining": 0,
  "can_submit": true
}
```

### 5. Start 5-Minute Timer (POST /api/v1/violations/{id}/start-timer)

**Response:**
```json
{
  "timer_started_at": "2025-11-16T10:02:00Z",
  "timer_expires_at": "2025-11-16T10:07:00Z"
}
```

### 6. Submit Violation (PUT /api/v1/violations/{id}/submit)

**Request:**
```json
{
  "violation_reason": "Паркування під знаком заборони зупинки",
  "violation_code": "12.16",
  "notes": "Додаткові коментарі"
}
```

**Validation:**
- Must have at least 1 photo with successful OCR
- If no road sign photo: must have completed 5-minute timer
- Must have violation_reason

**Response:**
```json
{
  "id": "violation-uuid",
  "status": "submitted",
  "submitted_at": "2025-11-16T10:08:00Z",
  "pdf_url": "/api/v1/violations/{id}/pdf"
}
```

### 7. Get PDF Report (GET /api/v1/violations/{id}/pdf)

**Response:**
- Generates PDF with:
  - User name, email, phone
  - All violation photos
  - License plate info
  - Geolocation + address
  - Violation reason
  - Timestamp
  - Notes
- Returns S3 presigned URL (valid for 1 hour)

**Response:**
```json
{
  "pdf_url": "https://s3.amazonaws.com/bucket/violations/uuid/report.pdf?signature=...",
  "expires_at": "2025-11-16T11:08:00Z"
}
```

## Database Schema Changes

### Models to Keep
```python
class User(Base):
    # Keep as is

class Violation(Base):
    # Add fields:
    violation_reason: Mapped[Optional[str]]
    violation_code: Mapped[Optional[str]]
    timer_started_at: Mapped[Optional[datetime]]
    has_road_sign_photo: Mapped[bool] = False

class Photo(Base):
    # Keep as is - ocr_results JSON field already exists

class ViolationStatusHistory(Base):
    # Keep as is
```

### Models to Remove
```python
class Conversation(Base)  # DELETE
class ConversationMessage(Base)  # DELETE
```

## OCR Service Integration

### Mock Implementation (Development)

```python
class OCRService:
    def __init__(self):
        self.base_url = settings.OCR_SERVICE_URL or "http://localhost:8001"

    async def detect_license_plate(self, image_url: str) -> dict:
        """Call external OCR service /detect endpoint"""
        if settings.ENVIRONMENT == "development":
            return self._mock_detection()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/detect",
                files={"file": image_url}
            )
            return response.json()

    def _mock_detection(self) -> dict:
        """Mock OCR response for development"""
        return {
            "status": "OK",
            "code": 0,
            "plate": "AA1234BB",
            "confidence": 0.92,
            "color": "white",
            "colorId": 1,
            "make": "toyota",
            "model": "camry"
        }
```

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/violations | Create new violation with geolocation |
| GET | /api/v1/violations/{id} | Get violation details |
| POST | /api/v1/violations/{id}/photos | Upload photo + OCR detection |
| POST | /api/v1/violations/{id}/sign-photo | Upload road sign photo |
| GET | /api/v1/violations/{id}/timer-status | Check 5-minute timer status |
| POST | /api/v1/violations/{id}/start-timer | Start 5-minute timer |
| PUT | /api/v1/violations/{id}/submit | Submit violation with reason |
| GET | /api/v1/violations/{id}/pdf | Get secure PDF download URL |

## Removed Endpoints

- DELETE /api/v1/chat/* (all chat endpoints)

## Updated PDF Generation

```python
class PDFReportGenerator:
    def generate_violation_report(
        self,
        violation: Violation,
        user: User,
        photos: list[Photo]
    ) -> bytes:
        """
        Generate PDF with:
        - User: name, email, phone
        - Violation: license_plate, reason, location, timestamp
        - All photos embedded
        - Ukrainian fonts support
        """
```

## Security - S3 Presigned URLs

```python
class StorageService:
    def generate_presigned_url(
        self,
        key: str,
        expires_in: int = 3600
    ) -> str:
        """Generate presigned URL for secure PDF access"""
        return self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': key},
            ExpiresIn=expires_in
        )
```

## Simplifications

1. **No OpenAI chat** - Remove dependency if not needed for OCR
2. **Stateless REST** - No conversation state management
3. **Simple flow** - Create → Upload → Submit
4. **Direct responses** - No recursive tool calling
5. **Timer in DB** - Simple datetime comparison

## Next Steps

1. ✅ Document new flow (this file)
2. Remove chat logic
3. Implement OCR service client
4. Update violations API
5. Add timer logic
6. Update PDF generation
7. Add S3 presigned URLs
8. Test end-to-end
