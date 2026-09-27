# Stage 1: Build base
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy root workspace manifests
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/attendance/package.json ./server/attendance/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY server/attendance ./server/attendance

# Build shared package
RUN pnpm --filter @gps-attendance/shared build

# Generate Prisma client and build NestJS application
WORKDIR /app/server/attendance
RUN npx prisma generate
RUN pnpm build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/server/attendance/package.json ./server/attendance/
COPY --from=builder /app/server/attendance/node_modules ./server/attendance/node_modules
COPY --from=builder /app/server/attendance/dist ./server/attendance/dist
COPY --from=builder /app/server/attendance/prisma ./server/attendance/prisma

EXPOSE 3000

WORKDIR /app/server/attendance

CMD ["sh", "-c", "npx prisma db push && node dist/main.js"]
