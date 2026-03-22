#!/bin/bash
set -e

echo "=== Installing system dependencies ==="
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  chromium \
  fonts-liberation \
  libnss3 \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  libgbm1

echo "=== Installing pnpm ==="
npm i -g pnpm@10

echo "=== Installing dependencies ==="
pnpm install

echo "=== Generating Prisma client ==="
pnpm prisma generate

echo "=== Installing Claude Code CLI ==="
npm i -g @anthropic-ai/claude-code || echo "Claude Code CLI install skipped"

echo "=== Setup complete! ==="
echo "Run 'pnpm run start:dev' to start the app"
echo "Then open the forwarded port 3000 in your browser"
