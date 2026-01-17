# Portfolio OS (MVP)

TypeScript-first monorepo for a rule-based crypto portfolio app:

- **Web:** Next.js (React)
- **API:** Node/Express (TS) exposing strategy endpoints
- **Shared:** domain types + strategy engine (stage targets, drift, rebalance suggestions)
- **Infra:** Postgres + Redis via Docker Compose

## Requirements
- Node.js 20+
- Docker (optional, for Postgres/Redis)

## Quickstart

### 1) Install dependencies

From repo root:

```bash
npm install
```

### 2) Start infra (optional)

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 3) Run the API

```bash
npm run dev:api
```

API will be at `http://localhost:3001`.

### 4) Run the Web app

```bash
npm run dev:web
```

Web will be at `http://localhost:3000`.

## Notes
- The Strategy Engine in `packages/shared` is the canonical implementation of your stage/drift/refill/trim logic.
- Next step is to add: persistence (Postgres), scheduled price polling (Redis+BullMQ), and alert delivery.
