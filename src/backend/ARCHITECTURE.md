# Parking Violation Reporting System - Backend Architecture

## Current Implementation (Simplified for MVP)

**Status:** ✅ Simplified REST API (as of 2025-11-16)

The current implementation uses a **simplified monolithic approach** optimized for rapid development and MVP deployment. This represents a pragmatic first version that can be scaled to the full microservices architecture described below when needed.

### Current Stack (3 Services)

```
┌─────────────────────────────────────────────────────────┐
│              CURRENT SIMPLIFIED STACK                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FastAPI API (Port 8000)                                │
│  ┌────────────────────────────────────────────────┐    │
│  │ • REST API endpoints                            │    │
│  │ • External OCR service integration             │    │
│  │ • PDF generation                                │    │
│  │ • S3 presigned URLs                            │    │
│  │ • Native async/await                           │    │
│  │ • JWT authentication                           │    │
│  └────────────────────────────────────────────────┘    │
│           │                                              │
│           ▼                                              │
│  PostgreSQL (violations, photos, users)                 │
│  Redis (sessions, rate limiting)                        │
│  External OCR Service (license plate detection)         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Key Simplifications from Full Architecture

1. **No Celery** - Using FastAPI's native async/await instead of task queues
2. **No Chatbot** - Direct REST API instead of conversational interface
3. **No Microservices** - Monolithic FastAPI app (easier to develop and deploy)
4. **External OCR** - Delegated to separate OCR service instead of OpenAI Vision
5. **Single Database** - PostgreSQL for all data instead of distributed storage

### Migration Path to Full Architecture

When traffic and requirements grow, the current simplified stack can be gradually migrated to the full microservices architecture described below by:

1. Extracting services (OCR, reports, notifications) into separate containers
2. Adding Celery for async processing
3. Implementing event-driven architecture with message queues
4. Adding monitoring and observability
5. Implementing circuit breakers and resilience patterns

**Current approach is sufficient for:** 50-100 concurrent users, <5s response times, MVP deployment

---

## Target Architecture (Future Scaling)

## System Overview

The backend system is designed as a microservices architecture to support millions of users with high availability, scalability, and security.

## Architecture Principles

1. **Microservices**: Modular, independently deployable services
2. **API-First**: RESTful APIs with OpenAPI specification
3. **Scalability**: Horizontal scaling with containerization
4. **Security**: End-to-end encryption, audit logging, data privacy
5. **Resilience**: Graceful degradation, retry mechanisms, circuit breakers

## System Components

### 1. Core Services

#### 1.1 API Gateway Service
- Entry point for all client requests
- Authentication & authorization (JWT)
- Rate limiting
- Request routing
- Load balancing

#### 1.2 Violation Management Service
- Create and manage violation reports
- Coordinate workflow between services
- State machine for violation lifecycle
- Evidence validation

#### 1.3 OCR Service
- License plate recognition (Ukrainian plates)
- Multi-model approach for ≥90% accuracy
- Image preprocessing
- Confidence scoring
- Async processing with Celery

#### 1.4 Geolocation Service
- GPS coordinate validation
- Reverse geocoding (coordinates → address)
- Address standardization
- Integration with OSM/Google Maps API

#### 1.5 Evidence Management Service
- Photo storage and retrieval
- Metadata extraction (EXIF)
- Image validation and security scanning
- 5-minute verification mechanism
- Evidence package assembly

#### 1.6 Report Generation Service
- Generate legal documents
- Template-based report creation
- Integration with Diia.Підпис
- PDF generation
- Document archival

#### 1.7 Notification Service
- Submit reports to police
- Status notifications to users
- Email/push notifications
- Webhook handling

#### 1.8 Analytics Service
- Violation statistics
- OCR accuracy monitoring
- Performance metrics
- Audit trails

### 2. Data Storage

#### 2.1 PostgreSQL
- User data
- Violation records
- Report metadata
- Status history
- Audit logs

#### 2.2 S3-Compatible Storage (MinIO/AWS S3)
- Original photos
- Processed images
- Generated reports (PDF)
- Evidence packages

#### 2.3 Redis
- Session management
- Rate limiting counters
- Task queues
- Temporary data cache

### 3. Supporting Infrastructure

#### 3.1 Message Queue (RabbitMQ/Redis)
- Async task processing
- Inter-service communication
- Event-driven workflows

#### 3.2 Monitoring & Logging
- Prometheus (metrics)
- Grafana (dashboards)
- ELK Stack (centralized logging)
- Sentry (error tracking)

## API Endpoints Structure

### Core API Routes

```
POST   /api/v1/violations                    # Create new violation
GET    /api/v1/violations/{id}               # Get violation details
PATCH  /api/v1/violations/{id}               # Update violation
DELETE /api/v1/violations/{id}               # Delete draft violation

