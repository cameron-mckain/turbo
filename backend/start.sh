#!/bin/sh
set -e

echo "Running migrations..."
python3.14t manage.py migrate --noinput

echo "Collecting static files..."
python3.14t manage.py collectstatic --noinput

echo "Starting Granian..."
exec python3.14t -m granian --interface wsgi api.wsgi:application --host 0.0.0.0 --port 8000 --workers 4
