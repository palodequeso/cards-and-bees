FROM node:18 AS builder

WORKDIR /usr/src/app

# Install all dependencies (including dev dependencies for building)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build TypeScript and frontend
RUN npm run clean || true
RUN npx tsc
RUN npm run build:frontend

# Copy necessary files to lib directory
RUN npx copyfiles package.json ./lib || cp package.json ./lib/
RUN if [ -f arena.env ]; then npx copyfiles arena.env ./lib || cp arena.env ./lib/; fi

# Production stage
FROM node:18

WORKDIR /usr/src/app

# Copy built application from builder
COPY --from=builder /usr/src/app/lib ./lib
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/static ./static
COPY --from=builder /usr/src/app/index.html ./index.html
COPY --from=builder /usr/src/app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

EXPOSE 2567

# Run compiled JavaScript
CMD ["node", "lib/index.js"]
