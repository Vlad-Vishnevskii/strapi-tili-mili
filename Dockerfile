# syntax=docker/dockerfile:1

FROM node:20 AS dependencies

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci


FROM node:20 AS builder

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build


FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies /app/package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
COPY --from=builder /app/dist ./dist

EXPOSE 1337

CMD ["npm", "run", "start"]
