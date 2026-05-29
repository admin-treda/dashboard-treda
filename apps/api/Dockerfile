FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
RUN pnpm install --no-frozen-lockfile && pnpm add -Dw tsx

COPY . .
RUN cd apps/api && npx prisma generate

ENV NODE_ENV production
EXPOSE 3000
CMD ["npx", "tsx", "apps/api/src/index.ts"]
