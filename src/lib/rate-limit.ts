interface RateLimitBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 1000;

function cleanupBuckets(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  const maxAgeMs = 24 * 60 * 60 * 1000;
  for (const [k, v] of buckets.entries()) {
    const latest = v.timestamps[v.timestamps.length - 1] ?? 0;
    if (now - latest > maxAgeMs) {
      buckets.delete(k);
    }
  }
}

function pruneAndCheck(key: string, limit: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
} {
  const now = Date.now();
  cleanupBuckets(now);

  const windowStart = now - windowMs;
  const bucket = buckets.get(key) ?? { timestamps: [] };

  bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    retryAfterSec: 0,
  };
}

export function getClientIp(request: Request): string {
  // Prefer platform-set headers (Vercel / reverse proxy) over raw client-spoofable headers
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    return vercelIp.split(',')[0]?.trim() || '127.0.0.1';
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) {
    return realIp.trim();
  }
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || '127.0.0.1';
  }
  return '127.0.0.1';
}

export function checkChatRateLimit(ip: string) {
  const minuteCheck = pruneAndCheck(`chat:min:${ip}`, 20, 60 * 1000);
  if (!minuteCheck.allowed) return minuteCheck;

  return pruneAndCheck(`chat:day:${ip}`, 100, 24 * 60 * 60 * 1000);
}

export function checkQuizRateLimit(ip: string) {
  return pruneAndCheck(`quiz:hour:${ip}`, 5, 60 * 60 * 1000);
}

export function checkAdminAuthRateLimit(ip: string, recordFailure = false) {
  const key = `admin:auth:${ip}`;
  const now = Date.now();
  cleanupBuckets(now);

  const windowMs = 15 * 60 * 1000;
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > now - windowMs);

  if (bucket.timestamps.length >= 5) {
    const oldest = bucket.timestamps[0] ?? now;
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  if (recordFailure) {
    bucket.timestamps.push(now);
    buckets.set(key, bucket);
  }

  return { allowed: true, retryAfterSec: 0 };
}

export function resetAdminAuthRateLimit(ip: string) {
  buckets.delete(`admin:auth:${ip}`);
}
