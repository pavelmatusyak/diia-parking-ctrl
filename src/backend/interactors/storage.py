from sqlalchemy.ext.asyncio import AsyncSession
import boto3
from botocore.exceptions import ClientError
from typing import Optional
import logging
import uuid
from datetime import datetime
from pathlib import Path
import os

from settings import settings

logger = logging.getLogger(__name__)


class StorageInteractor:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.s3_client = None
        self._initialize_s3()

    def _initialize_s3(self):
        # Check if S3 credentials are configured
        if not settings.S3_ACCESS_KEY_ID or not settings.S3_SECRET_ACCESS_KEY:
            logger.info("S3 credentials not configured, will use local mock storage")
            self.s3_client = None
            return

        try:
            if settings.S3_ENDPOINT_URL:
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=settings.S3_ENDPOINT_URL,
                    aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                    region_name=settings.S3_REGION,
                )
            else:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                    region_name=settings.S3_REGION,
                )
            logger.info("S3 client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            self.s3_client = None

    async def upload_file(
        self,
        file_data: bytes,
        file_name: str,
        content_type: str,
        folder: str = "",
    ) -> dict:
        if not self.s3_client:
            logger.warning("S3 client not initialized, storing locally (mock)")
            return self._mock_storage(file_data, file_name, folder)

        try:
            timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            key = f"{folder}/{timestamp}-{unique_id}-{file_name}" if folder else f"{timestamp}-{unique_id}-{file_name}"

            self.s3_client.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=key,
                Body=file_data,
                ContentType=content_type,
            )

            url = f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{key}" if settings.S3_ENDPOINT_URL else \
                  f"https://{settings.S3_BUCKET_NAME}.s3.{settings.S3_REGION}.amazonaws.com/{key}"

            logger.info(f"File uploaded successfully to S3: {key}")
            return {
                "key": key,
                "url": url,
                "bucket": settings.S3_BUCKET_NAME,
            }

        except ClientError as e:
            logger.error(f"S3 upload error: {e}", exc_info=True)
            raise

    def _mock_storage(self, file_data: bytes, file_name: str, folder: str) -> dict:
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        key = f"{folder}/{timestamp}-{unique_id}-{file_name}" if folder else f"{timestamp}-{unique_id}-{file_name}"

        local_storage_path = Path("local_storage")
        local_storage_path.mkdir(exist_ok=True)

        file_path = local_storage_path / key
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(file_path, 'wb') as f:
            f.write(file_data)

        logger.info(f"Saved file locally: {file_path}")

        return {
            "key": key,
            "url": f"{settings.API_BASE_URL}/storage/{key}",
            "bucket": "local-storage",
        }

    async def get_file(self, key: str) -> Optional[bytes]:
        if not self.s3_client:
            local_storage_path = Path("local_storage") / key
            if local_storage_path.exists():
                with open(local_storage_path, 'rb') as f:
                    return f.read()
            return None

        try:
            response = self.s3_client.get_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=key,
            )
            return response['Body'].read()

        except ClientError as e:
            logger.error(f"S3 download error: {e}", exc_info=True)
            return None

    async def delete_file(self, key: str) -> bool:
        if not self.s3_client:
            return False

        try:
            self.s3_client.delete_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=key,
            )
            logger.info(f"File deleted successfully from S3: {key}")
            return True

        except ClientError as e:
            logger.error(f"S3 delete error: {e}", exc_info=True)
            return False

    async def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        if not self.s3_client:
            logger.warning("S3 client not initialized, returning local storage URL")
            return f"{settings.API_BASE_URL}/storage/{key}"

        try:
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': settings.S3_BUCKET_NAME,
                    'Key': key,
                },
                ExpiresIn=expires_in,
            )
            logger.info(f"Generated presigned URL for {key} (expires in {expires_in}s)")
            return presigned_url

        except ClientError as e:
            logger.error(f"S3 presigned URL generation error: {e}", exc_info=True)
            raise
