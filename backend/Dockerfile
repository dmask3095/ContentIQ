# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Alpine ships OpenSSL 3.x but no `openssl` binary by default, which Prisma
# shells out to for its OpenSSL-version autodetection. Without it, detection
# silently fails and Prisma defaults to (and loads) the wrong engine binary.
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev
RUN npx prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 5000
CMD ["node", "dist/server.js"]
