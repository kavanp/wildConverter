# WildConverter Docker Image
# Multi-stage build for optimized image size

FROM python:3.11-slim-bookworm

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # FFmpeg for audio/video processing
    ffmpeg \
    # LibreOffice for DOCX to PDF conversion
    libreoffice \
    libreoffice-writer \
    # Required for WeasyPrint (HTML to PDF)
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    # Required for Pillow
    libjpeg-dev \
    zlib1g-dev \
    libpng-dev \
    # Required for lxml
    libxml2-dev \
    libxslt1-dev \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir PyMuPDF weasyprint gunicorn

# Copy application files
COPY app.py .
COPY app.js .
COPY index.html .
COPY styles.css .
COPY favicon.svg .
COPY robots.txt .
COPY sitemap.xml .
COPY google4a103e369768567c.html .
COPY privacy.html .
COPY about.html .
COPY contact.html .
COPY faq.html .
COPY ads.txt .

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3000/api/health')" || exit 1

# Run the application with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "--workers", "4", "--timeout", "300", "app:app"]
