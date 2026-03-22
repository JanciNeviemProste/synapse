FROM node:22-slim

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN npm i -g pnpm@10

WORKDIR /app

COPY package.json pnpm-lock.yaml .pnpm-approve-builds.json ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

RUN pnpm prisma generate

COPY . .

RUN pnpm run build

EXPOSE 3000

CMD ["node", "dist/main.js"]
