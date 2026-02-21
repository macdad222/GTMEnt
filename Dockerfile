# Enterprise Strategy Playbook Platform
# Multi-stage build: Frontend + Backend

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build Frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json frontend/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build the frontend
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Production Image
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY src/ ./src/
COPY main.py .
COPY scripts/ ./scripts/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create data directory for ChromaDB
RUN mkdir -p /app/data/chroma

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV APP_ENV=production
ENV CHROMA_PERSIST_DIR=/app/data/chroma

# Expose port
EXPOSE 3700

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3700/api/admin/health || exit 1

# Run the application with gunicorn + uvicorn workers for multi-process scaling
CMD ["gunicorn", "src.api.app:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:3700", "--timeout", "600"]

