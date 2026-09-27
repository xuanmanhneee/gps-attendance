# Stage 1: Build dashboard
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy root workspace manifests
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY client/admin-dashboard/package.json ./client/admin-dashboard/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY client/admin-dashboard ./client/admin-dashboard

# Build shared package then dashboard
RUN pnpm --filter @gps-attendance/shared build
RUN pnpm --filter @gps-attendance/admin-dashboard build

# Stage 2: Nginx runner
FROM nginx:alpine AS runner

COPY --from=builder /app/client/admin-dashboard/dist /usr/share/nginx/html
COPY client/admin-dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
