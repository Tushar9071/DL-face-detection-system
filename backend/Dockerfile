# ----------------------
# BASE IMAGE – Python 3.10
# ----------------------
FROM python:3.10-slim

# Avoid Python writing .pyc files & enable stdout logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# ----------------------
# Install system libs needed by Pillow & other ML deps
# ----------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libjpeg-dev \
    zlib1g-dev \
    libpng-dev \
    libtiff5-dev \
    libfreetype6-dev \
    libwebp-dev \
    liblcms2-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ----------------------
# Set work directory
# ----------------------
WORKDIR /app

# ----------------------
# Install dependencies
# ----------------------
COPY requirements.txt /app/

RUN pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.txt

# ----------------------
# Copy application
# ----------------------
COPY . /app

# ----------------------
# Expose port
# ----------------------
EXPOSE 8000

# ----------------------
# Start FastAPI with Gunicorn + Uvicorn workers
# ----------------------
CMD ["gunicorn", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "-w", "4", \
     "--threads", "4", \
     "--bind", "0.0.0.0:8000", \
     "main:app"]
