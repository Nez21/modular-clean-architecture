#!/bin/bash
set -e

echo "🚀 Setting up development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup git hooks
echo "🔧 Setting up git hooks..."
pnpm prepare

# Verify installations
echo "✅ Verifying installations..."
node --version
pnpm --version
nx --version

echo "✨ Development environment setup complete!"
echo ""
echo "Available services:"
echo "  - PostgreSQL: postgresql://postgres:postgres@postgres:5432/identity"
echo "  - Valkey: redis://valkey:6379"
echo "  - Restate: http://restate:8080"
echo ""
echo "Environment variables are automatically set. You can start developing!"

