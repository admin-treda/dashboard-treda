FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm --filter @hermes-allen/types build && \
    pnpm --filter @hermes-allen/ui build && \
    pnpm --filter @hermes-allen/dashboard build

FROM nginx:alpine
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/dashboard/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