POST   /api/v1/violations/{id}/photos        # Upload photo
POST   /api/v1/violations/{id}/verify        # Submit 5-min verification photo
GET    /api/v1/violations/{id}/evidence      # Get evidence package

POST   /api/v1/violations/{id}/submit        # Submit to police
GET    /api/v1/violations/{id}/status        # Get current status

POST   /api/v1/ocr/analyze                   # Analyze license plate
GET    /api/v1/geocoding/reverse             # Reverse geocode coordinates

GET    /api/v1/users/me                      # Get current user
GET    /api/v1/users/me/violations           # Get user's violations

GET    /api/v1/health                        # Health check
GET    /api/v1/metrics                       # Prometheus metrics
```

## Data Models

### Violation
```python
{
  "id": "uuid",
  "user_id": "uuid",
  "status": "draft|pending_verification|verified|submitted|under_review|resolved|rejected",
  "license_plate": "string",
  "license_plate_confidence": "float",
  "location": {
    "latitude": "float",
    "longitude": "float",
    "address": "string"
  },
  "created_at": "timestamp",
  "verified_at": "timestamp",
  "submitted_at": "timestamp",
  "photos": ["photo_id"],
  "evidence_package_id": "uuid",
  "report_id": "uuid"
}
```

### Photo
```python
{
  "id": "uuid",
  "violation_id": "uuid",
  "photo_type": "initial|verification|context",
  "storage_url": "string",
  "metadata": {
    "timestamp": "timestamp",
    "gps_coordinates": {},
    "device_info": {},
    "exif_data": {}
  },
  "uploaded_at": "timestamp"
}
```

## Security Measures

### 1. Authentication & Authorization
- OAuth 2.0 integration with Diia
- JWT tokens with short expiration
- Refresh token rotation
- Role-based access control (RBAC)

### 2. Data Protection
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- PII data masking in logs
- GDPR compliance

### 3. API Security
- Rate limiting (per user/IP)
- Request validation (Pydantic)
- SQL injection prevention (ORM)
- XSS protection
- CSRF tokens
- File upload validation

### 4. Operational Safety
- Human-in-the-loop for submission
- Audit logging (all actions)
- Soft delete (data retention)
- Automated backups
- Disaster recovery plan

## Scalability Design

### 1. Horizontal Scaling
- Stateless services
- Load balancer (Nginx/AWS ALB)
- Auto-scaling groups
- Database read replicas

### 2. Performance Optimization
- Async processing (Celery workers)
- CDN for static assets
- Database indexing
- Query optimization
- Connection pooling

### 3. Caching Strategy
- Redis for frequently accessed data
- HTTP caching headers
- API response caching

## Integration Points

### 1. Diia Integration
- OAuth authentication
- Diia.Підпис for document signing
- User profile data sync
- Push notifications

### 2. Police API
- Report submission endpoint
- Status update webhooks
- Evidence package transfer

### 3. External Services
- Google Maps / OSM (geocoding)
- SMS gateway (notifications)
- Email service (reports)

## 5-Minute Verification Mechanism

### Workflow:
1. User takes first photo → violation created (status: `draft`)
2. System extracts timestamp and location
3. User waits 5+ minutes
4. User takes second photo → system validates:
   - Same location (±10 meters tolerance)
   - Time difference ≥ 5 minutes
   - Same license plate detected
5. If valid → status: `verified`, allow submission

### Implementation:
- Store first photo metadata
- Second photo triggers validation service
- Automated checks before allowing submission
- Clear UI feedback on verification status

## Deployment Strategy

### 1. Containerization
- Docker for all services
- Docker Compose for local development
- Kubernetes for production

### 2. CI/CD Pipeline
- GitHub Actions
- Automated testing
- Security scanning
- Automated deployment

### 3. Environment Management
- Development
- Staging
- Production
- Feature flags for gradual rollout

## Monitoring & Observability

### 1. Metrics
- Request latency
- Error rates
- OCR accuracy
- Queue lengths
- Database performance

### 2. Logging
- Structured logging (JSON)
- Centralized log aggregation
- Log retention policies
- PII redaction

### 3. Alerting
- Service health alerts
- Error rate thresholds
- Performance degradation
- Security incidents

## Compliance & Ethics

### 1. Data Privacy
- Minimal data collection
- User consent management
- Data anonymization for analytics
- Right to deletion

### 2. Content Safety
- Photo validation (no inappropriate content)
- License plate verification
- Location validation (public areas)

### 3. Responsible AI
- OCR model bias monitoring
- Confidence thresholds
- Human review for edge cases
- Explainable decisions

## Redis & Celery Architecture

### Redis Architecture: 3-Database Strategy

The system uses a single Redis instance with logical database separation for different concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                    REDIS ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Redis Instance (redis:7-alpine)                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  DB 0: Application Cache & Sessions                      │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ • Session tokens (JWT blacklist)                   │  │  │
│  │  │ • Rate limiting counters                           │  │  │
│  │  │ • OCR result cache (1-hour TTL)                    │  │  │
│  │  │ • API response cache                               │  │  │
│  │  │ • User profile cache                               │  │  │
│  │  │                                                     │  │  │
│  │  │ Eviction: allkeys-lru (Least Recently Used)        │  │  │
│  │  │ Persistence: None (volatile data)                  │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  DB 1: Celery Message Broker                             │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ • Task queues (high, default, low priority)        │  │  │
│  │  │ • Pending tasks                                    │  │  │
│  │  │ • Worker heartbeats                                │  │  │
│  │  │ • Task routing information                         │  │  │
│  │  │                                                     │  │  │
│  │  │ Eviction: noeviction (critical - tasks must not    │  │  │
│  │  │           be evicted, will cause errors)           │  │  │
│  │  │ Persistence: AOF enabled (task durability)         │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  DB 2: Celery Result Backend                             │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ • Task results (success/failure)                   │  │  │
│  │  │ • Task status (pending/running/completed)          │  │  │
│  │  │ • Task metadata                                    │  │  │
│  │  │ • Dead letter queue (failed tasks)                 │  │  │
│  │  │                                                     │  │  │
│  │  │ Eviction: volatile-ttl (results expire after TTL)  │  │  │
│  │  │ Default TTL: 1 hour                                │  │  │
│  │  │ Persistence: Optional (can lose results on crash)  │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Why Separate Databases?**

1. **Isolation**: Cache eviction doesn't affect task queues
2. **Different Eviction Policies**: Cache can use LRU, broker must use noeviction
3. **Performance**: Separate key namespaces improve lookup speed
4. **Monitoring**: Easier to track metrics per database
5. **Backup Strategy**: Broker needs persistence, cache doesn't

### Celery Architecture: Async Task Processing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CELERY WORKER ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                         CLIENT LAYER                               │    │
│  │  FastAPI API │ Streamlit UI │ Mobile App                          │    │
│  └────────────────────────┬───────────────────────────────────────────┘    │
│                           │                                                 │
│                           │ 1. Submit task                                  │
│                           ▼                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │              FastAPI Endpoints (rotes/*)                           │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │ @router.post("/chat/messages")                               │  │    │
│  │  │ async def send_message(...):                                 │  │    │
│  │  │     # Quick validation                                       │  │    │
│  │  │     task = process_chat_task.delay(...)  # Enqueue          │  │    │
│  │  │     return {"task_id": task.id}          # Return < 50ms    │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────┬───────────────────────────────────────────┘    │
│                           │                                                 │
│                           │ 2. Task queued to Redis                         │
│                           ▼                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    REDIS DB1: Task Queues                          │    │
│  │                                                                     │    │
│  │  celery:high_priority    celery:default     celery:low_priority   │    │
│  │  ┌──────────────┐       ┌──────────────┐    ┌──────────────┐      │    │
│  │  │ OCR tasks    │       │ PDF gen      │    │ Police API   │      │    │
│  │  │ Photo        │       │ Geocoding    │    │ Archiving    │      │    │
│  │  │ analysis     │       │              │    │ Analytics    │      │    │
│  │  └──────────────┘       └──────────────┘    └──────────────┘      │    │
│  │                                                                     │    │
│  └─────────────────┬────────────────────────────────┬──────────────────┘    │
│                    │                                │                       │
│         ┌──────────┼──────────┐          ┌──────────┼──────────┐           │
│         ▼          ▼          ▼          ▼          ▼          ▼           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Worker 1 │ │ Worker 2 │ │ Worker 3 │ │ Worker 4 │ │ Worker 5 │         │
│  │          │ │          │ │          │ │          │ │          │         │
│  │ High Pri │ │ High Pri │ │ Default  │ │ Default  │ │ Low Pri  │         │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘         │
│       │            │            │            │            │                │
│       │ 3. Execute task asynchronously                    │                │
│       │    (OpenAI API, OCR, PDF generation, etc.)        │                │
│       │                                                    │                │
│       └────────────┼────────────┼────────────┼────────────┘                │
│                    │            │            │                             │
│                    ▼            ▼            ▼                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                REDIS DB2: Task Results                             │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │ task:abc-123 → {"status": "success", "result": {...}}        │  │    │
│  │  │ task:def-456 → {"status": "processing", "progress": 50%}     │  │    │
│  │  │ task:ghi-789 → {"status": "failed", "error": "..."}          │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                    │                                                        │
│                    │ 4. Client polls for result                             │
│                    ▼                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ GET /api/v1/tasks/{task_id}/status                                │    │
│  │   → Returns: {"status": "completed", "result": {...}}             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    CELERY BEAT: Scheduled Tasks                    │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │ • Cleanup expired photos (daily)                             │  │    │
│  │  │ • Generate analytics reports (hourly)                        │  │    │
│  │  │ • Sync with police API (every 10 minutes)                    │  │    │
│  │  │ • Archive old violations (weekly)                            │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Task Categories & Priority Levels

| Priority | Queue | Use Cases | SLA | Worker Pool |
|----------|-------|-----------|-----|-------------|
| **High (9-10)** | `celery:high_priority` | • OCR processing<br>• Photo analysis (OpenAI Vision)<br>• Real-time chat responses | < 1 minute | 2-4 workers |
| **Default (4-8)** | `celery:default` | • PDF generation<br>• Geocoding (address lookup)<br>• Email notifications | < 5 minutes | 2-4 workers |
| **Low (1-3)** | `celery:low_priority` | • Police API submission<br>• Data archiving<br>• Analytics aggregation | < 30 minutes | 1-2 workers |

### Celery Use Cases in Parking Violation System

#### 1. Photo & OCR Processing

```python
# Task: Analyze uploaded photo for license plate
@celery_app.task(name="process_photo_ocr", priority=9)
def process_photo_ocr(photo_id: str, user_id: str):
    """
    High priority: User is waiting for OCR result
    Processing time: 2-5 seconds (OpenAI Vision API)
    """
    photo = get_photo(photo_id)

    # Call OpenAI Vision API for OCR
    result = openai_vision_analyze(photo.image_data)

    # Cache result in Redis DB0 (1-hour TTL)
    cache_ocr_result(photo_id, result)

    # Update database
    update_photo_metadata(photo_id, ocr_results=result)

    return {
        "license_plate": result["plate"],
        "confidence": result["confidence"],
        "is_ukrainian": result["is_ukrainian"]
    }
