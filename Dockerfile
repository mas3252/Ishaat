FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN corepack prepare pnpm@9.15.9 --activate && pnpm install --frozen-lockfile=false
ENV NODE_ENV=production
ENV BASE_PATH=/
RUN pnpm run build:deploy

FROM node:22-slim AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
CMD ["sh", "-c", "PORT=${PORT:-3000} pnpm start"]
