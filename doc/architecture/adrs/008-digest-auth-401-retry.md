# 008 — HTTP Digest auth (gen 2+) handled by transparent 401-retry

- **Status:** Accepted
- **Date:** ~2022

## Context

Shelly gen 1 devices use HTTP Basic auth (or no auth) — straightforward.

Shelly gen 2+ devices, when auth is enabled, use **HTTP Digest** with SHA-256 (RFC 7616). Digest is challenge-response: the first request gets a 401 with a `www-authenticate` header carrying the realm and nonce; the client then re-sends with a computed `Authorization: Digest ...` header that hashes the credentials with the server-supplied nonce.

Axios doesn't natively support digest. There are libraries, but they're old and have their own quirks.

## Decision

Implement digest inline in [`shelly/lib/shelly.js`](../../../shelly/lib/shelly.js) as a **two-call retry pattern**:

1. `shellyRequestAsync` sets `validateStatus: status => status === 200 || status === 401` — so axios doesn't throw on a 401.
2. On 200: return the body.
3. On 401: parse `response.headers['www-authenticate']`, compute the digest response via `getDigestAuthorization`, set `config.headers.Authorization = "Digest ..."`, and re-send.
4. On any other status: throw with the device's response body folded in (since 11.10.1).

Username on digest auth is forced to `'admin'` (Shelly's convention; documented in their auth docs).

The nonce counter (`nc=`) is a single module-level integer, monotonically incremented across every request.

## Consequences

**Positive:**

- No third-party digest library to track / audit / patch.
- Auth retry is transparent to callers — `executeCommand2` and the polling loop don't know auth is happening.
- Adding auth support to a new endpoint costs zero code; it just works.

**Negative:**

- **Every authenticated request is two round trips.** No caching of the digest header or nonce. For a Pro 4PM hit every 5 seconds, that's 17,280 round trips per day instead of 8,640.
- The module-level `nonceCount` is shared across all nodes and never resets — RFC 7616 says it should reset to 1 per new server nonce. Shelly tolerates monotonic-only, but this is non-conformant (see [Errors and Weaknesses § nonceCount](../05-errors-and-weaknesses.md)).
- The `www-authenticate` parser splits on `", "` then `"="` — fragile against quoted values containing those characters. Works against current Shelly firmware but is brittle.

**Locks us into:**

- The 200-or-401 `validateStatus` filter. Other 4xx / 5xx responses now throw an AxiosError that we catch and re-throw with body context. That catch was added in 11.10.1 specifically to surface the body — before that, the body was discarded.
