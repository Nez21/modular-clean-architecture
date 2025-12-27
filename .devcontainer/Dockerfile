FROM node:22-bookworm

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.6 --activate

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    build-essential \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Set user
USER node

