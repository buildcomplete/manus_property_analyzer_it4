# Backend Dockerfile

# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY ./requirements.txt /app/

# Install any needed packages specified in requirements.txt
# Create virtual environment
RUN python -m venv venv
# Install dependencies into the virtual environment
# Using --no-cache-dir to reduce image size
RUN venv/bin/pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application code into the container at /app
COPY ./src /app/src

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Define environment variable (optional, can be set in docker-compose)
# ENV NAME World

# Run main.py using the Python interpreter from the virtual environment
# Ensure the app runs on 0.0.0.0 to be accessible from outside the container
CMD ["venv/bin/python", "src/main.py"]

