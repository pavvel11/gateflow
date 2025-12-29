# Backlog

## High Priority

### Redis Rate Limiting (Upstash)
Replace in-memory rate limiting with Redis-based distributed rate limiting for production deployments.

**Problem:** Current implementation uses `Map<string, RateLimitEntry>` which doesn't work across serverless instances.

**Solution:** Use Upstash Redis for distributed rate limiting.

**Files to modify:**
- `src/lib/rate-limit.ts` - Replace Map with Redis client
- Add `@upstash/redis` dependency
- Environment variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**References:**
- Current implementation: `src/lib/rate-limit.ts:11` (in-memory Map)
- Used in: `src/app/api/gus/fetch-company-data/route.ts`

---

## Medium Priority

---

## Low Priority

---
