# Frontend Dockerfile - React + Vite
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for API keys (optional)
ARG ANTHROPIC_API_KEY=""
ARG CLAUDE_API_KEY=""
ARG GEMINI_API_KEY=""
ARG VITE_API_URL="http://localhost:8001"

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for Vite build
ENV ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ENV CLAUDE_API_KEY=$CLAUDE_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Stage 2: Production with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
