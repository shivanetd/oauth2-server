# Stage 1: Build the application
FROM node:20-slim AS builder

# Create app directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Start the application
CMD ["npm", "run", "start"]