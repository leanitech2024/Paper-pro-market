# @paper-market/core

Shared domain logic. No React, Next.js, Fastify, or browser APIs.

## What belongs here

- DB schema (Drizzle tables)
- Shared TypeScript types
- Pure trading math (margins, F&O utils)
- Validation (Zod schemas)
- Market utilities (time, expiry, symbol normalization)

## What does NOT belong here

- Auth (Next-Auth) -> apps/web
- Chart registry / WebSocket client -> apps/web
- Services / Zustand stores -> apps/web
- WS server / LTP writer -> apps/market-engine

## Rule

If your import needs `next`, `react`, `fastify`, or `ws` - it does not belong in core.
