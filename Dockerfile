# Production Dockerfile for Cloud Run deployment (monorepo)
FROM node:22-alpine

# Install ffmpeg for video processing
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files (monorepo structure)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/core/package*.json ./packages/core/
COPY packages/adapters/package*.json ./packages/adapters/
COPY packages/ai/package*.json ./packages/ai/

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Build the API application
RUN npm run build --workspace=@one-to-multi-agent/api

# Create data directory for file storage (fallback when GCS is not available)
RUN mkdir -p /app/apps/api/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Cloud Run expects 8080)
EXPOSE 8080

# Set working directory to API app
WORKDIR /app/apps/api

# Start production server
CMD ["npm", "start"]