```

**Why Async?** OpenAI Vision API can take 2-5 seconds. Running in Celery prevents blocking HTTP request.

#### 2. Chat Message Processing

```python
# Task: Process chat message with GPT-4o tool calling
@celery_app.task(name="process_chat_message", priority=8)
def process_chat_message(conversation_id: str, content: str, image_base64: str = None):
    """
    High priority: Interactive chat experience
    Processing time: 3-65 seconds (recursive tool calling)
    """
    interactor = ChatInteractor(get_sync_db())

    # This can make up to 20 OpenAI API calls
    result = interactor.send_message_sync(
        conversation_id=conversation_id,
        content=content,
        image_base64=image_base64
    )

    # Publish to Redis pub/sub for WebSocket broadcast
    redis_client.publish(
        f"conversation:{conversation_id}",
        json.dumps(result)
    )

    return result
```

**Why Async?** Can take up to 65 seconds with recursive tool calling. Frees up HTTP workers immediately.

#### 3. PDF Report Generation

```python
# Task: Generate violation PDF report
@celery_app.task(name="generate_violation_pdf", priority=5)
def generate_violation_pdf(conversation_id: str):
    """
    Default priority: Non-urgent document generation
    Processing time: 1-3 seconds
    """
    # Generate PDF with DejaVu fonts
    pdf_generator = PDFReportGenerator()
    pdf_buffer = pdf_generator.generate_from_conversation(conversation_id)

    # Upload to S3
    s3_url = upload_to_s3(pdf_buffer, f"reports/{conversation_id}.pdf")

    # Cache URL in Redis (1-hour TTL)
    cache_pdf_url(conversation_id, s3_url)

    return {"pdf_url": s3_url}
