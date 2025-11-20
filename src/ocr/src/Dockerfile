FROM ultralytics/ultralytics:latest-python

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV headless
#RUN apt-get update && apt-get install -y --no-install-recommends \
#    git \4
#    libglib2.0-0 \
#    libsm6 \
#    libxext6 \
#    libxrender1 \
#    libgomp1 \
#    libgthread-2.0-0 \
#    libopenblas-dev \
#    libgl1-mesa-dev \
#    && rm -rf /var/lib/apt/lists/*


# Copy requirements first for better Docker layer caching
COPY requirements.txt requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Set environment variables
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["python", "app.py"]