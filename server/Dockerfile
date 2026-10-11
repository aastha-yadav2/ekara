# ==========================================
# Stage 1: Build stage (Compile TypeScript)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including devDependencies for tsc build
RUN npm ci

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript in dist/
RUN npm run build

# ==========================================
# Stage 2: Production runtime stage
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment defaults (overridable at container runtime)
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Run as non-root user for security
USER node

# Expose HTTP port
EXPOSE 3000

# Start compiled server
CMD ["node", "dist/index.js"]