```

**Why Async?** Font loading and PDF generation can block. Better to queue and return URL when ready.

#### 4. Police API Submission

```python
# Task: Submit violation to police API
@celery_app.task(name="submit_to_police", priority=3, max_retries=3)
def submit_to_police(violation_id: str):
    """
    Low priority: Can handle delays, needs retry logic
    Processing time: 5-30 seconds (external API)
    """
    violation = get_violation(violation_id)

    try:
        # External API call with retry logic
        response = police_api.submit_violation(
            license_plate=violation.license_plate,
            evidence_package_url=violation.evidence_url,
            reporter_info=violation.user_info
        )

        # Update status
        update_violation_status(violation_id, "submitted",
                               case_number=response.case_number)

        # Send notification to user
        send_notification_task.delay(violation.user_id,
                                     f"Violation submitted: {response.case_number}")

        return {"success": True, "case_number": response.case_number}

    except PoliceAPIError as e:
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
```

**Why Async?** External API can be slow/unreliable. Retries prevent data loss.

### Data Flow: Complete Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│           COMPLETE REQUEST FLOW: Upload Photo → Submit Violation            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: User Uploads Photo via Streamlit                                  │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ User action: Upload photo + click "Send"                           │    │
│  └────────────────────────┬───────────────────────────────────────────┘    │
│                           │                                                 │
│                           ▼                                                 │
│  Step 2: FastAPI Receives Request (< 50ms response)                        │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ POST /api/v1/chat/conversations/{id}/messages                      │    │
│  │   1. Validate image size/format                                    │    │
│  │   2. Store image in S3                                             │    │
│  │   3. Create Photo record in PostgreSQL                             │    │
│  │   4. Enqueue task: process_photo_ocr.delay(photo_id)              │    │
│  │   5. Return: {"task_id": "abc-123", "status": "processing"}       │    │
│  └────────────────────────┬───────────────────────────────────────────┘    │
│                           │                                                 │
│                           ▼                                                 │
│  Step 3: Redis Broker (DB1) Receives Task                                  │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ Queue: celery:high_priority                                        │    │
│  │   task_id: abc-123                                                 │    │
│  │   name: process_photo_ocr                                          │    │
│  │   args: [photo_id]                                                 │    │
│  │   eta: null (execute immediately)                                  │    │
│  └────────────────────────┬───────────────────────────────────────────┘    │
│                           │                                                 │
│                           ▼                                                 │
│  Step 4: Celery Worker Picks Up Task                                       │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ Worker 1 (high_priority pool):                                     │    │
│  │   1. Fetch photo from S3                                           │    │
│  │   2. Call OpenAI Vision API (2-5 seconds)                          │    │
│  │   3. Parse license plate: "AA 9444 AP"                             │    │
│  │   4. Store result in Redis DB0 (cache, 1-hour TTL)                │    │
│  │   5. Update Photo.ocr_results in PostgreSQL                        │    │
│  │   6. Store task result in Redis DB2                               │    │
│  └────────────────────────┬───────────────────────────────────────────┘    │
│                           │                                                 │
│                           ▼                                                 │
│  Step 5: Client Polls for Result                                           │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ GET /api/v1/tasks/abc-123/status (polling every 1 second)         │    │
│  │   Response: {                                                      │    │
│  │     "status": "completed",                                         │    │
│  │     "result": {                                                    │    │
│  │       "license_plate": "AA 9444 AP",                               │    │
│  │       "confidence": 0.95,                                          │    │
│  │       "is_ukrainian": true                                         │    │
│  │     }                                                              │    │
│  │   }                                                                │    │
│  └────────────────────────┬───────────────────────────────────────────┘    │
│                           │                                                 │
│                           ▼                                                 │
│  Step 6: User Provides Personal Info                                       │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ POST /api/v1/chat/conversations/{id}/messages                      │    │
│  │   content: "Іван Петренко, +380501234567, ivan@test.com"          │    │
│  │   → Triggers: collect_user_info tool                               │    │
│  │   → Stores in conversation.conversation_metadata                   │    │
│  └────────────────────────┬───────────────────────────────────────────┘    │
│                           │                                                 │
│                           ▼                                                 │
│  Step 7: Agent Auto-Generates PDF Preview                                  │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ Tool: preview_pdf()                                                │    │
│  │   1. Check metadata: license_plate ✓, full_name ✓, phone ✓        │    │
│  │   2. Enqueue: generate_violation_pdf.delay(conversation_id)       │    │
│  │   3. Return: "PDF will be ready in a moment..."                   │    │
│  └────────────────────────┬───────────────────────────────────────────┘    │
│                           │                                                 │
│                           ▼                                                 │
│  Step 8: Celery Worker Generates PDF                                       │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ Worker 3 (default pool):                                           │    │
│  │   1. Fetch conversation data from PostgreSQL                       │    │
│  │   2. Generate PDF with DejaVu fonts (1-2 seconds)                  │    │
│  │   3. Upload to S3                                                  │    │
│  │   4. Cache URL in Redis DB0 (1-hour TTL)                          │    │
│  │   5. Return: {"pdf_url": "https://s3.../report.pdf"}              │    │
│  └────────────────────────┬───────────────────────────────────────────┘    │
│                           │                                                 │
│                           ▼                                                 │
│  Step 9: User Confirms & Submits                                           │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ POST /api/v1/chat/conversations/{id}/messages                      │    │
│  │   content: "Так, підтверджую"                                      │    │
│  │   → Triggers: submit_violation tool                                │    │
│  │   → Enqueues: submit_to_police.delay(violation_id)                │    │
│  └────────────────────────┬───────────────────────────────────────────┘    │
│                           │                                                 │
│                           ▼                                                 │
│  Step 10: Background Police API Submission                                 │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ Worker 5 (low_priority pool):                                      │    │
│  │   1. Prepare evidence package                                      │    │
│  │   2. Call Police API (with retry logic)                            │    │
│  │   3. Update violation status → "submitted"                         │    │
│  │   4. Send notification to user                                     │    │
│  │   5. Store case number from police                                 │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  TOTAL USER WAIT TIME:                                                      │
│  - Initial response: < 50ms                                                 │
│  - OCR result: ~3-5 seconds (polling)                                      │
│  - PDF generation: ~2-3 seconds (background)                                │
│  - Police submission: 5-30 seconds (background, user notified)             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Scaling Celery Workers

#### Horizontal Scaling Strategy

```yaml
# docker-compose.scale.yml
services:
  # High priority workers (scale to 4)
  celery_worker_high_1:
    <<: *celery_worker_base
    command: celery -A foundation.celery_app worker -Q high_priority -c 2

  celery_worker_high_2:
    <<: *celery_worker_base
    command: celery -A foundation.celery_app worker -Q high_priority -c 2

  # Default workers (scale to 4)
  celery_worker_default_1:
    <<: *celery_worker_base
    command: celery -A foundation.celery_app worker -Q default -c 2

  celery_worker_default_2:
    <<: *celery_worker_base
    command: celery -A foundation.celery_app worker -Q default -c 2

  # Low priority workers (scale to 2)
  celery_worker_low_1:
    <<: *celery_worker_base
    command: celery -A foundation.celery_app worker -Q low_priority -c 2
