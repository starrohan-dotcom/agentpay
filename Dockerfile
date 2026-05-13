# ── Build Stage ──
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Production Stage ──
FROM node:22-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S agentpay && \
    adduser -u 1001 -S agentpay -G agentpay

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY bin/ ./bin/

# Security: run as non-root
USER agentpay

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

# Default to SSE web server; override for stdio MCP
CMD ["node", "dist/mcp/web-server.js"]