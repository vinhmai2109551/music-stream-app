# syntax=docker/dockerfile:1

# ---- install every dependency (needed to build) ----
FROM node:22-alpine AS deps
WORKDIR /app
# package-lock.json is written by npm 11; the npm 10 that ships with the image refuses it with
# "lock file out of sync". Node 22 is what CI runs and what some dependencies require.
RUN npm install -g npm@11 --no-fund --no-audit
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
FROM node:22-alpine AS runner
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
