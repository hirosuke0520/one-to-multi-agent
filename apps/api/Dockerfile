# Production Dockerfile for Cloud Run deployment
FROM node:22-alpine

# Install ffmpeg for video processing
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy API source code
COPY . .

# Build the application
RUN npm run build

# Create data directory for file storage (fallback when GCS is not available)
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Cloud Run expects 8080)
EXPOSE 8080

# Start production server
CMD ["npm", "start"]