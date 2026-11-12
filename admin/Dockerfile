# syntax=docker/dockerfile:1

# ---- build the static site (type-checks first, then bundles) ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite bakes VITE_* values into the bundle. The browser (not Docker) calls the API, so this is the
# address of the API as the browser sees it, e.g. https://api.example.com/api.
ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_TURNSTILE_SITE_KEY=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY
RUN npm run build

# ---- serve it with nginx (single page app: unknown paths fall back to index.html) ----
FROM nginx:alpine AS runner
# A template: when the container starts, the image fills ${API_ORIGIN} in (the origin of the API, as
# the browser sees it, e.g. https://api.example.com) and writes /etc/nginx/conf.d/default.conf.
ENV API_ORIGIN=http://localhost:3000
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
