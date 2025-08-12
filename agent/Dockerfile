FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY agent/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Install configforge in editable mode
RUN pip install -e ./configforge

# Expose port
EXPOSE 8000

# Start the API using the simple main.py
CMD ["python", "main.py"]