```

**Auto-scaling based on queue depth:**

```python
# Monitor queue length and auto-scale
def check_queue_depth():
    redis_client = redis.from_url(settings.CELERY_BROKER_URL)

    high_queue_len = redis_client.llen("celery:high_priority")

    if high_queue_len > 100:
        # Scale up high priority workers
        kubernetes_api.scale_deployment("celery-worker-high", replicas=8)
    elif high_queue_len < 10:
        # Scale down
        kubernetes_api.scale_deployment("celery-worker-high", replicas=2)
```

### Monitoring & Observability

#### Key Metrics to Track

```python
# Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge

# Task execution metrics
task_execution_time = Histogram(
    'celery_task_execution_seconds',
    'Time spent executing task',
    ['task_name', 'status']
)

task_counter = Counter(
    'celery_tasks_total',
    'Total number of tasks',
    ['task_name', 'status']
)

queue_length = Gauge(
    'celery_queue_length',
    'Number of tasks in queue',
    ['queue_name']
)

# OpenAI API metrics
openai_api_calls = Counter(
    'openai_api_calls_total',
    'Total OpenAI API calls',
    ['model', 'endpoint']
)

openai_api_latency = Histogram(
    'openai_api_latency_seconds',
    'OpenAI API call latency',
    ['model', 'endpoint']
)
```

#### Health Check Endpoints

```python
@router.get("/health/celery")
async def celery_health():
    """Check Celery worker health"""
    from celery import current_app

    # Check worker availability
    inspector = current_app.control.inspect()
    active_workers = inspector.active()

    if not active_workers:
        return {"status": "unhealthy", "error": "No active workers"}

    # Check queue lengths
    redis_client = redis.from_url(settings.CELERY_BROKER_URL)
    queues = {
        "high_priority": redis_client.llen("celery:high_priority"),
        "default": redis_client.llen("celery:default"),
        "low_priority": redis_client.llen("celery:low_priority")
    }

    return {
        "status": "healthy",
        "workers": len(active_workers),
        "queues": queues
    }
```

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy 2.0 (async)
- **Validation**: Pydantic V2
- **Async Tasks**: Celery 5.3+ with Redis broker
- **OCR**: OpenAI GPT-4o Vision API
- **Chat**: OpenAI GPT-4o with function calling

### Database
- **Primary**: PostgreSQL 15+
- **Cache & Broker**: Redis 7+ (3 logical databases)
- **Storage**: MinIO / AWS S3

### Infrastructure
- **Container**: Docker with Docker Compose
- **Orchestration**: Kubernetes (production)
- **Gateway**: Nginx / Traefik
- **Monitoring**: Prometheus + Grafana
- **Task Monitoring**: Flower (Celery monitoring tool)

### Development
- **Testing**: pytest, pytest-asyncio
- **Code Quality**: ruff, mypy, black
- **API Docs**: OpenAPI / Swagger
- **Version Control**: Git
