# syntax=docker/dockerfile:1

# ---- install every dependency (needed to build) ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- generate the Prisma client and compile TypeScript ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- production dependencies only ----
FROM deps AS prod-deps
RUN npm prune --omit=dev && npm cache clean --force

# ---- final image ----
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json prisma7.config.ts ./
COPY prisma ./prisma
USER node
EXPOSE 3000
# Apply pending migrations, then start the API (it seeds itself when SEED_ON_START=true).
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
