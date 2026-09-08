# ORCA API Contracts

## General Conventions
- Base API prefix is configurable with `ORCA_API_PREFIX` (empty by default).
- Bodies and successful responses are JSON. Validation failures use FastAPI's
  standard `422` format; missing resources use `{ "detail": "..." }` with `404`.
- Shared location value: `{ "latitude": number, "longitude": number, "label": string? }`.

## Authentication

### POST /auth/register
Request: `{ "email", "password", "display_name" }`. Returns `{ "user", "access_token", "token_type" }`.

### POST /auth/login
Request: `{ "email", "password" }`. Returns the same authentication response.

### GET /auth/me
Returns `{ "id", "email", "display_name" }`. The foundation uses `X-ORCA-User`
as a development-only identity header until authentication is integrated.

---

## ORCA

### POST /orca/query
Request: `{ "query", "location"?, "time_range"?, "context"?, "conversation_id"?, "language"? }`. Response includes
`query_id`, `intent`, structured `assessment`, `recommendations`, and `evidence`. Optional
`conversation_id`, `language`, and `context` return client-session context for follow-up queries.
The backward-compatible `pending_domains` and `unavailable_domains` arrays expose
capability coverage; callers should treat incomplete safety evidence as limited.

### GET /orca/history
Returns `{ "items": [{ "query_id", "query", "intent", "created_at" }] }`.

---

## Map Explorer

### GET /map/layers
Returns `{ "layers": [{ "id", "name", "layer_type", "description", "available" }] }`.

### POST /map/analyze
Request: `{ "location", "analysis_type", "parameters"? }`.

### POST /map/route
Request: `{ "origin", "destination", "departure_time"?, "constraints"? }`.

---

## Alerts

### GET /alerts

### GET /alerts/{id}
The alerts foundation currently exposes read-only alert retrieval.

### POST /alerts

---

## Reports

### GET /reports

### GET /reports/{id}

### POST /reports

### DELETE /reports/{id}
Returns `204` when deleted.
