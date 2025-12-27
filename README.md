# Modular Clean Architecture Monolith

Modular monolith built with NestJS and TypeScript. Uses Clean Architecture with separate layers.

## Architecture

Layered structure:
- Domain: business logic and entities
- Application: use cases and services
- Data: repositories and data access
- Infrastructure: databases, caches, external services
- API: GraphQL resolvers

## Project Structure

- `apps/entry-point` - main application
- `libs/building-blocks` - shared infrastructure
- `libs/common` - common utilities and types
- `libs/contracts` - shared contracts
- `modules/core` - business modules 

## Getting Started

- Node.js v18+
- pnpm 8.15.6+
- PostgreSQL
- Valkey/Redis

```bash
pnpm install
pnpm prepare
```

Run the dev server:
```bash
pnpm dev
```

Build:
```bash
pnpm build
```

Lint/format:
```bash
pnpm check
```

## License

MIT

