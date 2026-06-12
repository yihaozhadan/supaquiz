# Stage 1: Build
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install bun and dependencies
RUN npm install -g bun && \
    bun install && \
    bun pm cache rm

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Stage 2: Production
FROM node:22-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/build ./build
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Install production dependencies only
RUN npm install --omit=dev && \
    npm cache clean --force

# Create data directory
RUN mkdir -p /data && \
    chown -R nodejs:nodejs /data

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Volume for data
VOLUME /data

# Set environment to production
ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "build/index.js"]
