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

# Create staticfiles directory
RUN mkdir -p /app/staticfiles

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Running migrations..."\n\
python3.14t manage.py migrate --noinput\n\
echo "Collecting static files..."\n\
python3.14t manage.py collectstatic --noinput\n\
echo "Starting Granian..."\n\
python3.14t -m granian --interface wsgi api.wsgi:application --host 0.0.0.0 --port 8000 --workers 4\n\
' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]
