FROM ghcr.io/cameron-mckain/granian255-python314t:latest

ENV PYTHONUNBUFFERED=1
ENV UV_PROJECT_ENVIRONMENT=/.venv

WORKDIR /app

# Copy project files
COPY pyproject.toml ./
COPY uv.lock ./

# Install dependencies with uv
RUN python3.14t -m pip install uv && \
    uv venv && \
    uv sync

# Copy application code
COPY api ./api
COPY manage.py ./
COPY start.sh ./

# Create staticfiles directory
RUN mkdir -p /app/staticfiles && chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]
