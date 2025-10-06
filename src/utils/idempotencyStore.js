import crypto from 'crypto';

// In-memory store with TTL for idempotency keys
// TODO: Replace with Redis for production deployments
class IdempotencyStore {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
  }

  set(key, value, ttlMs = 300000) {
    // 5 minutes default
    // Clear existing timer if key exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.store.set(key, {
      timestamp: Date.now(),
      value,
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlMs);

    this.timers.set(key, timer);
  }

  get(key) {
    const entry = this.store.get(key);
    return entry ? entry.value : null;
  }

  has(key) {
    return this.store.has(key);
  }

  delete(key) {
    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    return this.store.delete(key);
  }

  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.store.clear();
  }

  size() {
    return this.store.size;
  }

  // Generate idempotency key from provider and content
  generateKey(provider, content) {
    const hash = crypto.createHash('sha256');
    hash.update(`${provider}:${JSON.stringify(content)}`);
    return hash.digest('hex');
  }
}

// Singleton instance
const idempotencyStore = new IdempotencyStore();

export { idempotencyStore };
