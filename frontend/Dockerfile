# Frontend Dockerfile

# Use an official Node runtime as a parent image
# Use a version compatible with the React template (e.g., Node 20)
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and pnpm-lock.yaml first to leverage Docker cache
COPY package.json pnpm-lock.yaml* ./

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy the rest of the frontend application code
COPY . .

# Build the React app for production
RUN pnpm run build

# Create a script to update config.js at runtime with environment variables
RUN echo '#!/bin/sh\n\
echo "// Runtime configuration for the Property Analyzer frontend\n\
window.RUNTIME_CONFIG = {\n\
  API_URL: \"$VITE_API_URL\"\n\
};" > /app/dist/config.js\n\
exec "$@"' > /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Install a simple static server to serve the build output
RUN npm install -g serve

# Make port 3000 available
EXPOSE 3000

# Use the entrypoint script to update config.js before starting the server
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Command to serve the static build output
CMD ["serve", "-s", "dist", "-l", "3000"]
