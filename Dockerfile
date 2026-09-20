# Multi-stage build: compile TypeScript in a full node image, run the compiled
# output in a slim one. Cloud Run injects $PORT at runtime — main.ts already reads
# it via ConfigService, no extra wiring needed.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
# sharp ships prebuilt native binaries per platform; running npm ci here (inside the
# actual linux/musl runtime image) makes it fetch the right one automatically.
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 8080
CMD ["node", "dist/main"]
