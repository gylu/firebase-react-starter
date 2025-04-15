# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.11-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

# Set the working directory in the container
WORKDIR /app

# Copy application dependency manifests to the container image.
# Copying this separately prevents re-running pip install on every code change.
COPY requirements.txt ./

# Install production dependencies.
RUN pip install --no-cache-dir -r requirements.txt

# Copy local code to the container image.
COPY . ./

# Run the web server on container startup.
# Use Gunicorn for production environments. Cloud Run expects the app
# to listen on the port specified by the PORT environment variable.
# The default Cloud Run port is 8080.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app
