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

# Install a simple static server to serve the build output
RUN npm install -g serve

# Make port 3000 available
EXPOSE 3000

# Command to serve the static build output
# The build output is typically in the 'dist' directory for Vite/React apps created with the template
CMD ["serve", "-s", "dist", "-l", "3000"]

