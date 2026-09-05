FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY data ./data

RUN useradd --create-home --shell /usr/sbin/nologin appuser
USER appuser

ENV PYTHONUNBUFFERED=1
EXPOSE 9999
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:9999/health', timeout=2)"

# The deployment mounts model and corpus artifacts and sets production settings.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9999"]
