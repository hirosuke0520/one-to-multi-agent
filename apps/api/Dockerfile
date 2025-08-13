# Development Dockerfile for Hono API
FROM node:18-alpine

# Install ffmpeg for video processing
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Create data and temp directories
RUN mkdir -p /app/data /app/temp

# Expose port
EXPOSE 8787

# Start development server
CMD ["npm", "run", "dev"]