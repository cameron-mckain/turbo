#!/bin/sh
set -e

# Activate virtual environment
. /.venv/bin/activate

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Granian..."
exec python -m granian --interface asgi api.asgi:application --host 0.0.0.0 --port 8000 --workers 4
