from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse
import time
import logging
from datetime import datetime
import redis.asyncio as redis
from typing import Callable
import json

from settings import settings

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_client: redis.Redis = None):
        super().__init__(app)
        self.redis_client = redis_client

    async def dispatch(self, request: Request, call_next: Callable):
        if not self.redis_client:
            return await call_next(request)

        client_ip = request.client.host
        path = request.url.path

        if path.startswith("/api/docs") or path.startswith("/api/redoc") or path == "/api/v1/health":
            return await call_next(request)

        minute_key = f"ratelimit:minute:{client_ip}"
        hour_key = f"ratelimit:hour:{client_ip}"

        try:
            minute_count = await self.redis_client.incr(minute_key)
            if minute_count == 1:
                await self.redis_client.expire(minute_key, 60)

            if minute_count > settings.RATE_LIMIT_PER_MINUTE:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests per minute",
                )

            hour_count = await self.redis_client.incr(hour_key)
            if hour_count == 1:
                await self.redis_client.expire(hour_key, 3600)

            if hour_count > settings.RATE_LIMIT_PER_HOUR:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests per hour",
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")

        return await call_next(request)


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()
        request_id = request.headers.get("X-Request-ID", "")

        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host,
                "user_agent": request.headers.get("user-agent"),
            },
        )

        try:
            response = await call_next(request)
            process_time = time.time() - start_time

            logger.info(
                f"Request completed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "process_time": process_time,
                },
            )

            response.headers["X-Process-Time"] = str(process_time)
            return response

        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"Request failed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "error": str(e),
                    "process_time": process_time,
                },
                exc_info=True,
            )
            raise


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"

        return response


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)

        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            logger.info(
                f"Audit log",
                extra={
                    "timestamp": datetime.utcnow().isoformat(),
                    "method": request.method,
                    "path": request.url.path,
                    "client_ip": request.client.host,
                    "user_agent": request.headers.get("user-agent"),
                    "status_code": response.status_code,
                },
            )

        return response


class RequestResponseLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        request_id = request.headers.get("X-Request-ID", "")

        if request.url.path in ["/api/docs", "/api/redoc", "/api/openapi.json"] or request.url.path.startswith("/storage"):
            return await call_next(request)

        request_body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body_bytes = await request.body()
                if body_bytes:
                    try:
                        request_body = body_bytes.decode("utf-8")
                        try:
                            request_body = json.loads(request_body)
                        except json.JSONDecodeError:
                            pass
                    except UnicodeDecodeError:
                        request_body = "<binary data>"

                async def receive():
                    return {"type": "http.request", "body": body_bytes}

                request._receive = receive
            except Exception as e:
                print(f"Error reading request body: {e}")

        print("\n" + "="*80)
        print(f"📥 INCOMING REQUEST")
        print("="*80)
        print(f"Request ID: {request_id}")
        print(f"Method: {request.method}")
        print(f"Path: {request.url.path}")
        print(f"Query Params: {dict(request.query_params)}")
        print(f"Headers: {dict(request.headers)}")
        if request_body:
            print(f"Body: {json.dumps(request_body, indent=2) if isinstance(request_body, dict) else request_body}")
        print("="*80 + "\n")

        response = await call_next(request)

        response_body = None
        response_body_bytes = b""

        if hasattr(response, "body_iterator"):
            response_body_parts = []
            async for chunk in response.body_iterator:
                response_body_parts.append(chunk)
                response_body_bytes += chunk

            async def new_body_iterator():
                for chunk in response_body_parts:
                    yield chunk

            response.body_iterator = new_body_iterator()

            try:
                response_body = response_body_bytes.decode("utf-8")
                try:
                    response_body = json.loads(response_body)
                except json.JSONDecodeError:
                    pass
            except UnicodeDecodeError:
                response_body = "<binary data>"
        elif hasattr(response, "body"):
            try:
                response_body = response.body.decode("utf-8")
                try:
                    response_body = json.loads(response_body)
                except json.JSONDecodeError:
                    pass
            except (UnicodeDecodeError, AttributeError):
                response_body = "<binary data>"
        elif isinstance(response, StreamingResponse):
            response_body = "<streaming response>"

        print("\n" + "="*80)
        print(f"📤 OUTGOING RESPONSE")
        print("="*80)
        print(f"Request ID: {request_id}")
        print(f"Method: {request.method}")
        print(f"Path: {request.url.path}")
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        if response_body:
            print(f"Body: {json.dumps(response_body, indent=2) if isinstance(response_body, dict) else response_body}")
        print("="*80 + "\n")

        return response
